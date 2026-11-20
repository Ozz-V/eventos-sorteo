# Comagro Eventos

Sistema de eventos, inscripciones, check-in, presupuesto, informes y sorteos.
El código vive en este repositorio y la página de Adobe Commerce solo lo carga.

```
comagro-eventos/
├── pagina-adobe-commerce.html   ← lo que se pega en Adobe Commerce (44 líneas, ya apunta a Ozz-V/eventos-sorteo)
├── css/
│   ├── app.css                  ← estilos del panel y formularios
│   └── sorteo.css               ← estilos de la ruleta
├── js/                          ← (se cargan en este orden)
│   ├── layout.js                ← estructura HTML de todas las pantallas
│   ├── core.js                  ← conexión Supabase, arranque, navegación, utilidades
│   ├── dashboard.js
│   ├── eventos.js               ← crear / editar / duplicar / papelera
│   ├── gestion.js               ← inscriptos, check-in, carga manual, Excel
│   ├── presupuesto.js
│   ├── reportes.js              ← informes, gráficos, PDF, pausar inscripciones
│   ├── publico.js               ← formulario de inscripción y lista compartida
│   ├── sorteo-rapido.js
│   └── sorteo.js                ← ruleta
└── sql/
    ├── 00_diagnostico.sql       ← solo lectura: foto de cómo está todo
    ├── 01_funciones_y_historial.sql
    ├── 02_activar_seguridad.sql
    ├── 99_volver_atras.sql      ← emergencia
    └── recuperar_datos.sql      ← restaurar algo borrado
```

---

## Instalación paso a paso (hacerlo en este orden)

### Paso 0 — Respaldo (5 minutos, no saltear)

1. En **Supabase → Table Editor**, abrir cada tabla (`events`, `registrations`, `event_shifts`, `event_budget_items`, `event_admins`) y usar **Export → Export to CSV**. Guardar los archivos.
2. En **Supabase → SQL Editor**, pegar `sql/00_diagnostico.sql` y ejecutar (**Run**). Copiar los resultados a un archivo de texto. Fijarse en dos cosas:
   - Que **tu correo** aparezca en `event_admins`.
   - Anotar la cantidad de registros de cada tabla (sirve para comprobar al final que no se perdió nada).

### Paso 1 — Subir el código a GitHub

1. Crear una cuenta en github.com (si no tenés) y un repositorio nuevo llamado **`comagro-eventos`**, marcado como **Public** (jsDelivr solo sirve repositorios públicos; el código igual ya es visible hoy en la página).
2. En el repositorio: **Add file → Upload files** y arrastrar **todo el contenido** de esta carpeta (las carpetas `css`, `js`, `sql` y los archivos sueltos). **Commit changes**.
3. Crear la versión: **Releases → Create a new release → Choose a tag** → escribir `v1.0.0` → **Create new tag** → **Publish release**.
4. Comprobar que funciona: abrir en el navegador (cambiando TU-USUARIO por tu usuario de GitHub)
   `https://cdn.jsdelivr.net/gh/TU-USUARIO/comagro-eventos@v1.0.0/js/core.js`
   Tiene que mostrarse el código. Si da error, esperar 1–2 minutos y reintentar.

### Paso 2 — Funciones seguras en Supabase

En **SQL Editor**, pegar `sql/01_funciones_y_historial.sql` y ejecutar.
Esto **no cambia permisos ni datos**: la página actual sigue funcionando igual.
Agrega las funciones del formulario público y el **historial anti-pérdida**.

### Paso 3 — Reemplazar la página en Adobe Commerce

1. Abrir `pagina-adobe-commerce.html` con un editor de texto (Bloc de notas, VS Code).
2. (Ya está configurado para `Ozz-V/eventos-sorteo`, no hay que reemplazar nada.)
3. En Adobe Commerce: **Content → Pages →** tu página de eventos → **Edit**.
4. Borrar todo el contenido actual y pegar el contenido del archivo:
   - Con Page Builder: usar un elemento **HTML Code** y pegar ahí.
   - Sin Page Builder: botón **Show / Hide Editor** para pasar a modo HTML y pegar.
5. **Save**. Si no ves los cambios: **System → Cache Management → Flush Magento Cache**.

> Guardá una copia del HTML viejo antes de borrarlo, por si querés volver.

### Paso 4 — Probar (todavía sin la seguridad nueva)

