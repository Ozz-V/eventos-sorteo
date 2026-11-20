-- =====================================================================
-- PASO 1B - HISTORIAL ANTI-PERDIDA (OPCIONAL, recomendado)
--
-- QUE HACE: crea una tabla NUEVA "audit_log" y le agrega a las tablas
--   events, registrations, event_shifts y event_budget_items un "aviso"
--   (trigger) que copia cada alta/cambio/borrado en audit_log.
-- QUE NO HACE: no modifica columnas, datos, politicas ni permisos de
--   esas tablas. Lo que ya existe sigue funcionando igual.
-- Los "drop trigger if exists" solo afectan a estos avisos nuevos
--   (todavia no existen) y sirven para poder ejecutarlo dos veces.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 2. HISTORIAL: guarda una copia de cada alta, cambio o borrado.
--    Si algo se borra por error, se puede recuperar desde aca.
-- ---------------------------------------------------------------------
create table if not exists public.audit_log (
  id          bigserial primary key,
  table_name  text        not null,
  action      text        not null,          -- INSERT / UPDATE / DELETE
  row_id      text,
  old_data    jsonb,                          -- como estaba antes
  new_data    jsonb,                          -- como quedo despues
  changed_by  text,                           -- correo de quien lo hizo
  changed_at  timestamptz not null default now()
);
create index if not exists audit_log_table_row_idx on public.audit_log (table_name, row_id);
create index if not exists audit_log_changed_at_idx on public.audit_log (changed_at desc);

create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (table_name, action, row_id, old_data, new_data, changed_by)
  values (
    tg_table_name,
    tg_op,
    coalesce(
      case when tg_op <> 'INSERT' then to_jsonb(old) ->> 'id' end,
      case when tg_op <> 'DELETE' then to_jsonb(new) ->> 'id' end
    ),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end,
    coalesce(auth.jwt() ->> 'email', 'publico')
  );
  return null;
end;
$$;

drop trigger if exists audit_events on public.events;
create trigger audit_events after insert or update or delete on public.events
  for each row execute function public.audit_trigger();

drop trigger if exists audit_registrations on public.registrations;
create trigger audit_registrations after insert or update or delete on public.registrations
  for each row execute function public.audit_trigger();

drop trigger if exists audit_event_shifts on public.event_shifts;
create trigger audit_event_shifts after insert or update or delete on public.event_shifts
  for each row execute function public.audit_trigger();

drop trigger if exists audit_event_budget_items on public.event_budget_items;
create trigger audit_event_budget_items after insert or update or delete on public.event_budget_items
  for each row execute function public.audit_trigger();

-- El historial solo lo pueden leer administradores; nadie lo puede editar desde la web.
alter table public.audit_log enable row level security;
drop policy if exists audit_log_admin_read on public.audit_log;
create policy audit_log_admin_read on public.audit_log
  for select to authenticated using (public.is_event_admin());
revoke all on public.audit_log from anon;
revoke insert, update, delete on public.audit_log from authenticated;
grant select on public.audit_log to authenticated;

-- ---------------------------------------------------------------------
-- (Para quitar el historial alguna vez. NO ejecutar ahora.)
-- drop trigger audit_events on public.events;
-- drop trigger audit_registrations on public.registrations;
-- drop trigger audit_event_shifts on public.event_shifts;
-- drop trigger audit_event_budget_items on public.event_budget_items;
