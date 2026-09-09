# Respuesta de correo a oferta revisada

Una respuesta vinculada a una solicitud muestra «Revisar como nueva oferta». Abre el correo literal y campos vacíos para proveedor, insumo, especificación, presentación, precio y moneda. La revisión es manual: no se atribuye una extracción a OpenAI ni se inventa un valor ausente.

Confirmar abre una comparación nueva con cantidad pendiente. El usuario completa condiciones y pulsa «Guardar comparación» para conservarla en Convex. La comparación anterior permanece guardada; la nueva oferta no la sobrescribe ni registra una compra. No combina automáticamente ofertas de especificaciones distintas.

La referencia `replyReview` conserva solicitud, mensaje y campos confirmados. Al guardar, el servidor verifica que la solicitud pertenezca a la sesión y que el mensaje esté vinculado a esa solicitud; reconstruye el texto original desde `quotationReplies`. No recibe el texto del correo del cliente. La procedencia original sobrevive a ediciones posteriores de precio/condiciones. Reintentos idénticos no duplican; revisiones concurrentes y cambios de evidencia en reintentos se rechazan.

Disponible desde solicitudes de comparación, estudio y candidato web. Recibir el correo no activa esta operación, no confirma campos y no envía mensajes nuevos. Los eventos sin correspondencia no pueden convertirse en oferta mediante este flujo.

Límites: una oferta revisada por respuesta/comparación; campos hasta 120 caracteres, mismas unidades y reglas deterministas existentes. Si la respuesta contiene varias variantes, el usuario debe identificar una sola y confirmar su especificación. Precio y contenido pueden seguir pendientes; moneda y unidad necesitan confirmación para comparar.

Pendiente: extracción automática del correo y comparación conjunta con otras ofertas existentes. Este corte cierra revisión manual, procedencia y guardado; no acredita correo real ni una negociación autónoma.

Verificación: 92 tests de dominio/backend, 41 E2E y build aprobados. La prueba de navegador usa correo sintético insertado exclusivamente en Convex local; demuestra revisión, guardado y recarga, no recepción real de AgentMail. Vista móvil inspeccionada.