- [ ] Entrar al panel con tu usuario → se ve el Dashboard con los eventos.
- [ ] Gestionar un evento → se ven los inscriptos, el check-in funciona.
- [ ] Copiar el **link de inscripción** y abrirlo en una **ventana de incógnito** → inscribirse con datos de prueba → "Registro completado".
- [ ] Inscribirse otra vez con el mismo correo → avisa que ya está registrado.
- [ ] **Compartir lista** → abrir en incógnito → se ve la lista.
- [ ] Sorteo de un evento y Sorteo rápido.

### Paso 5 — Activar la seguridad

En **SQL Editor**, pegar `sql/02_activar_seguridad.sql` y ejecutar.
Solo quita las 2 políticas que dejaban a cualquiera leer y crear inscripciones sin login. No toca nada de la app móvil ni de usuarios logueados.
**Repetir todas las pruebas del Paso 4** (las de incógnito son las importantes).
Al final, ejecutar de nuevo la parte 6 de `00_diagnostico.sql` y comparar las cantidades con las del Paso 0.

### Si algo falla después del Paso 5

Ejecutar `sql/99_volver_atras.sql`. Vuelve a crear las 2 políticas públicas exactamente como estaban, **sin tocar datos**. Después me pasás el error y lo vemos.

---

## Cómo publicar cambios en el futuro

1. Editar el archivo en GitHub (ícono del lápiz) → **Commit changes**.
2. **Releases → Create a new release** → tag nuevo: `v1.0.1`, `v1.0.2`…
3. En Adobe Commerce, en la página: buscar `@v1.0.0` y reemplazar por la versión nueva → Save.

Si algo sale mal, volvés a poner el número de versión anterior y queda como antes.
(No uses `@main` en lugar del número: jsDelivr guarda copias por horas y los cambios tardan en verse.)

## Cómo agregar o quitar administradores

**Supabase → Table Editor → `event_admins`** → agregar o borrar la fila con el correo.
Desde la web nadie puede hacerse administrador.

## Cómo recuperar algo borrado

Ver `sql/recuperar_datos.sql`. Cada alta, cambio o borrado de eventos, inscriptos, turnos y gastos queda copiado en la tabla `audit_log` con fecha y correo de quién lo hizo.

---

## Qué cambió en seguridad

| Antes | Ahora |
|---|---|
| Cualquiera con la clave pública (visible en la página) podía leer **todos** los inscriptos de **todos** los eventos (nombres, correos, teléfonos) y también modificarlos o borrarlos. | Sin login no se puede leer ni tocar ninguna tabla. El público solo puede usar 3 funciones controladas. |
| Cupos, duplicados, fechas y turnos se controlaban solo en el navegador (se podían saltear). | Se validan en el servidor. Dos personas no pueden tomar el último cupo al mismo tiempo. |
| Si se borraba algo, no había forma de recuperarlo. | Historial completo en `audit_log`, con quién y cuándo. |
| Al editar un evento con turnos, se borraban y recreaban todos los turnos: los inscriptos perdían su turno (o se borraban, si la base tenía borrado en cascada). | Los turnos se actualizan conservando su ID. Si querés quitar un turno con inscriptos, pide confirmación y los inscriptos quedan "Sin turno", nunca se borran. |
| Un nombre malicioso en el formulario (código HTML) se ejecutaba al abrir el panel o la lista. | Todo texto se muestra como texto. |

Arreglos menores incluidos: el formulario se colgaba cuando el evento estaba pausado; el filtro "Solo presentes / pendientes" del Excel se ignoraba; el cierre de inscripciones usaba la fecha UTC en vez de la de Paraguay; el borrado definitivo no borraba los turnos.

## Recomendaciones

- **Supabase → Authentication → Sign In / Providers**: si los usuarios del panel se crean a mano, desactivar **"Allow new users to sign up"**.
- **Base compartida:** este Supabase también lo usa la app móvil. Hoy cualquier usuario logueado con perfil completo (no solo admins) puede leer todos los inscriptos (política "Lectura de registros a usuarios autenticados"). No se cambió para no romper la app; revisarlo si no es necesario.
- **Presupuesto:** la política "Anyone can read events" permite que cualquiera lea la tabla `events`, incluida la columna `budget`. No se cambió por si otra app la usa sin login.
- La **lista compartida** sigue mostrando correo y teléfono a quien tenga el link (igual que antes). Si querés ocultar esos datos, se cambia en `public_get_lista` (archivo `01`).
- La clave `SUPABASE_KEY` de `core.js` es la clave pública (anon): está bien que sea visible. **Nunca** poner ahí la clave `service_role`.
