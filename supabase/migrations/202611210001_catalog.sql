begin;

create schema bishop_private;
revoke all on schema bishop_private from public, anon, authenticated;
create table bishop_private.staff_members (
  user_id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('owner', 'editor')),
  is_active boolean not null default true
);
create table bishop_private.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  slug text unique not null check (length(slug) <= 100 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '' check (length(description) <= 1000),
  display_order int not null default 0,
  is_active boolean not null default true
);
insert into bishop_private.categories(name,slug,display_order) values
  ('SSDs','ssds',10), ('RAM','ram',20), ('Chargers','chargers',30), ('Accessories','accessories',40);

create table bishop_private.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references bishop_private.categories,
  name text not null check (length(trim(name)) between 1 and 160),
  slug text unique not null check (length(slug) <= 100 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  brand text not null default '' check (length(brand) <= 120),
  description text not null default '' check (length(description) <= 6000),
  specifications text not null default '' check (length(specifications) <= 6000),
  warranty text not null default '' check (length(warranty) <= 500),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  featured boolean not null default false,
  revision int not null default 1,
  updated_at timestamptz not null default now()
);
create index product_category_status on bishop_private.products(category_id, status);
create table bishop_private.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references bishop_private.products on delete cascade,
  sku text not null check (length(trim(sku)) between 1 and 80),
  name text not null check (length(trim(name)) between 1 and 120),
  price numeric(12,2) check (price >= 0 and price <> 'NaN'::numeric),
  active boolean not null default true,
  on_request boolean not null default false
);
create unique index variant_sku on bishop_private.product_variants(lower(trim(sku)));
create index variant_product on bishop_private.product_variants(product_id);
create table bishop_private.inventory (
  variant_id uuid primary key references bishop_private.product_variants on delete cascade,
  quantity int not null check (quantity >= 0),
  threshold int not null check (threshold >= 0),
  updated_at timestamptz not null default now()
);
create table bishop_private.product_images (
  product_id uuid not null references bishop_private.products on delete cascade,
  path text primary key check (path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}[.](jpg|png|webp)$'),
  alt text not null default '' check (length(alt) <= 200),
  position int not null
);
create index image_product on bishop_private.product_images(product_id, position);
create table bishop_private.audit_logs (
  id bigint generated always as identity primary key,
  actor uuid,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  changes jsonb not null,
  created_at timestamptz not null default now()
);
create table bishop_private.business_settings (
  singleton boolean primary key default true check (singleton),
  details jsonb not null default '{}' check (jsonb_typeof(details) = 'object')
);

alter table bishop_private.staff_members enable row level security;
alter table bishop_private.categories enable row level security;
alter table bishop_private.products enable row level security;
alter table bishop_private.product_variants enable row level security;
alter table bishop_private.inventory enable row level security;
alter table bishop_private.product_images enable row level security;
alter table bishop_private.audit_logs enable row level security;
alter table bishop_private.business_settings enable row level security;

create function bishop_private.staff_role() returns text language sql stable set search_path = ''
as $$
  select role from bishop_private.staff_members where user_id = auth.uid() and is_active
    and (auth.jwt()->>'aal' = 'aal2' or not exists (
      select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified'
    ))
$$;

create function bishop_private.catalog_product(p bishop_private.products, admin boolean)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'category_id', p.category_id, 'name', p.name, 'slug', p.slug,
    'brand', p.brand, 'description', p.description, 'specifications', p.specifications, 'warranty', p.warranty,
    'featured', p.featured)
  || case when admin then jsonb_build_object('revision', p.revision, 'status', p.status, 'updated_at', p.updated_at) else '{}'::jsonb end
  || jsonb_build_object(
    'variants', coalesce((
      select jsonb_agg(jsonb_build_object('id', v.id, 'sku', v.sku, 'name', v.name, 'price', v.price,
        'availability', case when i.quantity > 0 then 'In Stock' when v.on_request then 'Available on Request' else 'Out of Stock' end)
        || case when admin then jsonb_build_object('quantity', i.quantity, 'threshold', i.threshold,
          'active', v.active, 'on_request', v.on_request, 'stock_updated_at', i.updated_at) else '{}'::jsonb end order by v.name, v.id)
      from bishop_private.product_variants v join bishop_private.inventory i on i.variant_id = v.id
      where v.product_id = p.id and (admin or v.active)
    ), '[]'),
    'images', coalesce((select jsonb_agg(jsonb_build_object('path', m.path, 'alt', m.alt) order by m.position)
      from bishop_private.product_images m where m.product_id = p.id), '[]')
  )
