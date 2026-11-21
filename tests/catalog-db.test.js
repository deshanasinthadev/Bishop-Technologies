import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'

const runtime = process.env.BISHOP_PGLITE_MODULE
const owner = '10000000-0000-4000-8000-000000000001'
const editor = '10000000-0000-4000-8000-000000000002'
const visitor = '10000000-0000-4000-8000-000000000003'
const image = editor + '/10000000-0000-4000-8000-000000000004.webp'

test('catalog migration enforces publication, staff, stock, and image boundaries', { skip: !runtime }, async (t) => {
  const { PGlite } = await import(pathToFileURL(runtime).href)
  const database = new PGlite()
  t.after(() => database.close())
  await database.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create schema storage;
    create table auth.users (id uuid primary key, email text);
    create table auth.mfa_factors (user_id uuid not null, status text not null);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as
      $$ select jsonb_build_object('aal',current_setting('request.jwt.claim.aal',true)) $$;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (bucket_id text, name text, primary key (bucket_id,name));
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon, authenticated;
    grant select on storage.objects to anon, authenticated;
    grant insert, delete on storage.objects to authenticated;
  `)
  const sql = await readFile(new URL('../supabase/migrations/202611210001_catalog.sql', import.meta.url), 'utf8')
  await database.exec(sql)
  await database.query('insert into auth.users values ($1,$4),($2,$5),($3,$6)', [owner,editor,visitor,'owner@example.test','editor@example.test','visitor@example.test'])
  await database.query("insert into bishop_private.staff_members values ($1,'owner',true),($2,'editor',true)", [owner,editor])

  async function as(role, user = '', level = 'aal1') {
    await database.exec('reset role')
    await database.query("select set_config('request.jwt.claim.sub',$1,false), set_config('request.jwt.claim.aal',$2,false)", [user,level])
    await database.exec('set role ' + role)
  }
  async function call(name, args = [], cast = '') {
    const bindings = args.map((_, index) => '$' + (index + 1) + (index === 0 ? cast : '')).join(',')
    return (await database.query('select public.' + name + '(' + bindings + ') as value', args)).rows[0].value
  }
  const admin = () => call('bishop_admin_catalog')
  const catalog = () => call('bishop_catalog')
  const save = (payload) => call('bishop_save_product', [JSON.stringify(payload)], '::jsonb')
  const deny = { code: '42501' }
  await as('anon')
  assert.deepEqual((await catalog()).products, [])
  await assert.rejects(admin, deny)
  await assert.rejects(() => save({}), deny)
  await assert.rejects(() => database.query('select * from bishop_private.inventory'), deny)
  await as('authenticated', visitor)
  await assert.rejects(admin, deny)
  await assert.rejects(() => save({}), deny)
  await assert.rejects(() => database.query("insert into storage.objects values ('bishop-products',$1)",[image]), deny)

  await as('authenticated', editor)
  assert.equal((await admin()).role, 'editor')
  await assert.rejects(() => call('bishop_manage_editor',[visitor,true]), deny)
  await assert.rejects(() => call('bishop_save_business',['{}'],'::jsonb'), deny)
  await database.query("insert into storage.objects values ('bishop-products',$1)",[image])
  const category = await call('bishop_save_category',[JSON.stringify({
    name:'Test Category',slug:'test-category',description:'',display_order:0,is_active:true,
  })],'::jsonb')
  const draft = { category_id: category, name:'Test Product',slug:'test-product',description:'Test fixture',
    featured:true,status:'draft',images:[{ path:image,alt:'Fixture' }],
    variants:[{ name:'Default',sku:'TEST-SKU',price:1000,active:true,on_request:false,quantity:2,threshold:2 }] }
  const product = await save(draft)

  await as('anon')
  assert.equal((await catalog()).total, 0)
  assert.equal((await database.query("select * from storage.objects where name=$1",[image])).rows.length, 0)
  await as('authenticated', editor)
  const saved = (await admin()).products[0]
  assert.equal(saved.id, product)
  assert.equal(saved.variants[0].quantity, 2)
  assert.equal((await admin()).activity.length, 0)
  await assert.rejects(() => save({ ...saved,status:'published',variants:[{ ...saved.variants[0],quantity:-1 }] }),{code:'23514'})
  await assert.rejects(() => save({ ...saved,status:'published',variants:[{ ...saved.variants[0],price:-1 }] }),{code:'23514'})
  await assert.rejects(() => save({ ...saved,status:'published',variants:[{ ...saved.variants[0],price:'NaN' }] }),{code:'23514'})
  await assert.rejects(() => save({ ...saved,variants:[...saved.variants,{ ...saved.variants[0],id:null,sku:'test-sku' }] }),{code:'23505'})
  await save({ ...saved,status:'published' })
  await assert.rejects(() => save({ ...saved,status:'published' }),{code:'40001'})
  assert.equal((await database.query("delete from storage.objects where name=$1",[image])).affectedRows,0)
  await as('anon')
  const [visible] = (await catalog()).products
  assert.equal(visible.variants[0].price,1000)
  assert.equal(visible.variants[0].availability,'In Stock')
  assert.equal('quantity' in visible.variants[0],false)
  assert.equal('threshold' in visible.variants[0],false)
  assert.equal('revision' in visible,false)
  assert.equal((await call('bishop_site_info')).featured.length,1)
  assert.equal((await database.query("select * from storage.objects where name=$1",[image])).rows.length, 1)

  await as('authenticated', editor)
  const current = (await admin()).products[0]
  await save({ ...current,variants:[{ ...current.variants[0],quantity:0,price:1200 }] })
  await as('anon')
  const [updated] = (await catalog()).products
  assert.equal(updated.variants[0].price,1200)
  assert.equal(updated.variants[0].availability,'Out of Stock')
  await as('authenticated', owner)
  assert.ok((await admin()).activity.some((item) => item.entity_type === 'inventory'))
  await call('bishop_save_business',[JSON.stringify({ address:'Test address', projects:[{ name:'Test gallery item' }] })],'::jsonb')
  assert.equal((await call('bishop_site_info')).projects[0].name,'Test gallery item')
  assert.equal('projects' in (await catalog()).business,false)
  await call('bishop_manage_editor',[editor,false])
  await as('authenticated', editor)
  await assert.rejects(admin, deny)
  await as('authenticated', owner)
  await call('bishop_manage_editor',[editor,true])
  await database.exec('reset role')
  await database.query("insert into auth.mfa_factors values ($1,'verified')",[editor])
  await as('authenticated',editor)
  await assert.rejects(admin,deny)
  await as('authenticated',editor,'aal2')
  const published = (await admin()).products[0]
  await save({ ...published,status:'archived',images:[] })
  assert.equal((await database.query("delete from storage.objects where name=$1",[image])).affectedRows,1)
  await as('anon')
  assert.equal((await catalog()).products.length,0)
  assert.equal((await call('bishop_site_info')).featured.length,0)
})
