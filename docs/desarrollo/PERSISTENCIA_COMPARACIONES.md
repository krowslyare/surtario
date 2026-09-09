# Comparaciones y elección recuperables

Una comparación de ejemplo conserva cantidad, condiciones por oferta, fuente original y opción elegida. Guardar confirma la respuesta de Convex; elegir un proveedor no registra una compra, no modifica stock y no envía mensajes.

## Contrato

- Se guardan los ejemplos de cotización de arroz y los catálogos sintéticos del estudio de mercado. Se pueden modificar cantidades, precios, presentación, mínimo, entrega e impuestos como condiciones del escenario.
- Los nombres y especificaciones deben seguir siendo los del ejemplo. Al actualizar, la identidad se valida contra la evidencia ya guardada y las ofertas se limitan al conjunto original. Ofertas manuales nuevas y documentos revisados siguen transitorios; no se habilita almacenamiento anónimo de textos privados.
- Una cantidad vacía se conserva como pendiente (`0` en el registro), no como una compra de cero unidades. Una oferta incompleta puede guardarse, pero no elegirse.
- La opción elegida corresponde a los valores guardados de esa revisión. Editar cantidad u ofertas requiere volver a elegir. El backend recalcula la elegibilidad; no acepta totales enviados por el navegador ni declara que una opción sea la mejor.
- El origen se toma de fixtures del servidor y se conserva al actualizar. Cambios en condiciones no reescriben el precio original. La fecha de guardado es distinta de la fecha de la fuente.
- Abrir una comparación reemplaza el borrador de la vista. La lista reactiva no sobrescribe automáticamente una comparación abierta. Los cambios posteriores al guardado requieren guardar de nuevo.

## Aislamiento y límites

La sesión comparte la capacidad aleatoria de los estudios: el navegador conserva el secreto y Convex solo su hash. Otra sesión no puede listar ni actualizar comparaciones ajenas aunque conozca su ID. No equivale a una cuenta autenticada; borrar el almacenamiento del sitio pierde acceso. No admite datos de clientes.

Hasta 10 comparaciones por sesión y 500 en la demo. Lecturas acotadas e indexadas; campos numéricos finitos y acotados. El identificador de creación evita duplicados por reintento; reutilizarlo con otros datos produce conflicto. Actualizaciones requieren la revisión vigente. No hay sincronización offline garantizada ni purga automática.

## Evidencia

Pruebas de backend cubren recuperación, elección, preservación de fuente, idempotencia, aislamiento, revisiones desactualizadas, condiciones pendientes y límites. Pasaron 58 pruebas de dominio/backend, 30 E2E del conjunto completo y una regresión adicional de confirmación tardía, más build. Navegador verifica guardado/recarga, elección invalidada tras editar, cantidad pendiente recuperada desde catálogo, rechazo de cantidad inválida y restauración como comparación nueva. Convex local real respondió a la query de comparaciones. Revisión visual de escritorio/móvil y reflujo existentes satisfactorios.

Entrega separada sobre extracción/revisión. No completa la etapa de solicitud/respuesta: Firecrawl, OpenAI y AgentMail requieren todavía llamadas reales y conexión al recorrido. No hay compras registradas ni despliegue público.
