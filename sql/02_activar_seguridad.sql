-- =====================================================================
-- PASO 2 - CERRAR EL ACCESO PUBLICO A LOS INSCRIPTOS
-- Ejecutar SOLO despues de publicar la pagina nueva en Adobe Commerce
-- y probar que el formulario publico funciona (en incognito).
--
-- Ajustado a este proyecto (base compartida con la app movil):
--   * Se quitan UNICAMENTE las 2 politicas que dejaban a cualquiera
--     (sin login) LEER todos los inscriptos y CREAR inscripciones directas.
--   * No se toca nada de usuarios logueados (app movil, escaner, admins).
--   * El formulario y la lista publica pasan a usar las funciones del Paso 1.
-- No borra ni modifica datos.
-- =====================================================================

drop policy if exists "Lectura publica inscripciones"  on public.registrations;
drop policy if exists "Insercion publica inscripciones" on public.registrations;
