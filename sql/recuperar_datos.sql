-- =====================================================================
-- RECUPERAR DATOS DESDE EL HISTORIAL (audit_log)
-- Ejecutar por partes, segun lo que necesites.
-- =====================================================================

-- Ver los ultimos 100 cambios
select id, changed_at, changed_by, table_name, action, row_id,
       coalesce(old_data ->> 'first_name', old_data ->> 'name', new_data ->> 'first_name', new_data ->> 'name') as descripcion
from public.audit_log
order by changed_at desc
limit 100;

-- Ver inscriptos BORRADOS en los ultimos 7 dias
select id, changed_at, changed_by, old_data ->> 'first_name' as nombre, old_data ->> 'email' as email, old_data ->> 'event_id' as evento
from public.audit_log
where table_name = 'registrations' and action = 'DELETE' and changed_at > now() - interval '7 days'
order by changed_at desc;

-- RESTAURAR un inscripto borrado (reemplazar 123 por el "id" del historial)
-- insert into public.registrations
-- select (jsonb_populate_record(null::public.registrations, old_data)).*
-- from public.audit_log where id = 123;

-- RESTAURAR un evento borrado definitivamente y todos sus inscriptos/turnos/gastos
-- (reemplazar 'ID-DEL-EVENTO' por el id del evento). Restaurar primero el evento:
-- insert into public.events
-- select (jsonb_populate_record(null::public.events, old_data)).*
-- from public.audit_log where table_name = 'events' and action = 'DELETE' and row_id = 'ID-DEL-EVENTO'
-- order by changed_at desc limit 1;
-- insert into public.event_shifts
-- select (jsonb_populate_record(null::public.event_shifts, old_data)).*
-- from public.audit_log where table_name = 'event_shifts' and action = 'DELETE' and old_data ->> 'event_id' = 'ID-DEL-EVENTO';
-- insert into public.registrations
-- select (jsonb_populate_record(null::public.registrations, old_data)).*
-- from public.audit_log where table_name = 'registrations' and action = 'DELETE' and old_data ->> 'event_id' = 'ID-DEL-EVENTO';
-- insert into public.event_budget_items
-- select (jsonb_populate_record(null::public.event_budget_items, old_data)).*
-- from public.audit_log where table_name = 'event_budget_items' and action = 'DELETE' and old_data ->> 'event_id' = 'ID-DEL-EVENTO';
