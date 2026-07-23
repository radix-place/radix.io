# Homicidios registrados de personas de 0 a 14 años

Aplicación estática integrada al Observatorio Radix de Datos Públicos.

## Ruta pública

`https://www.fundacionradix.org/datos/homicidios-0-14/`

## Procedencia

- Auditoría: `who_mortality_v1_2_2`
- Colector: `1.0.2`
- Contenedor: `1.0.0`
- Capa de consulta: `2.2`

## Estado

La herramienta es visible desde `investigacion.html`, pero conserva `noindex,follow` mientras siga clasificada como vista preliminar. La serie corresponde a homicidios registrados de personas de 0 a 14 años; no representa una serie estricta de menores de 18 años, no calcula tasas poblacionales y no produce un total mundial.


## Carga local robusta

La versión integrada incluye `data/embedded-data.js`, que permite cargar la consulta sin depender de `fetch()` para los datos principales. Los JSON originales se conservan como respaldo y para trazabilidad.
