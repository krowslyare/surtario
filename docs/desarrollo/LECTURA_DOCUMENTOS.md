# Lectura de imagen y PDF

## Entrega actual

Desde «Lee una cotización desde foto o PDF», elegir la imagen PNG o el PDF sintético de una página, inspeccionar/descargar el original y pulsar «Leer con OpenAI». La action de Convex envía los bytes del archivo al modelo mediante Agent y el SDK OpenAI. No sustituye el archivo por una transcripción preparada ni presenta una extracción preescrita como respuesta real.

El modelo propone tipo de documento, transcripción y una oferta con citas. Solo una cotización puede continuar a revisión de oferta; compras, listas y documentos sin identificar conservan su tipo y no se convierten en ofertas. Este corte no extrae tablas de múltiples productos. La revisión permite corregir campos y exige confirmación antes de abrir una comparación sin cantidad ni condiciones inventadas.

Las citas se validan contra la transcripción generada, lo que comprueba consistencia interna, no exactitud visual. Por eso la revisión muestra también el original. No se infiere peso de saco, impuestos, entrega, mínimos ni compra realizada.

## Configuración

Variables del backend: `DOCUMENT_EXTRACTION_ENABLED=true`, `OPENAI_API_KEY` y `OPENAI_EXTRACTION_MODEL`. El modelo elegido debe admitir imagen y PDF; aún no se ha seleccionado ni probado con credenciales. No poner claves en `VITE_*` ni en Git. La habilitación es independiente del descubrimiento web.

Sin configurar, el botón de lectura permanece deshabilitado. El original y la transcripción manual siguen disponibles. No se han enviado archivos a OpenAI durante esta entrega.

## Archivos y persistencia

La API pública solo acepta `image` o `pdf`, identificadores de archivos sintéticos del servidor. No acepta bytes, enlaces ni documentos privados de visitantes. Los archivos propios seleccionados en la entrada existente siguen en memoria de la pestaña y admiten transcripción manual. La carga privada requiere la etapa de piloto con autenticación y control de acceso; no queda habilitada por este PR.

Los resultados de lectura se guardan en `documentRuns`, aislados mediante la capacidad de sesión existente. Las correcciones y la comparación derivada de estos documentos son transitorias en este corte; todavía no están incluidas en el contrato de guardado de comparaciones web. No confundir el resultado guardado del modelo con condiciones confirmadas guardadas.

Archivos fuente: `public/examples/cotizacion-demo.pdf` y su render PNG. `fixtures/documentFiles.json` contiene los mismos bytes codificados para el backend. Una prueba verifica la igualdad binaria entre el original descargable y el archivo enviado al adaptador. El PDF tiene una página y el PNG mide 827 × 695 px.

## Límites y evidencia

- Hasta 10 lecturas por sesión y 100 en total; 30 segundos entre solicitudes nuevas. Una reserva atómica evita repetir llamadas al reintentar la misma solicitud.
- Timeout de 45 segundos, sin reintentos del modelo, salida de hasta 5 000 tokens y transcripción de hasta 12 000 caracteres. Campos y citas conservan los límites del contrato de extracción.
- Un guardado incierto deja la reserva en curso para revisión; no vuelve a consumir automáticamente. Errores externos se muestran sin detalles del proveedor.
- 84 tests de dominio/backend y build satisfactorios. 36 E2E del conjunto completo y una prueba positiva adicional de lectura/revisión verificadas; 37 casos de navegador en total. Se inspeccionaron original y revisión móvil.
- Pruebas del adaptador verifican partes binarias de imagen/PDF, igualdad de bytes, clasificación, citas y límites. Pruebas de Convex cubren aislamiento, deshabilitación, cuotas y reintentos. El navegador positivo usa respuesta simulada; no acredita OCR real.

Sigue pendiente: calidad real con OpenAI, fotos imperfectas, documentos de varios productos, carga privada y guardado de correcciones derivadas de documentos. Este bloque no publica la app ni habilita un piloto comercial.
