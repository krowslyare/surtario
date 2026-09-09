# De fuente web a candidato y consulta

## Recorrido

Una investigación web completada conserva sus fuentes en Convex. Cada fuente permite «Guardar posible distribuidor», aunque no tenga precio, markdown ni extracción. El usuario revisa la página, indica nombre y contacto opcional y confirma que quiere conservarla como candidata. Encontrar o guardar una página no acredita stock, cobertura ni calidad del proveedor.

«Distribuidores web guardados» recupera las fichas al recargar, sin volver a buscar ni extraer. Cada ficha conserva insumo/zona, título, URL y fecha de observación desde la investigación original. Nombre y contacto son anotaciones del usuario, no datos verificados automáticamente. Un contacto ausente se muestra pendiente; no se inventa precio.

Desde la ficha se prepara una solicitud de catálogo sin cantidad ni comparación. Se revisan texto y destinatario antes de confirmar el envío. El contacto anotado nunca se usa como destinatario: la demo sigue restringida al buzón de prueba configurado en servidor. Respuestas correlacionadas se consultan en la solicitud; no crean ofertas automáticamente.

## Contrato y límites

`webProspects` conserva hasta 10 candidatos por sesión y 100 globales. `prospects.save` valida investigación completa, propiedad y referencia de fuente; reconstruye URL, título, fecha, insumo y zona desde Convex. Una fuente solo crea una ficha por sesión; reintento idéntico recupera la misma y otros datos se rechazan. La edición de fichas guardadas queda pendiente; revisar antes de confirmar.

No se añade un marketplace ni se modifica el estudio sintético. La investigación web, fichas de candidatos y solicitudes quedan relacionadas mediante IDs; los candidatos tienen su biblioteca propia dentro del recorrido web. Los datos proceden de la búsqueda configurada cuando se ejecute realmente, sin depender de los distribuidores fijos del ejemplo.

## Evidencia

90 tests de dominio/backend y build satisfactorios. Pruebas cubren aislamiento, fuente inexistente, revisión inválida, reintento, ausencia de precio/extracción y separación entre contacto y destinatario. El E2E usa una investigación sintética guardada mediante funciones internas del backend local, comprueba guardar/recargar/consultar y envío deshabilitado. No se ejecutaron llamadas a Firecrawl, OpenAI ni AgentMail.

Pendiente validar pertinencia real de las fuentes con credenciales. La selección y el contacto se revisan manualmente; no hay extracción automática de teléfonos/correos ni envío a proveedores reales habilitado.
