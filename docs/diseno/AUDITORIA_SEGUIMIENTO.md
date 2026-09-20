# Auditoría de continuidad y seguimiento

Fecha: 2026-09-20. Estado: implementación local en `codex/study-followup-polish`; sin publicación ni despliegue de esta revisión.

## Diagnóstico

El problema principal era de navegación y jerarquía, no de decoración. Abrir un caso guardado restauraba también su estudio, reemplazaba la selección de mercado y enfocaba un bloque cuya posición cambiaba según el contexto. La URL seguía indicando mercado. El usuario perdía el punto de partida sin recibir una señal clara de que había abierto otro destino.

Dos evaluaciones independientes del flujo y la revisión del código coincidieron en esa causa. La inspección manual del caso guardado confirmó el salto de contexto. Los problemas y sus correcciones son:

| Prioridad | Hallazgo | Corrección local |
| --- | --- | --- |
| Alta | Abrir seguimiento cambiaba el estudio de mercado activo. | La navegación al seguimiento conserva el borrador del mercado. Abrir su estudio vinculado es una acción explícita. |
| Alta | Caso, fuentes, correos, investigación, historial y seguimiento de precios vivían en un bloque expansible. | Destino propio con Overview, Messages, Sources y Activity. Overview contiene contexto, pendientes y una siguiente acción. |
| Alta | Recarga y botones del navegador no representaban el caso abierto. | Ruta `?view=followup&case=…`, mensaje opcional y recuperación desde consultas con alcance de sesión. Estado no disponible explícito. |
| Alta | La revisión de fuentes dependía del estudio oculto en otra pantalla. | La selección y el guardado de hallazgos pertenecen al seguimiento abierto; se preserva la revisión base para evitar sobrescrituras concurrentes. |
| Media | Una consulta aparecía en varios sitios y se podía abrir un destino distinto al anunciado por el botón. | Un único espacio de conversaciones. El hub abre un seguimiento o su mensaje concreto; deja de anunciar una comparación cuando abre el caso. |
| Media | Volver atrás podía mostrar la última comparación en una entrada anterior. | Cada entrada conserva su borrador, cantidad y selección propios. El borrador de historial se limita a la sesión del navegador; guardar en Convex sigue siendo explícito. |
| Media | La misma consulta no volvía a abrirse después de cerrar su diálogo. | Cada visita tiene identidad propia, aunque caso y mensaje coincidan. |
| Media | El foco al cerrar diálogos podía desplazar la página a un elemento oculto. | Restauración del foco sin scroll, únicamente a un control conectado y visible. |
| Media | El nuevo destino podía dejar fuera mensajes de candidatos web o no continuar tras confirmar entrega. | Vinculación por prospecto del estudio, además de estudio/comparación/evento; confirmación de entrega abre la misma comparación actualizada. |
| Media | Espaciado, títulos y datos pendientes carecían de una jerarquía común. | Ancho de lectura acotado, tokens de Surtario, dos columnas en escritorio y una en móvil; acción con contorno completo, sin acento lateral. |

## Flujo resultante

```text
Explorar proveedores → revisar una fuente → conservar opciones en el estudio
                      ├─ precio revisado → calcular compra
                      └─ datos pendientes → preparar consulta → seguimiento

Continue your work → estudio / cálculo / seguimiento concreto
Seguimiento → Overview: qué sé, qué falta, qué puedo hacer ahora
            → Messages: conversación y revisión de respuesta
            → Sources: evidencia, revisión y guardado de hallazgos
            → Activity: historial y seguimiento de precios, cuando está disponible
Seguimiento → comparación vinculada → volver al seguimiento → volver al mercado
```

Investigar una pregunta sigue siendo opcional y no exige ofertas seleccionadas. No se inicia una búsqueda ni se envía correo al abrir una pantalla. Preparar una consulta guarda un borrador: aprobar el envío continúa siendo una decisión separada.

Las fuentes del seguimiento se recuperan por identificadores explícitos de estudio, prospecto y comparación. No se fusionan trabajos por coincidencias de ingrediente. Abrir una oferta desde una respuesta conserva el vínculo y la revisión de la comparación existente. Entrega, impuestos y demás términos no confirmados siguen pendientes.