$$;

create function public.bishop_catalog(search_term text default '', category_slug text default '',
  brand_name text default '', sort_order text default 'featured', page_number int default 1,
  product_slug text default '', minimum_price numeric default null, maximum_price numeric default null)
returns jsonb language sql stable security definer set search_path = '' as $$
  with eligible as (
    select p.*, (select min(v.price) from bishop_private.product_variants v where v.product_id = p.id and v.active) as lowest_price
    from bishop_private.products p join bishop_private.categories c on c.id = p.category_id
    where p.status = 'published' and c.is_active
  ), matches as (
    select e.* from eligible e join bishop_private.categories c on c.id = e.category_id
    where (category_slug = '' or c.slug = category_slug)
      and (product_slug = '' or e.slug = product_slug)
      and (brand_name = '' or e.brand = brand_name)
      and (left(search_term,120) = '' or strpos(lower(e.name || ' ' || e.brand || ' ' || e.description || ' ' || e.specifications), lower(left(search_term,120))) > 0
        or exists (select 1 from bishop_private.product_variants v where v.product_id = e.id and v.active and strpos(lower(v.sku), lower(left(search_term,120))) > 0))
      and ((minimum_price is null and maximum_price is null) or exists (
        select 1 from bishop_private.product_variants v where v.product_id = e.id and v.active and v.price is not null
          and (minimum_price is null or v.price >= minimum_price) and (maximum_price is null or v.price <= maximum_price)))
  ), ranked as (
    select m.*, row_number() over (order by
      case when sort_order = 'price-asc' then lowest_price end asc nulls last,
      case when sort_order = 'price-desc' then lowest_price end desc nulls last,
      case when sort_order = 'featured' then featured end desc,
      lower(name), id) as item_rank from matches m
  )
  select jsonb_build_object(
    'categories', coalesce((select jsonb_agg(to_jsonb(c) - 'is_active' order by c.display_order, c.name) from bishop_private.categories c where c.is_active), '[]'),
    'brands', coalesce((select jsonb_agg(brand order by brand) from (select distinct brand from eligible where brand <> '') b), '[]'),
    'total', (select count(*) from matches),
    'business', coalesce((select details - 'projects' from bishop_private.business_settings where singleton), '{}'),
    'products', coalesce((select jsonb_agg(bishop_private.catalog_product(p, false) order by r.item_rank)
      from ranked r join bishop_private.products p on p.id = r.id
      where r.item_rank between ((greatest(1, least(page_number,100000)) - 1) * 24 + 1) and greatest(1, least(page_number,100000)) * 24), '[]')
  )
$$;

create function public.bishop_site_info() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'business', coalesce((select details - 'projects' from bishop_private.business_settings where singleton), '{}'),
    'projects', coalesce((select details->'projects' from bishop_private.business_settings where singleton), '[]'),
    'categories', coalesce((select jsonb_agg(jsonb_build_object('slug', slug, 'name', name, 'description', description)
      order by display_order, name) from bishop_private.categories where is_active), '[]'),
    'featured', coalesce((select jsonb_agg(bishop_private.catalog_product(p,false) order by q.name, q.id) from (
      select p.id, p.name from bishop_private.products p join bishop_private.categories c on c.id=p.category_id
      where p.status='published' and p.featured and c.is_active order by p.name, p.id limit 6
    ) q join bishop_private.products p on p.id=q.id), '[]')
  )
$$;

