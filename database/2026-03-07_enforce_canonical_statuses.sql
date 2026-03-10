-- Enforce canonical status values aligned with docs/supabase-architecture-final.md.
-- Execute in Supabase SQL Editor.

begin;

-- 1) Normalize order_status legacy values to canonical values.
update public.orders
set order_status = case upper(coalesce(order_status, ''))
  when 'NUEVO' then 'NUEVO'
  when 'CONFIRMADO' then 'CONFIRMADO'
  when 'ENVIADO' then 'ENVIADO'
  when 'ENTREGADO' then 'ENTREGADO'
  when 'CANCELADO' then 'CANCELADO'
  when 'NEW' then 'NUEVO'
  when 'PREPARING' then 'CONFIRMADO'
  when 'READY' then 'ENVIADO'
  when 'DELIVERED' then 'ENTREGADO'
  when 'FINISHED' then 'ENTREGADO'
  when 'CANCELLED' then 'CANCELADO'
  when 'SUBMITTED' then 'NUEVO'
  when 'EN_PREPARACION' then 'CONFIRMADO'
  when 'LISTO_PARA_RETIRO' then 'ENVIADO'
  when 'FINALIZADO' then 'ENTREGADO'
  else 'NUEVO'
end
where order_status not in ('NUEVO', 'CONFIRMADO', 'ENVIADO', 'ENTREGADO', 'CANCELADO');

-- 2) Normalize payment_status legacy values to canonical values in orders.
update public.orders
set payment_status = case upper(coalesce(payment_status, ''))
  when 'PENDIENTE' then 'PENDIENTE'
  when 'PARCIAL' then 'PARCIAL'
  when 'PAGADO' then 'PAGADO'
  when 'FALLIDO' then 'FALLIDO'
  when 'CANCELADO' then 'CANCELADO'
  when 'PENDING' then 'PENDIENTE'
  when 'PARTIAL' then 'PARCIAL'
  when 'PAID' then 'PAGADO'
  when 'FAILED' then 'FALLIDO'
  when 'CANCELLED' then 'CANCELADO'
  when 'FINALIZADO' then 'PAGADO'
  when 'FINISHED' then 'PAGADO'
  else 'PENDIENTE'
end
where payment_status not in ('PENDIENTE', 'PARCIAL', 'PAGADO', 'FALLIDO', 'CANCELADO');

-- 3) Normalize payment_status legacy values to canonical values in payments.
update public.payments
set payment_status = case upper(coalesce(payment_status, ''))
  when 'PENDIENTE' then 'PENDIENTE'
  when 'PARCIAL' then 'PARCIAL'
  when 'PAGADO' then 'PAGADO'
  when 'FALLIDO' then 'FALLIDO'
  when 'CANCELADO' then 'CANCELADO'
  when 'PENDING' then 'PENDIENTE'
  when 'PARTIAL' then 'PARCIAL'
  when 'PAID' then 'PAGADO'
  when 'FAILED' then 'FALLIDO'
  when 'CANCELLED' then 'CANCELADO'
  when 'FINALIZADO' then 'PAGADO'
  when 'FINISHED' then 'PAGADO'
  else 'PENDIENTE'
end
where payment_status not in ('PENDIENTE', 'PARCIAL', 'PAGADO', 'FALLIDO', 'CANCELADO');

-- 4) Recreate strict checks for canonical values only.
alter table public.orders drop constraint if exists orders_order_status_check;
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.payments drop constraint if exists payments_payment_status_check;

alter table public.orders
  add constraint orders_order_status_check
  check (order_status in ('NUEVO', 'CONFIRMADO', 'ENVIADO', 'ENTREGADO', 'CANCELADO'));

alter table public.orders
  add constraint orders_payment_status_check
  check (payment_status in ('PENDIENTE', 'PARCIAL', 'PAGADO', 'FALLIDO', 'CANCELADO'));

alter table public.payments
  add constraint payments_payment_status_check
  check (payment_status in ('PENDIENTE', 'PARCIAL', 'PAGADO', 'FALLIDO', 'CANCELADO'));

commit;
