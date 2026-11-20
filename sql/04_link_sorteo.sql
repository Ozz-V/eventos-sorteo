-- =====================================================================
-- PASO 4 - LINK COMPARTIDO DEL SORTEO (valido 15 minutos, sin login)
--
-- QUE HACE:
--   * Crea 1 tabla NUEVA: raffle_share_links (los links generados y su vencimiento).
--   * Crea 2 funciones NUEVAS para el publico (con un link valido):
--       public_raffle_by_link(token)  -> nombre del sorteo y participantes habilitados
--       public_raffle_draw(token)     -> el SERVIDOR elige el ganador al azar y lo guarda
-- QUE NO HACE: no modifica ni borra ninguna tabla, dato o permiso existente.
-- Privacidad: con el link solo se ve nombre, empresa y los ultimos 3 digitos del telefono.
-- Requiere haber ejecutado 03_sorteos.sql. Se puede ejecutar mas de una vez.
-- =====================================================================

create table if not exists public.raffle_share_links (
  token       text primary key
              default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  raffle_id   uuid not null references public.raffles(id) on delete cascade,
  created_by  text default (auth.jwt() ->> 'email'),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '15 minutes')
);
create index if not exists raffle_share_links_raffle_idx on public.raffle_share_links (raffle_id);

alter table public.raffle_share_links enable row level security;
drop policy if exists raffle_share_links_admin on public.raffle_share_links;
create policy raffle_share_links_admin on public.raffle_share_links
  for all to authenticated using (public.is_event_admin()) with check (public.is_event_admin());
revoke all on public.raffle_share_links from anon;
grant select, insert, update, delete on public.raffle_share_links to authenticated;

-- Telefono enmascarado para el publico: "••• 456"
create or replace function public.mask_phone(p text)
returns text
language sql
immutable
as $$
  select case
    when length(regexp_replace(coalesce(p, ''), '\D', '', 'g')) >= 3
      then '••• ' || right(regexp_replace(p, '\D', '', 'g'), 3)
    else ''
  end;
$$;

-- Datos del sorteo para un link valido
create or replace function public.public_raffle_by_link(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  l public.raffle_share_links%rowtype;
  r public.raffles%rowtype;
begin
  select * into l from public.raffle_share_links where token = p_token;
  if not found then return jsonb_build_object('ok', false, 'code', 'invalid'); end if;
  if l.expires_at <= now() then return jsonb_build_object('ok', false, 'code', 'expired'); end if;

  select * into r from public.raffles where id = l.raffle_id;
  if not found or r.status <> 'activo' then return jsonb_build_object('ok', false, 'code', 'invalid'); end if;

  return jsonb_build_object(
    'ok', true,
    'name', r.name,
    'event_name', (select e.name from public.events e where e.id = r.event_id),
    'expires_at', l.expires_at,
    'server_now', now(),
    'remove_winners', r.remove_winners,
    'participants', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'nombre', p.nombre, 'empresa', p.empresa,
               'telefono', public.mask_phone(p.telefono))
             order by p.created_at)
      from public.raffle_participants p
      where p.raffle_id = r.id
        and (not r.remove_winners
             or not exists (select 1 from public.raffle_winners w where w.participant_id = p.id))
    ), '[]'::jsonb)
  );
end;
$$;

-- Sortear con un link valido: el servidor elige al azar y guarda el ganador
create or replace function public.public_raffle_draw(p_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  l public.raffle_share_links%rowtype;
  r public.raffles%rowtype;
  p public.raffle_participants%rowtype;
  v_count int;
begin
  select * into l from public.raffle_share_links where token = p_token;
  if not found then return jsonb_build_object('ok', false, 'code', 'invalid'); end if;
  if l.expires_at <= now() then return jsonb_build_object('ok', false, 'code', 'expired'); end if;

  select * into r from public.raffles where id = l.raffle_id;
  if not found or r.status <> 'activo' then return jsonb_build_object('ok', false, 'code', 'invalid'); end if;

  -- Un sorteo a la vez por sorteo (evita dos ganadores simultaneos)
  perform pg_advisory_xact_lock(hashtext('raffle:' || r.id::text));

  select count(*) into v_count
  from public.raffle_participants x
  where x.raffle_id = r.id
    and (not r.remove_winners
         or not exists (select 1 from public.raffle_winners w where w.participant_id = x.id));
  if v_count < 2 then return jsonb_build_object('ok', false, 'code', 'empty'); end if;

  select * into p
  from public.raffle_participants x
  where x.raffle_id = r.id
    and (not r.remove_winners
         or not exists (select 1 from public.raffle_winners w where w.participant_id = x.id))
  order by gen_random_uuid()
  limit 1;

  insert into public.raffle_winners (raffle_id, participant_id, nombre, telefono, empresa, drawn_by)
  values (r.id, p.id, p.nombre, p.telefono, p.empresa, 'link compartido');

  return jsonb_build_object(
    'ok', true,
    'participant_id', p.id,
    'nombre', p.nombre,
    'empresa', p.empresa,
    'telefono', public.mask_phone(p.telefono)
  );
end;
$$;

revoke all on function public.public_raffle_by_link(text) from public;
revoke all on function public.public_raffle_draw(text) from public;
grant execute on function public.public_raffle_by_link(text) to anon, authenticated;
grant execute on function public.public_raffle_draw(text)    to anon, authenticated;
grant execute on function public.mask_phone(text)            to anon, authenticated;
