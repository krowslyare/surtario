# Revisiones web recuperables

Al revisar una extracción web, la selección conserva la referencia a la investigación y página originales. «Comparar ofertas revisadas» prepara la comparación; «Guardar comparación» conserva las correcciones confirmadas, condiciones y elección. Cerrar la pestaña antes de guardar sigue perdiendo esa selección.

## Evidencia e identidad

El navegador envía referencias de investigación/fuente y valores revisados. El servidor comprueba que la investigación pertenece a la misma sesión, que la extracción está completa y que hay texto recuperado. Reconstruye desde esos registros la URL, fecha, texto y propuesta original; no acepta documentos, URL o propuestas suministradas por el cliente para el guardado.

Proveedor, insumo y especificación se pueden corregir durante la revisión de extracción. La comparación guardada conserva esa revisión como punto de partida: editar después cantidades, precios o condiciones no reescribe la propuesta extraída ni el texto original. La elección está ligada a los valores guardados de esa revisión y no registra compras.

## Límites

Hasta tres fuentes revisadas por creación, con equivalencia confirmada antes de combinarlas. Cada página debe pertenecer a una investigación guardada de la sesión. Se mantienen 10 comparaciones por sesión, 500 globales, idempotencia de creación, revisiones optimistas y comprobación determinista de la oferta elegida.

Es una continuación del flujo de páginas públicas, no habilitación de documentos privados. No admite fotos, comprobantes o archivos de clientes en almacenamiento anónimo. La sesión de navegador no equivale a autenticación por restaurante; borrar almacenamiento pierde acceso.

## Verificación

Las pruebas usan investigaciones y extracciones sintéticas en Convex local. El recorrido valida corrección de S/ 80 a S/ 85, condiciones de entrega de S/ 15, total esperado de S/ 100 para un saco y recuperación de la elección sin borrar evidencia. No se invocan Firecrawl ni OpenAI en esta prueba. 68 pruebas de dominio/backend y build satisfactorios. Pruebas incluyen referencias ajenas, extracción incompleta, correcciones inválidas, duplicados, reintentos de creación y conflictos de revisión. El E2E ejecuta guardado/recarga y elección en Convex local; no es una llamada externa real.

Revisión adversarial independiente completada sin hallazgos materiales pendientes sobre propiedad de fuentes, reconstrucción de evidencia, reintentos y actualización de snapshots.
