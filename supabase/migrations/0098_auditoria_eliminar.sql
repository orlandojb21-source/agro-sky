-- Agro Sky — migración 0098: permite eliminar eventos de Auditoría
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- La migración 0097 dejó auditoria_acciones como tabla de solo inserción
-- (sin policy de delete) a propósito, para que sirviera como registro
-- confiable. El usuario pidió poder limpiar eventos manualmente -- se
-- permite borrar, pero solo al mismo correo autorizado a leerla.

create policy "solo el correo autorizado borra eventos de auditoria" on auditoria_acciones
  for delete using ((auth.jwt() ->> 'email') = 'orlandojb.21@gmail.com');
