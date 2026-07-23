# Fundación Radix — sitio web

Versión organizada del sitio institucional de la Fundación Radix.

## Estructura

- `index.html`: portada institucional.
- `cursillos_talleres.html`: oferta de cursos y talleres.
- `scripts.html`: catálogo de exploraciones computacionales.
- `investigacion.html`: portada del Observatorio Radix para datos públicos, memoria y documentación.
- `datos/homicidios-0-14/index.html`: capa de consulta de homicidios registrados de niñas y niños de 0 a 14 años.
- `archivo/silenciados-por-el-estado/index.html`: archivo biográfico y documental con 29 perfiles.
- `archivo/silenciados-por-el-estado/criterios.html`: criterios de selección y salvedades.
- `archivo/silenciados-por-el-estado/biografias.html`: 29 perfiles con fuentes, notas de verificación e ilustraciones editoriales.
- `archivo/silenciados-por-el-estado/referencias.html`: catálogo documental de fuentes y estado de certeza por perfil.
- `opinion.html`: publicaciones y artículos.
- `css/style.css`: sistema visual global.
- `css/home.css`: portada.
- `css/courses.css`: cursos y talleres.
- `css/course-detail.css`: detalle de cursos.
- `css/explorations.css`: catálogo de exploraciones.
- `css/tool-pages.css`: base común de herramientas interactivas.
- `css/opinion.css`: publicaciones.
- `js/home-growth.js`: crecimiento espacial de la portada.
- `js/courses-boids.js`: movimiento colectivo de la página de cursos.
- `js/explorations-field.js`: campo continuo del catálogo de exploraciones.
- `imagenes/archivo/`: recursos gráficos anteriores conservados como archivo.

## Publicación

El contenido de esta carpeta puede copiarse directamente a la raíz del repositorio de GitHub Pages. No debe cambiarse la relación entre los archivos HTML y las carpetas `css`, `js`, `imagenes`, `docs` y `opinion`.

## Identidad

Paleta principal:

- Tinta Radix: `#202522`
- Papel Radix: `#F4F1E8`
- Verde Radix: `#2F6656`
- Azul Ciencia: `#315B7D`
- Terracota: `#A44F32`


## Observatorio Radix

La portada dirige a `investigacion.html`, que presenta dos líneas iniciales:

1. **Datos públicos:** consulta de homicidios registrados de niñas y niños de 0 a 14 años.
2. **Archivo y memoria:** proyecto documental `Silenciados por el Estado`.

Las páginas del archivo se mantienen con `noindex,follow` durante la revisión editorial previa a su publicación definitiva. Los 29 perfiles incluyen fuentes registradas, notas de verificación, salvedades visibles e ilustraciones editoriales. Los documentos Markdown base se conservan como materiales de trabajo.

## Consulta de datos: compatibilidad local

La capa `datos/homicidios-0-14/` incluye los datos principales en `data/embedded-data.js`. Esto evita fallos de `fetch()` y de `history.replaceState()` cuando Chrome es abierto desde VS Code, Live Server o directamente desde el sistema de archivos. Los JSON originales se conservan como respaldo y trazabilidad.
