-- Agro Sky — migración 0060: rrhh_contabilidad gestiona pagos de Fijos
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Único punto de este rediseño de roles que sí toca RLS (confirmado con
-- el usuario): el candado real de "solo jefe/soporte gestionan pagos de
-- colaboradores Fijos" vive en RLS, no en el código de la app (ver
-- migraciones 0034/0049 -- las políticas de "cualquier colaborador
-- incluido Fijo" solo aplican bajo auth_gestiona_usuarios(), el mismo
-- helper que protege Usuarios). No se puede dar este permiso a
-- rrhh_contabilidad ampliando auth_gestiona_usuarios() porque ese helper
-- NO debe crecer -- seguiría sin acceso a Usuarios, correcto -- así que
-- hace falta un helper aparte, específico para esto.
--
-- Las políticas de jefe/soporte de la 0034 NO se tocan -- estas se suman,
-- mismo criterio que ya usó la 0049.
create function auth_gestiona_pagos_fijos()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and rol in ('soporte', 'jefe', 'rrhh_contabilidad')
  );
$$;

create policy "rrhh_contabilidad crea cualquier pago" on planilla_pagos
  for insert
  with check (auth_gestiona_pagos_fijos());

create policy "rrhh_contabilidad edita cualquier pago" on planilla_pagos
  for update
  using (auth_gestiona_pagos_fijos())
  with check (auth_gestiona_pagos_fijos());

create policy "rrhh_contabilidad elimina cualquier pago" on planilla_pagos
  for delete
  using (auth_gestiona_pagos_fijos());
