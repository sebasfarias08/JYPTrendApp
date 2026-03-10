-- Agrega un numero de pedido legible para vendedores/administracion.
-- Ejecutar en Supabase SQL Editor.

begin;

create sequence if not exists public.orders_order_number_seq;

alter table public.orders
  add column if not exists order_number bigint;

alter table public.orders
  alter column order_number set default nextval('public.orders_order_number_seq');

update public.orders
set order_number = nextval('public.orders_order_number_seq')
where order_number is null;

select setval(
  'public.orders_order_number_seq',
  coalesce((select max(order_number) from public.orders), 0),
  true
);

alter table public.orders
  alter column order_number set not null;

create unique index if not exists orders_order_number_uidx
  on public.orders(order_number);

commit;
