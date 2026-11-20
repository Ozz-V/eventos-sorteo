-- =====================================================================
-- PASO 1A - FUNCIONES PARA EL FORMULARIO PUBLICO Y LA LISTA COMPARTIDA
--
-- QUE HACE: crea 6 funciones NUEVAS (no existe ninguna con estos nombres).
-- QUE NO HACE: no borra nada, no modifica ninguna tabla, columna, dato,
--   politica ni permiso existente. Las funciones solo LEEN eventos/turnos
--   y la de inscripcion agrega una fila en registrations (igual que hoy
--   hace el formulario).
-- Se puede volver atras con el bloque comentado al final.
-- =====================================================================

create or replace function public.event_deadline_passed(p_deadline text)
returns boolean
language sql
stable
set search_path = public
as $$
  select case
    when p_deadline is null or p_deadline = '' then true
    when length(p_deadline) = 10
      then now() >= ((p_deadline::date + 1)::timestamp at time zone 'America/Asuncion')
    else now() > p_deadline::timestamptz
  end;
$$;

create or replace function public.public_event_json(e public.events)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  -- Lista blanca de columnas publicas (si alguna no existe, queda en null)
  select jsonb_build_object(
    'id', j->'id', 'name', j->'name', 'type', j->'type', 'date', j->'date',
    'time', j->'time', 'end_time', j->'end_time', 'extra_times', j->'extra_times',
    'pauses', j->'pauses', 'location', j->'location', 'location_link', j->'location_link',
    'description', j->'description', 'banner_url', j->'banner_url',
    'max_capacity', j->'max_capacity', 'status', j->'status',
    'registration_deadline', j->'registration_deadline'
  )
  from (select to_jsonb(e) as j) x;
$$;

create or replace function public.public_event_shifts_json(p_event_id public.events.id%type)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', s.id, 'name', s.name, 'date', s.date,
           'start_time', s.start_time, 'end_time', s.end_time)
         order by s.date asc nulls last, s.start_time asc), '[]'::jsonb)
  from public.event_shifts s
  where s.event_id = p_event_id;
$$;

create or replace function public.public_get_event(p_event_id public.events.id%type)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  e       public.events%rowtype;
  v_today date := (now() at time zone 'America/Asuncion')::date;
  v_cap   int;
  v_count int;
  v_state text := 'open';
