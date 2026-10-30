-- Smart Dairy – Supabase/PostgreSQL schema (core). Run in the Supabase SQL editor.
create extension if not exists pgcrypto;
create type app_role as enum('admin','staff','customer');
create table profiles(id uuid primary key references auth.users on delete cascade,role app_role not null default 'customer',name text,mobile text,whatsapp text,whatsapp_optin bool default false,push_optin bool default false);
create table products(id uuid primary key default gen_random_uuid(),name text not null,category text,unit text check(unit in('litre','ml','kg','g','packet','piece')),price numeric(10,2) check(price>=0),stock numeric default 0 check(stock>=0),image_url text,description text,active bool default true);
create table price_history(id uuid primary key default gen_random_uuid(),product_id uuid references products,price numeric(10,2),valid_from date default current_date);
create table customers(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users,code text unique,name text not null,mobile text,whatsapp text,address text,route text,status text default 'Active',billing text default 'Monthly' check(billing in('Daily','Weekly','Monthly')),opening_balance numeric(12,2) default 0);
create table customer_prices(customer_id uuid references customers,product_id uuid references products,price numeric(10,2),primary key(customer_id,product_id));
create table deliveries(id uuid primary key default gen_random_uuid(),delivery_date date not null,customer_id uuid not null references customers,product_id uuid not null references products,qty numeric check(qty>=0),unit_price numeric(10,2),status text check(status in('Delivered','Missed','Cancelled')),remarks text,unique(delivery_date,customer_id,product_id));
create table payments(id uuid primary key default gen_random_uuid(),customer_id uuid references customers,amount numeric(12,2) check(amount>0),mode text,paid_on date default current_date);
create table invoices(id uuid primary key default gen_random_uuid(),invoice_no text unique,customer_id uuid references customers,period_type text,period_start date,period_end date,due_date date,opening numeric,charges numeric,paid numeric,due numeric,locked bool default true,unique(customer_id,period_type,period_start));
create table whatsapp_logs(id uuid primary key default gen_random_uuid(),customer_id uuid,template text,status text default 'pending',provider_id text,dedupe_key text unique,created_at timestamptz default now());
create table push_subscriptions(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users,subscription jsonb);
create table audit_logs(id uuid primary key default gen_random_uuid(),actor uuid,action text,at timestamptz default now());
create index on deliveries(customer_id,delivery_date);
create function is_admin() returns bool language sql security definer as $$select exists(select 1 from profiles where id=auth.uid() and role='admin')$$;
do $$ declare t text; begin foreach t in array array['profiles','products','price_history','customers','customer_prices','deliveries','payments','invoices','whatsapp_logs','push_subscriptions','audit_logs'] loop
execute format('alter table %I enable row level security',t);
execute format('create policy "admin all" on %I for all using(is_admin())',t); end loop; end $$;
create policy "read products" on products for select using(active);
create policy "own customer" on customers for select using(user_id=auth.uid());
create policy "own deliveries" on deliveries for select using(customer_id in(select id from customers where user_id=auth.uid()));
create policy "own payments" on payments for select using(customer_id in(select id from customers where user_id=auth.uid()));
create policy "own invoices" on invoices for select using(customer_id in(select id from customers where user_id=auth.uid()));
-- TODO: staff route-based policies, scheduled billing + WhatsApp Edge Functions.
