-- Agro Sky — migración 0071: Estado de pago en Gastos (Pagada / Por pagar)
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Pedido del usuario (2026-08-10): poder marcar un gasto como "Por pagar"
-- (crédito) con una fecha tope, para avisar dentro de la app cuando esa
-- fecha esté próxima o vencida. Default 'pagada' para que ningún gasto ya
-- registrado aparezca de golpe como pendiente.

alter table gastos
  add column estado_pago text not null default 'pagada' check (estado_pago in ('pagada', 'por_pagar')),
  add column fecha_tope_pago date;