create function public.bishop_admin_catalog() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare actor_role text := bishop_private.staff_role();
begin
  if actor_role is null then raise insufficient_privilege using message = 'Staff account required'; end if;
  return jsonb_build_object('role', actor_role,
    'categories', coalesce((select jsonb_agg(to_jsonb(c) order by display_order, name) from bishop_private.categories c), '[]'),
    'products', coalesce((select jsonb_agg(bishop_private.catalog_product(p,true) order by updated_at desc) from bishop_private.products p), '[]'),
    'business', coalesce((select details from bishop_private.business_settings where singleton), '{}'),
    'activity', case when actor_role = 'owner' then coalesce((select jsonb_agg(to_jsonb(a) order by id desc)
      from (select id, entity_type, entity_id, action, created_at, actor from bishop_private.audit_logs order by id desc limit 50) a), '[]') else '[]'::jsonb end,
    'staff', case when actor_role = 'owner' then coalesce((select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'role', m.role, 'is_active', m.is_active, 'email', u.email) order by u.email)
      from bishop_private.staff_members m join auth.users u on u.id = m.user_id), '[]') else '[]'::jsonb end
  );
end $$;

create function public.bishop_save_category(payload jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare target uuid := coalesce((payload->>'id')::uuid, gen_random_uuid());
begin
  if bishop_private.staff_role() is null then raise insufficient_privilege; end if;
  insert into bishop_private.categories as c (id, name, slug, description, display_order, is_active)
  values (target, trim(payload->>'name'), trim(payload->>'slug'), coalesce(payload->>'description',''),
    (payload->>'display_order')::int, (payload->>'is_active')::boolean)
  on conflict (id) do update set name=excluded.name, description=excluded.description,
    display_order=excluded.display_order, is_active=excluded.is_active;
  return target;
end $$;

create function public.bishop_save_product(payload jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  target uuid := coalesce((payload->>'id')::uuid, gen_random_uuid());
  previous bishop_private.products;
  item jsonb;
  variant uuid;
  retained uuid[] := '{}';
  media_path text;
begin
  if bishop_private.staff_role() is null then raise insufficient_privilege; end if;
  if jsonb_typeof(payload->'variants') is distinct from 'array'
    or jsonb_typeof(payload->'images') is distinct from 'array'
    or jsonb_array_length(payload->'variants') > 100 or jsonb_array_length(payload->'images') > 12 then
    raise check_violation using message = 'Use at most 100 variants and 12 images.';
  end if;
  if payload->>'status' = 'published' and (
    nullif(trim(payload->>'description'),'') is null or
    not exists (select 1 from bishop_private.categories where id = (payload->>'category_id')::uuid and is_active) or
    not exists (select 1 from jsonb_array_elements(payload->'variants') v where (v->>'active')::boolean)
  ) then raise check_violation using message = 'A published product needs a description, an active category and an active variant.'; end if;

  select * into previous from bishop_private.products where id = target for update;
  if found then
    if previous.revision is distinct from (payload->>'revision')::int then
      raise sqlstate '40001' using message = 'This product changed. Reload it before saving.';
    end if;
    update bishop_private.products set category_id = (payload->>'category_id')::uuid, name=trim(payload->>'name'),
      brand=coalesce(payload->>'brand',''), description=coalesce(payload->>'description',''),
      specifications=coalesce(payload->>'specifications',''), warranty=coalesce(payload->>'warranty',''),
      status=payload->>'status', featured=(payload->>'featured')::boolean,
      revision=revision+1, updated_at=now() where id = target;
  else
    if payload->>'revision' is not null then raise no_data_found; end if;
    insert into bishop_private.products(id, category_id, name, slug, brand, description, specifications, warranty, status, featured)
    values (target, (payload->>'category_id')::uuid, trim(payload->>'name'), trim(payload->>'slug'), coalesce(payload->>'brand',''),
      coalesce(payload->>'description',''), coalesce(payload->>'specifications',''), coalesce(payload->>'warranty',''),
      payload->>'status', (payload->>'featured')::boolean);
  end if;

  for item in select value from jsonb_array_elements(payload->'variants') loop
    variant := coalesce((item->>'id')::uuid, gen_random_uuid());
    if variant = any(retained) then raise check_violation using message = 'Each variant may occur once.'; end if;
    insert into bishop_private.product_variants as v (id, product_id, sku, name, price, active, on_request)
    values (variant, target, trim(item->>'sku'), trim(item->>'name'), nullif(item->>'price','')::numeric,
      (item->>'active')::boolean, (item->>'on_request')::boolean)
    on conflict (id) do update set sku=excluded.sku, name=excluded.name, price=excluded.price,
      active=excluded.active, on_request=excluded.on_request where v.product_id = target;
    if not found then raise check_violation using message = 'Variant belongs to a different product.'; end if;
    insert into bishop_private.inventory as i (variant_id, quantity, threshold)
    values (variant, (item->>'quantity')::int, (item->>'threshold')::int)
    on conflict (variant_id) do update set quantity=excluded.quantity, threshold=excluded.threshold, updated_at=now()
      where (i.quantity, i.threshold) is distinct from (excluded.quantity, excluded.threshold);
    retained := array_append(retained,variant);
  end loop;
  delete from bishop_private.product_variants where product_id = target and not (id = any(retained));

  for media_path in select value->>'path' from jsonb_array_elements(payload->'images') loop
    perform 1 from storage.objects where bucket_id = 'bishop-products' and name = media_path for share;
    if not found then raise check_violation using message = 'An uploaded image is missing.'; end if;
  end loop;
  delete from bishop_private.product_images where product_id = target
    and path not in (select value->>'path' from jsonb_array_elements(payload->'images'));
  insert into bishop_private.product_images as m (product_id,path,alt,position)
  select target, value->>'path', coalesce(value->>'alt',''), ordinality::int
  from jsonb_array_elements(payload->'images') with ordinality
  on conflict (path) do update set alt=excluded.alt, position=excluded.position where m.product_id = target;
  if (select count(*) from bishop_private.product_images where product_id=target) <> jsonb_array_length(payload->'images') then
    raise check_violation using message = 'Images must be unique and belong to this product.';
  end if;
  return target;
end $$;

create function public.bishop_manage_editor(target uuid, enabled boolean) returns void language plpgsql security definer set search_path = '' as $$
begin
  if bishop_private.staff_role() is distinct from 'owner' then raise insufficient_privilege; end if;
  insert into bishop_private.staff_members as s (user_id,role,is_active) values (target,'editor',enabled)
  on conflict (user_id) do update set is_active=excluded.is_active where s.role='editor';
  if not found then raise insufficient_privilege; end if;
end $$;

create function public.bishop_save_business(payload jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare
  address text := coalesce(trim(payload->>'address'),'');
  hours text := coalesce(trim(payload->>'hours'),'');
  phone text := coalesce(trim(payload->>'whatsapp'),'');
  item jsonb;
  gallery jsonb := '[]';
begin
  if bishop_private.staff_role() is distinct from 'owner' then raise insufficient_privilege; end if;
  if length(address)>250 or length(hours)>200 or (phone<>'' and phone !~ '^[+]?[1-9][0-9]{7,14}$') then
    raise check_violation using message = 'Check the address, hours and international WhatsApp number.';
  end if;
  if jsonb_typeof(coalesce(payload->'projects','[]')) <> 'array' or jsonb_array_length(coalesce(payload->'projects','[]')) > 30 then
    raise check_violation using message = 'Use at most 30 projects in the gallery.';
  end if;
  for item in select value from jsonb_array_elements(coalesce(payload->'projects','[]')) loop
    if length(coalesce(trim(item->>'name'),'')) not between 1 and 160
      or length(coalesce(item->>'description','')) > 1000
      or length(coalesce(item->>'image','')) > 2048 or length(coalesce(item->>'url','')) > 2048
      or (coalesce(item->>'image','') <> '' and item->>'image' !~ '^https://[a-zA-Z0-9.-]+([/?#]|$)')
      or (coalesce(item->>'url','') <> '' and item->>'url' !~ '^https://[a-zA-Z0-9.-]+([/?#]|$)') then
      raise check_violation using message = 'Each project needs a name. Use public HTTPS links for photos and project websites.';
    end if;
    gallery := gallery || jsonb_build_array(jsonb_build_object('id',coalesce((item->>'id')::uuid,gen_random_uuid()),
      'name',trim(item->>'name'),'description',coalesce(item->>'description',''),'image',coalesce(item->>'image',''),'url',coalesce(item->>'url','')));
  end loop;
  insert into bishop_private.business_settings (details) values (jsonb_build_object('address',address,'hours',hours,'whatsapp',phone,'projects',gallery))
  on conflict (singleton) do update set details=excluded.details;
end $$;

create function bishop_private.audit() returns trigger language plpgsql set search_path = '' as $$
declare before_row jsonb; after_row jsonb; entity uuid;
begin
  if tg_op <> 'INSERT' then before_row := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then after_row := to_jsonb(new); end if;
  if before_row is distinct from after_row then
    entity := coalesce(after_row,before_row)->>tg_argv[0];
    insert into bishop_private.audit_logs(actor,entity_type,entity_id,action,changes)
    values (auth.uid(),tg_table_name,entity,lower(tg_op),jsonb_build_object('before',before_row,'after',after_row));
  end if;
  return null;
end $$;
create trigger audit_products after insert or update on bishop_private.products for each row execute function bishop_private.audit('id');
create trigger audit_categories after insert or update on bishop_private.categories for each row execute function bishop_private.audit('id');
create trigger audit_variants after insert or update or delete on bishop_private.product_variants for each row execute function bishop_private.audit('id');
create trigger audit_inventory after insert or update or delete on bishop_private.inventory for each row execute function bishop_private.audit('variant_id');
create trigger audit_staff after insert or update or delete on bishop_private.staff_members for each row execute function bishop_private.audit('user_id');

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('bishop-products','bishop-products',false,2097152,array['image/jpeg','image/png','image/webp']);

create function public.bishop_media_allowed(object_name text) returns boolean language sql stable security definer set search_path = '' as $$
 select bishop_private.staff_role() is not null or exists (
   select 1 from bishop_private.product_images m join bishop_private.products p on p.id=m.product_id
   join bishop_private.categories c on c.id=p.category_id
   where m.path=object_name and p.status='published' and c.is_active)
$$;
create function public.bishop_media_mutable(object_name text, deleting boolean) returns boolean language sql stable security definer set search_path = '' as $$
 select bishop_private.staff_role() is not null and (
   (not deleting and object_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}[.](jpg|png|webp)$' and split_part(object_name,'/',1)=auth.uid()::text)
   or (deleting and not exists (select 1 from bishop_private.product_images where path=object_name)
       and (split_part(object_name,'/',1)=auth.uid()::text or bishop_private.staff_role()='owner')))
$$;
create policy bishop_media_read on storage.objects for select to anon, authenticated
using (bucket_id='bishop-products' and public.bishop_media_allowed(name));
create policy bishop_media_insert on storage.objects for insert to authenticated
with check (bucket_id='bishop-products' and public.bishop_media_mutable(name,false));
create policy bishop_media_delete on storage.objects for delete to authenticated
using (bucket_id='bishop-products' and public.bishop_media_mutable(name,true));

revoke all on function public.bishop_catalog(text,text,text,text,int,text,numeric,numeric),
  public.bishop_site_info(), public.bishop_admin_catalog(), public.bishop_save_category(jsonb), public.bishop_save_product(jsonb),
  public.bishop_manage_editor(uuid,boolean), public.bishop_save_business(jsonb),
  public.bishop_media_allowed(text), public.bishop_media_mutable(text,boolean) from public, anon, authenticated;
grant execute on function public.bishop_catalog(text,text,text,text,int,text,numeric,numeric),
  public.bishop_site_info(), public.bishop_media_allowed(text) to anon, authenticated;
grant execute on function public.bishop_admin_catalog(), public.bishop_save_category(jsonb), public.bishop_save_product(jsonb),
  public.bishop_manage_editor(uuid,boolean), public.bishop_save_business(jsonb), public.bishop_media_mutable(text,boolean) to authenticated;
commit;
