-- =====================================================================
-- EMERGENCIA - VOLVER ATRAS EL PASO 2
-- Vuelve a crear exactamente las 2 politicas publicas que habia antes.
-- No toca datos. El historial y las funciones del Paso 1 se mantienen.
-- =====================================================================

create policy "Lectura publica inscripciones" on public.registrations
  as permissive for select to public using (true);

create policy "Insercion publica inscripciones" on public.registrations
  as permissive for insert to public with check (true);
