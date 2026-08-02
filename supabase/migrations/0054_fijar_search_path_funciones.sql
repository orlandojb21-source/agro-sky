-- Agro Sky — migración 0054: fijar search_path en funciones SECURITY DEFINER
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Hallazgo del informe de seguridad (SECURITY_REVIEW.md, sección 1.2):
-- ninguna de las funciones "security definer" del esquema fija su propio
-- search_path -- el linter de Supabase lo marca como "Function Search
-- Path Mutable" (CWE-427). Una función security definer corre con los
-- privilegios de quien la creó, pero resuelve nombres de tabla sin
-- calificar (ej. "insert into proyecto_informes", no
-- "insert into public.proyecto_informes") según el search_path de quien
-- LLAMA la función -- si ese search_path se pudiera manipular, en teoría
-- se podría "secuestrar" a qué tabla/objeto termina apuntando la función.
--
-- En vez de listar las 19 funciones a mano (riesgo real de transcribir
-- mal un tipo de parámetro y romper una función), este bloque recorre
-- pg_proc y le fija search_path=public a CUALQUIER función security
-- definer del esquema "public" que todavía no lo tenga -- no toca el
-- cuerpo de ninguna función, solo agrega esa configuración. Es seguro de
-- correr más de una vez (la condición "not exists" lo hace idempotente:
-- una función que ya tiene el search_path fijado simplemente se salta).
do $$
declare
  fn record;
begin
  for fn in
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef = true
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, '{}')) as cfg
        where cfg like 'search_path=%'
      )
  loop
    execute format('alter function public.%I(%s) set search_path = public', fn.proname, fn.args);
  end loop;
end $$;
