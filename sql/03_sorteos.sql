-- =====================================================================
-- PASO 3 - SORTEOS CON HISTORIAL
--
-- QUE HACE: crea 3 tablas NUEVAS para guardar los sorteos:
--   raffles              -> cada sorteo (nombre, evento opcional, fecha)
--   raffle_participants  -> los participantes de cada sorteo
--   raffle_winners       -> cada ganador, con fecha y hora
-- QUE NO HACE: no modifica ni borra ninguna tabla, columna, dato o
--   permiso existente. Solo las crea al lado de las que ya tenes.
--   (raffles.event_id apunta a events solo como referencia: si un evento
--    se borra, el sorteo queda guardado igual, sin evento.)
-- Solo los correos de event_admins pueden ver y usar los sorteos.
-- Se puede ejecutar mas de una vez sin problema.
-- =====================================================================

create table if not exists public.raffles (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (length(btrim(name)) > 0),
  event_id        uuid references public.events(id) on delete set null,
  remove_winners  boolean not null default true,
  status          text not null default 'activo' check (status in ('activo', 'archivado')),
  created_by      text default (auth.jwt() ->> 'email'),
  created_at      timestamptz not null default now()
);

create table if not exists public.raffle_participants (
  id               uuid primary key default gen_random_uuid(),
  raffle_id        uuid not null references public.raffles(id) on delete cascade,
  nombre           text not null check (length(btrim(nombre)) > 0),
  telefono         text,
  empresa          text,
  registration_id  uuid,            -- si vino de la lista de inscriptos de un evento
  created_at       timestamptz not null default now()
);
create index if not exists raffle_participants_raffle_idx on public.raffle_participants (raffle_id);

create table if not exists public.raffle_winners (
  id              uuid primary key default gen_random_uuid(),
  raffle_id       uuid not null references public.raffles(id) on delete cascade,
  participant_id  uuid references public.raffle_participants(id) on delete set null,
  nombre          text not null,
  telefono        text,
  empresa         text,
  won_at          timestamptz not null default now(),
  drawn_by        text default (auth.jwt() ->> 'email')
);
create index if not exists raffle_winners_raffle_idx on public.raffle_winners (raffle_id);

-- Seguridad: solo administradores de eventos
alter table public.raffles             enable row level security;
alter table public.raffle_participants enable row level security;
alter table public.raffle_winners      enable row level security;

drop policy if exists raffles_admin on public.raffles;
create policy raffles_admin on public.raffles
  for all to authenticated using (public.is_event_admin()) with check (public.is_event_admin());

drop policy if exists raffle_participants_admin on public.raffle_participants;
create policy raffle_participants_admin on public.raffle_participants
  for all to authenticated using (public.is_event_admin()) with check (public.is_event_admin());

drop policy if exists raffle_winners_admin on public.raffle_winners;
create policy raffle_winners_admin on public.raffle_winners
  for all to authenticated using (public.is_event_admin()) with check (public.is_event_admin());

revoke all on public.raffles, public.raffle_participants, public.raffle_winners from anon;
grant select, insert, update, delete on public.raffles, public.raffle_participants, public.raffle_winners to authenticated;

-- Historial anti-perdida (usa el aviso del paso 1B, que ya esta activo)
drop trigger if exists audit_raffles on public.raffles;
create trigger audit_raffles after insert or update or delete on public.raffles
  for each row execute function public.audit_trigger();
drop trigger if exists audit_raffle_participants on public.raffle_participants;
create trigger audit_raffle_participants after insert or update or delete on public.raffle_participants
  for each row execute function public.audit_trigger();
drop trigger if exists audit_raffle_winners on public.raffle_winners;
create trigger audit_raffle_winners after insert or update or delete on public.raffle_winners
  for each row execute function public.audit_trigger();