begin
  select * into e from public.events where id = p_event_id;
  if not found then return null; end if;

  v_cap := nullif(to_jsonb(e) ->> 'max_capacity', '')::numeric::int;
  select count(*) into v_count from public.registrations where event_id = e.id;

  if e.date::date < v_today
     and public.event_deadline_passed(to_jsonb(e) ->> 'registration_deadline') then
    v_state := 'expired';
  elsif coalesce(to_jsonb(e) ->> 'status', '') in ('pausado', 'eliminado') then
    v_state := 'closed';
  elsif v_cap is not null and v_cap > 0 and v_count >= v_cap then
    v_state := 'full';
  end if;

  return jsonb_build_object(
    'event', public.public_event_json(e),
    'shifts', public.public_event_shifts_json(e.id),
    'state', v_state
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 4. FORMULARIO PUBLICO: inscribirse (todas las reglas se validan aca)
-- ---------------------------------------------------------------------
create or replace function public.public_register(
  p_event_id  public.events.id%type,
  p_full_name text,
  p_email     text,
  p_phone     text,
  p_company   text default null,
  p_shift_id  public.event_shifts.id%type default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  e          public.events%rowtype;
  v_today    date := (now() at time zone 'America/Asuncion')::date;
  v_name     text := left(btrim(coalesce(p_full_name, '')), 150);
  v_email    text := left(btrim(coalesce(p_email, '')), 200);
  v_phone    text := left(btrim(coalesce(p_phone, '')), 40);
  v_digits   text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_company  text := nullif(left(btrim(coalesce(p_company, '')), 150), '');
  v_shift    public.event_shifts.id%type := p_shift_id;
  v_cap      int;
  v_count    int;
  v_short    text;
begin
  select * into e from public.events where id = p_event_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  if e.date::date < v_today
     and public.event_deadline_passed(to_jsonb(e) ->> 'registration_deadline') then
    return jsonb_build_object('ok', false, 'code', 'expired');
  end if;
  if coalesce(to_jsonb(e) ->> 'status', '') in ('pausado', 'eliminado') then
    return jsonb_build_object('ok', false, 'code', 'closed');
  end if;

  if length(v_name) < 2 then
    return jsonb_build_object('ok', false, 'code', 'invalid_name');
  end if;
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    return jsonb_build_object('ok', false, 'code', 'invalid_email');
  end if;
  if length(v_digits) < 8 or length(v_digits) > 15 then
    return jsonb_build_object('ok', false, 'code', 'invalid_phone');
  end if;

  -- Evita que dos personas tomen el ultimo cupo al mismo tiempo
  perform pg_advisory_xact_lock(hashtext('reg:' || e.id::text));

  if exists (select 1 from public.event_shifts where event_id = e.id) then
    if v_shift is null then
      return jsonb_build_object('ok', false, 'code', 'shift_required');
    end if;
    if not exists (select 1 from public.event_shifts where id = v_shift and event_id = e.id) then
      return jsonb_build_object('ok', false, 'code', 'invalid_shift');
    end if;
    -- Cupo por turno (si el turno tiene max_capacity cargado)
    select nullif(to_jsonb(s) ->> 'max_capacity', '')::numeric::int into v_cap
      from public.event_shifts s where s.id = v_shift;
    if v_cap is not null and v_cap > 0
       and (select count(*) from public.registrations where shift_id = v_shift) >= v_cap then
      return jsonb_build_object('ok', false, 'code', 'shift_full');
    end if;
  else
    v_shift := null;
  end if;

  if exists (
    select 1 from public.registrations r
    where r.event_id = e.id
      and ( lower(btrim(coalesce(r.email, ''))) = lower(v_email)
            or regexp_replace(coalesce(r.phone, ''), '\D', '', 'g') = v_digits )
  ) then
    return jsonb_build_object('ok', false, 'code', 'duplicate');
  end if;

  v_cap := nullif(to_jsonb(e) ->> 'max_capacity', '')::numeric::int;
  if v_cap is not null and v_cap > 0 then
    select count(*) into v_count from public.registrations where event_id = e.id;
    if v_count >= v_cap then
      return jsonb_build_object('ok', false, 'code', 'full');
    end if;
  end if;

  loop
    v_short := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.registrations where short_id = v_short);
  end loop;

  insert into public.registrations
    (event_id, short_id, first_name, email, phone, company, shift_id, status, registered_at)
  values
    (e.id, v_short, v_name, v_email, v_phone, v_company, v_shift, 'pendiente', now());

  return jsonb_build_object('ok', true, 'short_id', v_short);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'duplicate');
end;
$$;

-- ---------------------------------------------------------------------
-- 5. LISTA PUBLICA COMPARTIDA (link "Compartir lista")
--    Devuelve solo los inscriptos de ESE evento. Eventos en papelera no se muestran.
-- ---------------------------------------------------------------------
create or replace function public.public_get_lista(p_event_id public.events.id%type)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  e public.events%rowtype;
begin
  select * into e from public.events where id = p_event_id;
  if not found or coalesce(to_jsonb(e) ->> 'status', '') = 'eliminado' then return null; end if;

  return jsonb_build_object(
    'event', public.public_event_json(e),
    'shifts', public.public_event_shifts_json(e.id),
    'registrations', coalesce((
      select jsonb_agg(jsonb_build_object(
               'first_name', r.first_name, 'phone', r.phone, 'company', r.company,
               'email', r.email, 'status', r.status, 'registered_at', r.registered_at,
               'shift_id', r.shift_id)
             order by r.registered_at asc)
      from public.registrations r
      where r.event_id = e.id
    ), '[]'::jsonb)
  );
end;
$$;

-- Permisos de ejecucion
revoke all on function public.public_event_json(public.events) from public, anon, authenticated;
revoke all on function public.public_event_shifts_json from public, anon, authenticated;
grant execute on function public.public_get_event  to anon, authenticated;
grant execute on function public.public_register   to anon, authenticated;
grant execute on function public.public_get_lista  to anon, authenticated;
grant execute on function public.event_deadline_passed to anon, authenticated;

-- ---------------------------------------------------------------------
-- (Solo si alguna vez queres quitar estas funciones. NO ejecutar ahora.)
-- drop function public.public_get_lista; drop function public.public_register;
-- drop function public.public_get_event; drop function public.public_event_shifts_json;
-- drop function public.public_event_json; drop function public.event_deadline_passed;
