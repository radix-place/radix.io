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
