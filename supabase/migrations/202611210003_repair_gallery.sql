begin;

create or replace function public.bishop_save_business(payload jsonb) returns void language plpgsql security definer set search_path = '' as $$
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
      or (coalesce(item->>'device_category','') <> '' and (
        item->>'device_category' not in ('laptop','desktop','mobile','other')
        or nullif(trim(item->>'problem'),'') is null
        or length(item->>'problem') > 160
        or nullif(trim(item->>'description'),'') is null
        or nullif(trim(item->>'image'),'') is null
        or (coalesce(item->>'repair_date','') <> '' and item->>'repair_date' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
      ))
      or length(coalesce(item->>'image','')) > 2048 or length(coalesce(item->>'url','')) > 2048
      or (coalesce(item->>'image','') <> '' and item->>'image' !~ '^https://[a-zA-Z0-9.-]+([/?#]|$)')
      or (coalesce(item->>'url','') <> '' and item->>'url' !~ '^https://[a-zA-Z0-9.-]+([/?#]|$)') then
      raise check_violation using message = 'Each project needs a name. Use public HTTPS links for photos and project websites.';
    end if;
    gallery := gallery || jsonb_build_array(jsonb_build_object('id',coalesce((item->>'id')::uuid,gen_random_uuid()),
      'name',trim(item->>'name'),'description',coalesce(item->>'description',''),'image',coalesce(item->>'image',''),'url',coalesce(item->>'url','')
    ) || case when coalesce(item->>'device_category','') = '' then '{}'::jsonb else jsonb_build_object(
      'device_category', item->>'device_category', 'problem', trim(item->>'problem'),
      'repair_date', nullif(item->>'repair_date','')::date
    ) end);
  end loop;
  insert into bishop_private.business_settings (details) values (jsonb_build_object('address',address,'hours',hours,'whatsapp',phone,'projects',gallery))
  on conflict (singleton) do update set details=excluded.details;
end $$;

commit;
