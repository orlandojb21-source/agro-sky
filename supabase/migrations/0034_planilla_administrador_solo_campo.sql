-- Agro Sky — migracion 0034: administrador solo administra planilla de Campo
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Pedido explicito del usuario: el administrador ya NO puede crear, editar
-- ni eliminar pagos de colaboradores Fijos (salario quincenal) -- solo
-- puede administrar los de Campo (pago por dia). Jefe y soporte
-- (auth_gestiona_usuarios()) siguen con acceso total, sin cambios. Todos
-- los roles SIGUEN VIENDO toda la planilla sin restriccion (decision
-- explicita del usuario, no se oculta informacion, solo se bloquea la
-- accion de administrar pagos de Fijos).
--
-- planilla_pagos.colaborador es texto libre (no FK a colaboradores), asi
-- que el tipo se resuelve con un subquery por nombre -- mismo criterio que
-- ya usa el resto de la app (PagoPlanillaForm, /planilla/page.tsx) para
-- inferir el tipo de un pago.

drop policy "usuarios con perfil administran planilla" on planilla_pagos;

create policy "usuarios con perfil ven planilla" on planilla_pagos
  for select using (auth_tiene_perfil());

-- Cualquier rol con perfil (incluido administrador) puede crear/editar/
-- eliminar pagos de colaboradores de Campo.
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

-- Jefe/soporte, ademas, pueden crear/editar/eliminar pagos de CUALQUIER
-- colaborador (incluidos los Fijos) -- estas 3 politicas se suman a las de
-- arriba, no las reemplazan.
create policy "jefe/soporte crean cualquier pago" on planilla_pagos
  for insert
  with check (auth_gestiona_usuarios());

create policy "jefe/soporte editan cualquier pago" on planilla_pagos
  for update
  using (auth_gestiona_usuarios())
  with check (auth_gestiona_usuarios());

create policy "jefe/soporte eliminan cualquier pago" on planilla_pagos
  for delete
  using (auth_gestiona_usuarios());
