-- Agro Sky — migracion 0049: administrador vuelve a gestionar pagos de Campo
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Correccion del usuario (2026-08-01): el administrador SI gestiona los
-- pagos de los trabajadores de Campo -- no solo registra Asistencia, en
-- las quincenas tambien arma el pago. La migracion 0044 le habia quitado
-- todo acceso a planilla_pagos (ver select/insert/update/delete solo para
-- jefe/soporte via auth_gestiona_usuarios()); esto restaura para el
-- administrador el mismo alcance que ya tenia en la migracion 0034 --
-- CAMPO unicamente, nunca Fijo (eso sigue siendo exclusivo de jefe/
-- soporte). Las politicas de jefe/soporte de la 0034/0044 no se tocan.

create policy "usuarios con perfil ven pagos de Campo" on planilla_pagos
  for select
  using (
    auth_tiene_perfil()
    and exists (select 1 from colaboradores c where c.nombre = planilla_pagos.colaborador and c.tipo = 'campo')
  );

create policy "usuarios con perfil crean pagos de Campo" on planilla_pagos
  for insert
  with check (
    auth_tiene_perfil()
    and exists (select 1 from colaboradores c where c.nombre = planilla_pagos.colaborador and c.tipo = 'campo')
  );

create policy "usuarios con perfil editan pagos de Campo" on planilla_pagos
  for update
  using (
    auth_tiene_perfil()
    and exists (select 1 from colaboradores c where c.nombre = planilla_pagos.colaborador and c.tipo = 'campo')
  )
  with check (
    auth_tiene_perfil()
    and exists (select 1 from colaboradores c where c.nombre = planilla_pagos.colaborador and c.tipo = 'campo')
  );

create policy "usuarios con perfil eliminan pagos de Campo" on planilla_pagos
  for delete
  using (
    auth_tiene_perfil()
    and exists (select 1 from colaboradores c where c.nombre = planilla_pagos.colaborador and c.tipo = 'campo')
  );