## Jerarquía de herramientas

- El mercado se concentra en explorar, revisar y seleccionar.
- La compra tiene su pantalla de cantidad, ofertas y resultado determinista. Se eliminó el indicador ambiguo «Quantity / Terms / Choice».
- El seguimiento es una pantalla de trabajo, no una tarjeta añadida debajo del mercado. Mensajes y fuentes tienen secciones independientes.
- El historial se lee directamente dentro de Activity, sin otro diálogo. El seguimiento de precios no ocupa Overview ni se ofrece cuando está deshabilitado y no hay seguimientos previos.
- Los límites y el detalle de cobertura permanecen disponibles en Sources. No compiten con la siguiente acción del resumen.
- Las transiciones entre destinos usan una entrada breve y restauración de posición al volver. Los desplazamientos dentro de una página mantienen el scroll suave y respetan reducción de movimiento.

## Verificación y límites

Las pruebas utilizan el frontend y el backend anónimo local, con sesiones separadas y fixtures de pruebas. Se comprueban continuidad, recarga, aislamiento de sesiones, navegación atrás/adelante, borradores distintos de comparación, reapertura de consultas, actualización reactiva de una respuesta, revisión de fuentes y retorno a la comparación existente. Las pruebas también cubren entrega y pedidos mínimos, aritmética y conservación de fuentes previas.

La inspección manual incluye el caso guardado que motivó la revisión, Overview, Messages, Sources y Activity, en escritorio y móvil. Las comprobaciones responsivas cubren 1920, 390 y 320 px, estados sin conexión, foco y desbordamiento horizontal. La matriz y resultados finales se registran en `ETAPAS.md` y `hackathon.md`.

Esta revisión no vuelve a validar entregabilidad real de AgentMail, calidad de una búsqueda nueva ni disponibilidad de proveedores. No se hicieron envíos ni llamadas nuevas a Firecrawl/OpenAI. Tampoco equivale a una prueba de comprensión con usuarios externos: antes del video conviene un ensayo humano con un ingrediente, una pregunta y una decisión concreta. Los datos antiguos de pruebas conservan sus nombres y condiciones; no se maquillan como cotizaciones actuales.

### Resultados locales

- `npm test`: 320 pruebas, 49 archivos, correctos.
- `npm run build`: TypeScript y compilación de producción correctos.
- 23 recorridos E2E distintos correctos, ejecutados por bloques: `funnel` (7), `followup-navigation` (2), `sourcing` (4), `minimum-action` (3), `study-case-comparison` (1), `study-reply-case` (2), `study-quotations` (2) y dos recorridos de `comparison-example`. No se afirma haber repetido la suite E2E completa.
- Revisión visual manual: caso guardado original, cuatro secciones, conversación abierta/cerrada, 1920 px y 390/320 px. Carga limpia sin errores de ejecución.
- La comprobación de un disclosure cerrado usa `aria-hidden`, `inert` y altura cero: mantiene contenido montado para preservar estado durante su animación.


## Refinamiento del acceso desde resultados

La cabecera de resultados agrupa ahora el insumo, la zona y las acciones secundarias. Se retiraron el resumen de búsqueda repetido y la franja independiente de investigación. «Change search» conserva la edición en contexto y su desplazamiento al formulario. «Research a question» abre un diálogo breve, conserva el borrador al cerrarlo y solo navega al seguimiento después de confirmar el guardado.

El contexto se toma del resultado web activo o de la selección de My study, según dónde se abrió el diálogo. Editar una búsqueda sin enviarla, o buscar otro ingrediente sin reemplazar el estudio, no cambia el insumo de la pregunta. Un seguimiento ya vinculado conserva su acceso directo. En móvil, las acciones se ajustan debajo del título sin reservar altura vacía.

