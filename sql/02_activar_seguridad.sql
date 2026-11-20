-- =====================================================================
-- PASO 2 - ACTIVAR LA SEGURIDAD (RLS)
-- Ejecutar SOLO despues de publicar el codigo nuevo y probar que el
-- formulario publico funciona. No borra ni modifica datos: solo define
-- quien puede ver y cambiar cada tabla.
--
-- Resultado:
--   * Publico (sin login): NO puede leer ni tocar tablas. Solo puede usar
--     public_get_event, public_register y public_get_lista.
--   * Usuario logueado que esta en event_admins: acceso completo (igual que hoy).
--   * Usuario logueado que NO es admin: no ve nada.
-- =====================================================================

-- 1) Quitar las politicas viejas de estas tablas (quedaron guardadas en el Paso 0)
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('events','registrations','event_shifts','event_budget_items','event_admins')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 2) Activar RLS
alter table public.events             enable row level security;
alter table public.registrations      enable row level security;
alter table public.event_shifts       enable row level security;
alter table public.event_budget_items enable row level security;
alter table public.event_admins       enable row level security;

-- 3) Administradores: acceso completo
create policy admin_all_events on public.events
  for all to authenticated using (public.is_event_admin()) with check (public.is_event_admin());

create policy admin_all_registrations on public.registrations
  for all to authenticated using (public.is_event_admin()) with check (public.is_event_admin());

create policy admin_all_event_shifts on public.event_shifts
  for all to authenticated using (public.is_event_admin()) with check (public.is_event_admin());

create policy admin_all_event_budget_items on public.event_budget_items
  for all to authenticated using (public.is_event_admin()) with check (public.is_event_admin());

-- Cada usuario solo puede ver SU propia fila en event_admins (asi el login comprueba si es admin).
-- Nadie puede agregar/quitar admins desde la web: se hace desde el panel de Supabase.
create policy admin_self_read on public.event_admins
  for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- 4) Permisos de tabla (doble candado ademas de RLS)
revoke all on public.events, public.registrations, public.event_shifts,
              public.event_budget_items, public.event_admins from anon;
grant select, insert, update, delete on public.events, public.registrations,
              public.event_shifts, public.event_budget_items to authenticated;
revoke insert, update, delete on public.event_admins from authenticated;
grant select on public.event_admins to authenticated;
