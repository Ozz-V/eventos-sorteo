-- =====================================================================
-- EMERGENCIA - VOLVER ATRAS EL PASO 2
-- Usar solo si despues del Paso 2 algo dejo de funcionar.
-- Deja las tablas abiertas como estaban antes (sin RLS). No toca datos.
-- El historial (audit_log) y las funciones del Paso 1 se mantienen.
-- =====================================================================
alter table public.events             disable row level security;
alter table public.registrations      disable row level security;
alter table public.event_shifts       disable row level security;
alter table public.event_budget_items disable row level security;
alter table public.event_admins       disable row level security;

grant select, insert, update, delete on public.events, public.registrations,
      public.event_shifts, public.event_budget_items, public.event_admins to anon, authenticated;
