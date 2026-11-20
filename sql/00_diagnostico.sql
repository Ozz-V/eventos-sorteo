-- =====================================================================
-- PASO 0 - DIAGNOSTICO (solo lectura, no cambia nada)
-- Ejecutar en Supabase > SQL Editor y GUARDAR el resultado (copiar a un
-- archivo de texto). Sirve para saber como estaba todo antes del cambio.
-- =====================================================================

-- 1) Politicas de seguridad actuales
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 2) Que tablas tienen RLS activado
select relname as tabla, relrowsecurity as rls_activado
from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r'
order by relname;

-- 3) Columnas y tipos de las tablas del sistema
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('events','registrations','event_shifts','event_budget_items','event_admins')
order by table_name, ordinal_position;

-- 4) Relaciones entre tablas (confdeltype: c = borra en cascada, n = pone null, a/r = impide borrar)
select conname, conrelid::regclass as tabla, confrelid::regclass as referencia, confdeltype
from pg_constraint
where contype = 'f' and connamespace = 'public'::regnamespace;

-- 5) Administradores habilitados (tu correo TIENE que estar aca)
select * from public.event_admins;

-- 6) Cantidad de registros (para comparar despues y confirmar que no se perdio nada)
select 'events' as tabla, count(*) from public.events
union all select 'registrations', count(*) from public.registrations
union all select 'event_shifts', count(*) from public.event_shifts
union all select 'event_budget_items', count(*) from public.event_budget_items;
