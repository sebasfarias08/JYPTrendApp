-- ABM de clientes + relacion con orders.
-- Ejecutar en Supabase SQL Editor.

begin;

create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_full_name_len_chk check (char_length(btrim(full_name)) >= 2),
  constraint customers_email_format_chk check (
    email is null
    or email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  )
);

create unique index if not exists customers_user_full_name_uidx
  on public.customers (user_id, lower(btrim(full_name)))
  where is_active = true;

create index if not exists customers_user_created_idx
  on public.customers (user_id, created_at desc);

create or replace function public.set_customers_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_customers_set_updated_at on public.customers;
create trigger trg_customers_set_updated_at
before update on public.customers
for each row execute function public.set_customers_updated_at();

alter table public.customers enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'customers'
      and policyname = 'customers_select_own'
  ) then
    create policy customers_select_own
      on public.customers
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'customers'
      and policyname = 'customers_insert_own'
  ) then
    create policy customers_insert_own
      on public.customers
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'customers'
      and policyname = 'customers_update_own'
  ) then
    create policy customers_update_own
      on public.customers
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'customers'
      and policyname = 'customers_delete_own'
  ) then
    create policy customers_delete_own
      on public.customers
      for delete
      using (auth.uid() = user_id);
  end if;
end;
$$;

grant select, insert, update, delete on public.customers to authenticated;

alter table public.orders
  add column if not exists customer_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_customer_id_fkey'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_customer_id_fkey
      foreign key (customer_id)
      references public.customers(id)
      on delete set null;
  end if;
end;
$$;

create index if not exists orders_customer_id_idx
  on public.orders (customer_id);

insert into public.customers (user_id, full_name, phone, is_active)
select distinct
  o.user_id,
  btrim(o.customer_name) as full_name,
  nullif(btrim(o.customer_phone), '') as phone,
  true
from public.orders o
where o.user_id is not null
  and o.customer_name is not null
  and btrim(o.customer_name) <> ''
  and not exists (
    select 1
    from public.customers c
    where c.user_id = o.user_id
      and lower(btrim(c.full_name)) = lower(btrim(o.customer_name))
      and c.is_active = true
  );

update public.orders o
set customer_id = c.id
from public.customers c
where o.customer_id is null
  and o.user_id = c.user_id
  and o.customer_name is not null
  and lower(btrim(o.customer_name)) = lower(btrim(c.full_name));

commit;
