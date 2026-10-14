-- Ruu Craft Supabase setup
-- Run this in Supabase SQL Editor after creating your project.
-- This creates tables and security policies. Admin access is granted separately below.

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  price numeric(10,2) not null default 0,
  category text not null default 'gift combo',
  image_url text default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_ref text unique not null,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  price numeric(10,2) not null default 0,
  quantity integer not null default 1 check (quantity > 0),
  customer_name text not null,
  notes text default '',
  receipt_path text default '',
  receipt_name text default '',
  status text not null default 'Pending review',
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.admin_users enable row level security;
alter table public.orders enable row level security;

drop policy if exists "Public can view active products" on public.products;
create policy "Public can view active products" on public.products
for select to anon, authenticated using (is_active = true);

drop policy if exists "Admins can manage products" on public.products;
create policy "Admins can manage products" on public.products
for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "Admins can view admin list" on public.admin_users;
create policy "Admins can view admin list" on public.admin_users
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Anyone can submit orders" on public.orders;
create policy "Anyone can submit orders" on public.orders
for insert to anon, authenticated
with check (
  status = 'Pending review'
  and quantity > 0
  and length(customer_name) between 1 and 120
);

drop policy if exists "Admins can manage orders" on public.orders;
create policy "Admins can manage orders" on public.orders
for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- Create Storage buckets (public product images, private payment receipts)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('payment-receipts', 'payment-receipts', false)
on conflict (id) do nothing;

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images" on storage.objects
for select to anon, authenticated
using (bucket_id = 'product-images');

drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'product-images'
  and exists (select 1 from public.admin_users a where a.user_id = auth.uid())
);

drop policy if exists "Admins can update product images" on storage.objects;
create policy "Admins can update product images" on storage.objects
for update to authenticated
using (
  bucket_id = 'product-images'
  and exists (select 1 from public.admin_users a where a.user_id = auth.uid())
)
with check (
  bucket_id = 'product-images'
  and exists (select 1 from public.admin_users a where a.user_id = auth.uid())
);

drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images" on storage.objects
for delete to authenticated
using (
  bucket_id = 'product-images'
  and exists (select 1 from public.admin_users a where a.user_id = auth.uid())
);

drop policy if exists "Anyone can upload receipt files" on storage.objects;
create policy "Anyone can upload receipt files" on storage.objects
for insert to anon, authenticated
with check (bucket_id = 'payment-receipts');

drop policy if exists "Admins can view receipt files" on storage.objects;
create policy "Admins can view receipt files" on storage.objects
for select to authenticated
using (
  bucket_id = 'payment-receipts'
  and exists (select 1 from public.admin_users a where a.user_id = auth.uid())
);

drop policy if exists "Admins can delete receipt files" on storage.objects;
create policy "Admins can delete receipt files" on storage.objects
for delete to authenticated
using (
  bucket_id = 'payment-receipts'
  and exists (select 1 from public.admin_users a where a.user_id = auth.uid())
);

-- After creating your admin user in Supabase Authentication, grant admin access:
-- replace YOUR_AUTH_USER_UUID with that user's ID, then run:
-- insert into public.admin_users (user_id) values ('YOUR_AUTH_USER_UUID');
