# Respuesta de correo a oferta revisada

Una respuesta vinculada a una solicitud muestra «Revisar como nueva oferta». Abre el correo literal y campos vacíos para proveedor, insumo, especificación, presentación, precio y moneda. La revisión es manual: no se atribuye una extracción a OpenAI ni se inventa un valor ausente.

Confirmar abre una comparación nueva con cantidad pendiente. El usuario completa condiciones y pulsa «Guardar comparación» para conservarla en Convex. La comparación anterior permanece guardada; la nueva oferta no la sobrescribe ni registra una compra. No combina automáticamente ofertas de especificaciones distintas.

La referencia `replyReview` conserva solicitud, mensaje y campos confirmados. Al guardar, el servidor verifica que la solicitud pertenezca a la sesión y que el mensaje esté vinculado a esa solicitud; reconstruye el texto original desde `quotationReplies`. No recibe el texto del correo del cliente. La procedencia original sobrevive a ediciones posteriores de precio/condiciones. Reintentos idénticos no duplican; revisiones concurrentes y cambios de evidencia en reintentos se rechazan.

Disponible desde solicitudes de comparación, estudio y candidato web. Recibir el correo no activa esta operación, no confirma campos y no envía mensajes nuevos. Los eventos sin correspondencia no pueden convertirse en oferta mediante este flujo.

Límites: una oferta revisada por respuesta/comparación; campos hasta 120 caracteres, mismas unidades y reglas deterministas existentes. Si la respuesta contiene varias variantes, el usuario debe identificar una sola y confirmar su especificación. Precio y contenido pueden seguir pendientes; moneda y unidad necesitan confirmación para comparar.

Desde la solicitud de una comparación guardada también puede elegirse «Añadir a comparación actual». Requiere confirmar explícitamente equivalencia; insumo, especificación, unidad base y moneda deben coincidir. Conserva cantidad y ofertas anteriores, elimina la elección y requiere guardar los cambios. Convex reconstruye el correo, comprueba propiedad y revisión vigente y rechaza duplicados. Hasta cuatro fuentes por comparación, incluidas las retiradas para conservar su procedencia. No hay conversión de moneda ni sustitución inferida.

Pendiente: extracción automática del correo. Este corte no acredita correo real ni una negociación autónoma.

Verificación: 94 tests de dominio/backend, 42 E2E y build aprobados. La prueba de navegador usa correo sintético insertado exclusivamente en Convex local; demuestra revisión, guardado y recarga, no recepción real de AgentMail. Vista móvil inspeccionada.
