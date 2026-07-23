# Validación final — Observatorio Radix

**Versión:** 2.1.0  
**Fecha:** 22 de julio de 2026  
**Estado:** listo para publicación en GitHub Pages

## Corrección visual de las ilustraciones

Se revisaron individualmente las 29 ilustraciones del archivo **Silenciados por el Estado**.

- Todas quedaron en formato WebP de **1200 × 1500 px** y proporción 4:5.
- Se eliminaron bandas blancas, restos de marcos y fragmentos de tarjetas vecinas.
- Los retratos individuales se reencuadraron sobre el rostro y los hombros.
- Las Hermanas Mirabal, Chaney–Goodman–Schwerner y las Religiosas de Maryknoll conservan completos sus retratos colectivos.
- Se corrigieron especialmente Janani Luwum, Rosa Luxemburgo, Federico García Lorca, Víctor Jara, Orlando Letelier, Rachel Corrie y Shireen Abu Akleh.
- No se detectaron paneles laterales blancos ni bandas grises extensas en los archivos finales.
- Los bordes grises de las fotografías fueron retirados de las fichas y biografías.

## Corrección de cuadrículas

Las cuadrículas de casos y referencias usaban un fondo gris continuo como separador. Cuando una última fila tenía menos tarjetas, el fondo aparecía como un bloque gris vacío.

La solución aplicada fue:

- retirar el fondo gris de la cuadrícula;
- usar separación real entre tarjetas;
- asignar un borde individual a cada tarjeta;
- conservar el fondo papel de la página en los espacios vacíos.

Esto corrige las últimas filas de **Resistencia cultural, antifascista y obrera**, **Prensa y solidaridad en zona de conflicto** y la cuadrícula general de referencias.

## Comprobaciones técnicas

- **29** páginas HTML analizadas.
- **10** archivos CSS analizados.
- **16** archivos JavaScript validados con `node --check`.
- **146** archivos JSON analizados.
- **29** ilustraciones verificadas.
- **641** referencias locales comprobadas.
- **0** enlaces internos rotos.
- **0** anclas inexistentes.
- **0** identificadores HTML duplicados.
- **0** errores de sintaxis CSS.
- **0** errores de sintaxis JavaScript.
- **0** bandas grises extensas detectadas en las imágenes.
- **0** paneles laterales blancos detectados en los retratos individuales.
- **29** rutas HTML y cinco recursos críticos respondieron con HTTP 200 mediante servidor local.

## Recursos comprobados de forma específica

- `archivo/silenciados-por-el-estado/index.html`
- `archivo/silenciados-por-el-estado/biografias.html`
- `archivo/silenciados-por-el-estado/referencias.html`
- `archivo/silenciados-por-el-estado/criterios.html`
- `css/archive.css`
- `imagenes/janani-luwum.webp`
- `imagenes/rosa-luxemburgo.webp`
- `imagenes/shireen-abu-akleh.webp`
- `data/fuentes.json`

## Caché y publicación

Las cuatro páginas del archivo ahora solicitan:

```html
<link href="../../css/archive.css?v=3" rel="stylesheet">
```

El cambio de versión evita que GitHub Pages o el navegador conserven el CSS anterior en caché.

El archivo `deployment_manifest.json` registra tamaño y SHA-256 de todos los archivos publicados, con excepción del propio manifiesto.
