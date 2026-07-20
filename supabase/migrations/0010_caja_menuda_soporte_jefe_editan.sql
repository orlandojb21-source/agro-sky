-- Agro Sky — migracion 0010: solo soporte y jefe editan Caja Menuda
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Administrador puede seguir viendo Caja Menuda (saldo, movimientos, vista
-- previa) pero ya no puede registrar ni eliminar gastos, reposiciones,
-- previstos ni arqueos -- mismo criterio que la exclusion de administrador
-- en Usuarios (migracion 0004).

create function auth_es_soporte_o_jefe()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.perfiles where id = auth.uid() and rol in ('soporte', 'jefe')
  );
$$;

drop policy "usuarios con perfil administran reposiciones" on caja_reposiciones;
drop policy "usuarios con perfil administran previstos" on caja_previstos;
drop policy "usuarios con perfil administran gastos" on caja_gastos;
drop policy "usuarios con perfil administran arqueos" on caja_arqueos;

create policy "usuarios con perfil ven reposiciones" on caja_reposiciones
  for select using (auth_tiene_perfil());
create policy "soporte y jefe escriben reposiciones" on caja_reposiciones
  for insert with check (auth_es_soporte_o_jefe());
create policy "soporte y jefe actualizan reposiciones" on caja_reposiciones
  for update using (auth_es_soporte_o_jefe()) with check (auth_es_soporte_o_jefe());
create policy "soporte y jefe eliminan reposiciones" on caja_reposiciones
  for delete using (auth_es_soporte_o_jefe());

create policy "usuarios con perfil ven previstos" on caja_previstos
  for select using (auth_tiene_perfil());
create policy "soporte y jefe escriben previstos" on caja_previstos
  for insert with check (auth_es_soporte_o_jefe());
create policy "soporte y jefe actualizan previstos" on caja_previstos
  for update using (auth_es_soporte_o_jefe()) with check (auth_es_soporte_o_jefe());
create policy "soporte y jefe eliminan previstos" on caja_previstos
  for delete using (auth_es_soporte_o_jefe());

create policy "usuarios con perfil ven gastos" on caja_gastos
  for select using (auth_tiene_perfil());
create policy "soporte y jefe escriben gastos" on caja_gastos
  for insert with check (auth_es_soporte_o_jefe());
create policy "soporte y jefe actualizan gastos" on caja_gastos
  for update using (auth_es_soporte_o_jefe()) with check (auth_es_soporte_o_jefe());
create policy "soporte y jefe eliminan gastos" on caja_gastos
  for delete using (auth_es_soporte_o_jefe());

create policy "usuarios con perfil ven arqueos" on caja_arqueos
  for select using (auth_tiene_perfil());
create policy "soporte y jefe escriben arqueos" on caja_arqueos
  for insert with check (auth_es_soporte_o_jefe());
create policy "soporte y jefe actualizan arqueos" on caja_arqueos
  for update using (auth_es_soporte_o_jefe()) with check (auth_es_soporte_o_jefe());
create policy "soporte y jefe eliminan arqueos" on caja_arqueos
  for delete using (auth_es_soporte_o_jefe());