Verificación de este refinamiento: 11 recorridos de navegador distintos satisfactorios en ejecuciones enfocadas, build de producción y revisión visual a 1920/390/320 px. Sin desbordamiento horizontal ni errores de consola en la inspección manual. La prueba de límite de búsqueda se actualizó para validar el UUID ya existente y representar la nueva ubicación de las acciones. No se repitió toda la suite de dominio ni se consumieron proveedores externos.

## Revisión de una oferta

El diálogo separa una fuente con borde uniforme de los campos editables. Enlace y fecha tienen líneas propias; los campos relacionados comparten filas y cada uno conserva su evidencia desplegable. La revisión documental mantiene visible el archivo original. El título y el cierre permanecen fuera del contenido desplazable, incluso al enfocar campos inferiores en móvil.

Verificación enfocada: 10 recorridos distintos correctos entre revisión, corrección, persistencia web/documental, teclado y móvil; build correcto. Inspección manual de una fuente web guardada a 1920/390/320 px, sin desbordamiento ni errores de ejecución. No se ejecutaron llamadas nuevas a proveedores externos. Las pruebas identifican por nombre exacto los campos para distinguirlos de los controles de evidencia; se conserva la comprobación de la propuesta original y la corrección manual.

## Bandeja global de mensajes

Messages tiene acceso desde la navegación del mercado y la comparación. Conserva la porcelana, berenjena, Bricolage Grotesque, Manrope y controles compartidos de Surtario. Las conversaciones forman una lista con separadores horizontales: proveedor, asunto, ingrediente y mercado preceden al estado y la fecha; en móvil estos últimos pasan debajo. Los filtros distinguen todas las conversaciones, respuestas, espera y borradores. El contador señala respuestas pendientes de revisar y guardar, no mensajes sin abrir; los estados de borrador, envío pendiente de respuesta, envío no confirmado y fallo conservan etiquetas distintas.

El diálogo abre con proveedor, contexto y asunto; la respuesta más reciente y su acción de revisión aparecen antes de la solicitud enviada y el historial desplegables. Los enlaces al trabajo vinculado quedan al final. Recibir o abrir una respuesta no cambia precios ni condiciones: la revisión y el guardado siguen siendo explícitos. Es una extensión operativa del sistema existente, sin nuevos activos ni cambios de identidad; `DESIGN.md`, `UI_UX.md` y los tokens mantienen su autoridad.


Verificación de Messages: 12 recorridos E2E distintos correctos en ejecuciones enfocadas (3 de bandeja, 3 de revisión de respuesta, 2 de respuesta vinculada y 4 de navegación), build de producción y revisión visual de bandeja/conversación a 1920/390 px. La prueba de bandeja comprueba además ausencia de desbordamiento a 320 px. La respuesta insertada en el backend de pruebas apareció sin recarga y mantuvo los precios guardados intactos hasta la revisión y el guardado explícitos. Los hallazgos independientes de retorno, acceso a oferta ya guardada y jerarquía de conversación quedaron resueltos.

Se corrigió una aserción antigua dependiente de que la IA estuviese desactivada; ahora comprueba que los campos manuales permanecen editables y sin precio propuesto. Se retiraron únicamente las consultas/respuestas de pruebas creadas durante esta ejecución para recuperar el cupo local anterior; la utilidad interna temporal de limpieza también se retiró. Sin llamadas a proveedores, envíos reales ni publicación remota en esta validación.


## Conversación: composición y despliegue progresivo

Destinatario y estado comparten una cabecera compacta; la respuesta más reciente permanece abierta y sus acciones junto al contenido. Solicitud enviada e historial quedan como apoyos. Copiar para WhatsApp pertenece al mensaje enviado. La cabecera del modal conserva su posición al expandir; el cuerpo y los enlaces secundarios se desplazan, para no consumir el espacio de lectura móvil.

Los desplegables reutilizan `Disclosure` (altura/opacidad, teclado, `inert`, movimiento reducido). Se corrigió el selector de las flechas anidadas para que cada una represente su propio estado. Verificación local: dos recorridos E2E focalizados, build, inspección manual en 1920/390 px y desbordamiento a 320 px; medición de alturas intermedias y cabecera estable. No hubo envíos ni llamadas nuevas a proveedores.
