# Entrada local de insumos

Implementada localmente el 8 de septiembre de 2026. Estado general en [ETAPAS.md](./ETAPAS.md).

## Recorrido

«Añadir lista o archivo» → escribir o elegir archivo → elegir hoja/columna si corresponde → revisar, corregir o eliminar nombres → confirmar lista → investigar un insumo a la vez.

La búsqueda sigue filtrando ejemplos sintéticos. Si ya hay selección o estudio guardado, cambiar de insumo desde la lista pide iniciar otro estudio y advierte sobre cambios sin guardar. No mezcla ni sobrescribe silenciosamente la selección previa. Cancelar conserva la lista/estudio anterior.

| Entrada | Comportamiento actual |
| --- | --- |
| Manual | Un insumo por línea; revisión y corrección antes de confirmar |
| CSV UTF-8 | Separadores detectados por Papa Parse; conserva números y decimales como texto; errores de sintaxis impiden importar |
| Excel XLSX | Permite elegir hoja y columna; encabezado explícito; no calcula fórmulas, lee valores almacenados |
| PNG, JPG, WebP | Previsualización local y transcripción manual vinculada al archivo |
| PDF | Archivo local disponible para descargar y transcripción manual; sin renderizado ni extracción |
| XLS antiguo / otros | Mensaje de formato no admitido; convertir a XLSX/CSV |

La importación de listas extrae nombres. Las demás columnas quedan como contexto original, **no como precios confirmados ni ofertas**. Una foto/PDF no afirma haber sido leído por IA. OpenAI, interpretación de precios/presentaciones y revisión estructurada de ofertas siguen pendientes.

## Origen y límites

El archivo original se mantiene en memoria y puede descargarse desde «Ver origen de la lista». Se conservan hoja, columna elegida, presencia de encabezado, número de fila y valores leídos antes de editar. Los valores calculados de Excel pueden estar desactualizados; se informa que las fórmulas no se recalculan. No se ejecutan instrucciones contenidas en celdas o documentos.

Hasta 3 MB por archivo, 10 hojas, 100 filas de datos más encabezado por hoja, 20 columnas y 2000 caracteres por celda. Hasta 100 nombres, cada uno entre 1 y 120 caracteres. Se rechazan excesos sin recortar silenciosamente filas. Filas totalmente vacías se omiten conservando la numeración original; filas con otros datos pero nombre vacío exigen corrección o eliminación. No deduplica automáticamente.

Lectura en un Worker cancelable con límite de 10 segundos. Cerrar o sustituir una lectura termina su Worker. Cancelar reemplazo conserva la lista confirmada. Los documentos permanecen en esta pestaña; no hay upload, base de documentos ni persistencia de listas. Recargar pierde la lista y archivo. «Guardar estudio» conserva únicamente el estudio sintético existente; no guarda archivos, listas ni condiciones manuales.

No habilita documentos privados de restaurantes ni completa la etapa de piloto. La interfaz pide usar ejemplos. La habilitación de archivos privados requerirá las condiciones de la etapa P, no solo añadir una API key.

## Evidencia

- `npm test`: 41 pruebas, incluidas 5 de parsing/validación de entrada.
- `npm run build`: tipos y bundle satisfactorios; parser XLSX/CSV en Worker separado.
- `npm run test:e2e`: 24 pruebas, incluidas 5 de entrada. XLSX real sintético con segunda hoja/columna y valor de fórmula almacenado; CSV sin uploads; transcripción, cancelación/reemplazo, archivo corrupto y separación de estudio.
- Revisión visual de entrada XLSX en 1280 px y 390 px; diálogo móvil sin desbordamiento horizontal. Reflujo de pantallas existentes de 320 a 1280 px.
- Revisión adversarial independiente detectó separación de estudio y trazabilidad de columna; se corrigieron y se añadieron comprobaciones de navegador.
- Primer E2E falló por nombre accesible ambiguo de controles; corregidos el nombre del selector de hoja y los selectores de textbox. No se relajaron las aserciones.

Fixture `tests/fixtures/insumos-ejemplo.xlsx`: OOXML mínimo sintético, dos hojas, nombres y códigos inventados, fórmula con valor almacenado. Sin datos de clientes.

Lectores: [read-excel-file](https://github.com/catamphetamine/read-excel-file) 9.3.10 y [Papa Parse](https://www.papaparse.com/docs) 5.7.0. Se usan sus interfaces documentadas; ninguna llamada externa real de sponsors ni despliegue en este bloque.
