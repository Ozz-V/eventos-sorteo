# Eventos

Sistema de eventos, inscripciones, check-in, presupuesto, informes y sorteos.
El código vive en este repositorio y la página de Adobe Commerce solo lo carga.

```
eventos/
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
│   ├── sorteos.js               ← sorteos guardados: participantes y ganadores
│   └── sorteo.js                ← ruleta
└── sql/
    ├── 00_diagnostico.sql       ← solo lectura: foto de cómo está todo
    ├── 01a_funciones.sql        ← funciones del formulario y la lista (ya ejecutado)
    ├── 01b_historial_opcional.sql ← historial anti-perdida (ya ejecutado)
    ├── 02_activar_seguridad.sql ← cierra el acceso publico (ya ejecutado)
    ├── 03_sorteos.sql           ← tablas de sorteos
    ├── 04_link_sorteo.sql       ← link compartido del sorteo (15 min, sin login)
    ├── 99_volver_atras.sql      ← emergencia
    └── recuperar_datos.sql      ← restaurar algo borrado
```

---
