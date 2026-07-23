# Cambios de organización del sitio

## Sistema compartido

- Unificación de paleta, tipografía, encabezados, navegación, botones y pies de página.
- Separación de estilos por función: portada, cursos, exploraciones, herramientas y publicaciones.
- Eliminación de estilos globales duplicados dentro de las páginas.
- Conservación de estilos particulares únicamente cuando responden a la función de una herramienta.

## Portada

- Conservación del crecimiento espacial dentro de la circunferencia.
- Separación del algoritmo en `js/home-growth.js` y del diseño en `css/home.css`.

## Cursos y talleres

- Conservación del movimiento colectivo como visualización con propósito.
- Sustitución de p5.js por Canvas y JavaScript nativos.
- Reorganización de cursos, experiencia de IA y talleres con una jerarquía más clara.

## Exploraciones

- Catálogo completo con once experiencias.
- Inclusión de Flor biomimética y Rostro de arena.
- Nueva visualización de campo continuo en el encabezado.
- Sustitución de p5.js en la portada del catálogo por Canvas nativo.

## Páginas internas

- Encabezado, navegación y pie institucional comunes.
- Colores y controles adaptados a la identidad Radix.
- Conservación del funcionamiento original de cada simulación.

## Publicaciones

- Reorganización del espacio de opinión como sección de publicaciones.
- Normalización de navegación, fechas, autoría y correo institucional.
- Corrección de rutas antiguas y enlaces rotos.

## Organización técnica

- Eliminación de scripts obsoletos sin referencias.
- Traslado de imágenes anteriores no utilizadas a `imagenes/archivo/`.
- Incorporación de `404.html`, `robots.txt`, `sitemap.xml` y `.nojekyll`.
- Validación de enlaces internos, identificadores HTML, sintaxis JavaScript y estructura CSS.


## Integración de Investigación y datos — julio de 2026

- Se añadió `investigacion.html`.
- La tercera línea de la portada ahora enlaza a Investigación y datos.
- Se añadió Investigación a la navegación y al pie de página institucional.
- Se integró el Observatorio Radix en `datos/homicidios-0-14/index.html`.
- Se actualizó `sitemap.xml`.
- La consulta conserva `noindex,follow` y estado preliminar.


## Integración investigación y datos v1.2

- Se añadió `data/embedded-data.js` para evitar fallos de carga en Live Server.
- La consulta usa datos embebidos como fuente primaria y los JSON como respaldo.
- La página funciona también al abrir `index.html` directamente en Chrome.

## Observatorio Radix · archivo y memoria

- `investigacion.html` pasa a presentarse como **Observatorio Radix**.
- Se amplía el alcance a investigación, datos públicos, memoria y documentación.
- Se incorpora la línea **Silenciados por el Estado**.
- Se añaden presentación, criterios, 29 biografías de trabajo y una página de fuentes y referencias.
- El archivo permanece en estado editorial de desarrollo y con `noindex,follow`.
- Se conservan los documentos Markdown base dentro de `archivo/silenciados-por-el-estado/documentos/`.

## Silenciados por el Estado · serie documental completa v2

- Se revisaron los 29 perfiles con prioridad a fuentes judiciales, comisiones de la verdad, archivos públicos, organismos internacionales y documentos estatales.
- Se registraron 61 referencias documentales en `data/fuentes.json`.
- Cada perfil distingue el grado de certeza y conserva salvedades sobre autoría, causalidad, intención o cadena de mando cuando corresponde.
- Se añadieron 29 ilustraciones editoriales originales en formato 4:5.
- Se incorporaron las imágenes al índice y a las biografías.
- Se añadió el informe `documentos/verificacion-fuentes-v2.md` y el registro técnico `imagenes/provenance.json`.
- El archivo continúa con `noindex,follow` hasta la decisión editorial de publicación definitiva.

## Silenciados por el Estado · corrección visual v2.1

- Se revisaron individualmente las 29 ilustraciones.
- Se eliminaron bandas blancas, fragmentos laterales y restos de las láminas maestras.
- Los retratos individuales se normalizaron a formato 4:5 con encuadre centrado en rostro y hombros.
- Los tres casos colectivos conservan a todas las personas sobre un fondo papel tenue.
- Se eliminaron los marcos grises de las imágenes.
- Las cuadrículas de casos y referencias dejaron de usar un fondo gris continuo, evitando bloques vacíos en filas incompletas.
- Se actualizó el registro de procedencia y los hashes de las 29 imágenes.
