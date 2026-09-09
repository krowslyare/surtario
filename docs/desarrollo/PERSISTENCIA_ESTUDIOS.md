# Entrega: estudios persistentes en Convex local

Bloque implementado el 7 de septiembre de 2026, después de la exploración autónoma. Estado de etapas en [ETAPAS.md](./ETAPAS.md).

## Uso

1. Explorar el ejemplo de arroz/abarrotes en Lima y seleccionar opciones.
2. «Guardar estudio» conserva consulta, selección y fuentes en Convex. Se confirma solo tras respuesta del servidor.
3. Recargar y abrir «Guardados» → «Abrir estudio». No hace falta cantidad ni documentos.
4. Cambiar selección y guardar de nuevo. La lista de otra pestaña de la misma sesión se actualiza; su borrador abierto no se reemplaza automáticamente. Si intenta guardar una versión antigua, recibe un conflicto y debe abrir la revisión actual.

Abrir un estudio reemplaza la selección actual, con advertencia visible. Las compras calculadas y borradores de consulta siguen transitorios. Todavía no hay compras registradas ni correos enviados.

## Contrato y límites

- `studies` guarda instantáneas pequeñas y acotadas: cuatro resultados sintéticos con fuente/fecha, selección, consulta, revisión y fecha de actualización. El servidor obtiene precios/contactos de fixtures; no acepta documentos, precios o contactos arbitrarios del cliente.
- Una capacidad aleatoria de 256 bits identifica la sesión anónima de este navegador. Solo su hash se guarda en Convex; la capacidad queda en localStorage y no se pone en enlaces, fuentes o respuestas de listado. Conocer un ID de estudio no autoriza leerlo o modificarlo.
- Esta es autorización de demo por posesión de una capacidad, no una identidad de restaurante. Pestañas del mismo navegador comparten acceso. Borrar datos del sitio pierde ese acceso. No hay recuperación de cuenta ni revocación, expiración o borrado automático; no introducir datos privados.
- Máximo 10 estudios por sesión y 500 en el backend local. Las consultas usan índices y lecturas acotadas. El límite global evita crecimiento ilimitado en esta entrega; no sustituye controles de abuso ni limpieza para publicación.
- Crear con la misma solicitud y contenido es idempotente. Reutilizarla con una selección distinta se rechaza. Actualizar requiere propietario y revisión vigente; una respuesta incierta no autoriza sobrescribir otra revisión.
- Sin conexión, guardado deshabilitado y borrador conservado. Si se corta durante una mutación, Convex puede mantenerla pendiente y reanudar al reconectar; la UI conserva «Guardando» hasta confirmación. No afirma que hubo guardado offline ni promete recuperar cambios no confirmados tras cerrar la página.
- Sin URL de backend, exploración/manual siguen funcionando y muestran guardado no configurado. Fallos de carga quedan dentro del panel de guardado.

## Evidencia

Pasaron 36 pruebas de dominio/backend, 18 de navegador y build/tipos. Las nuevas pruebas backend usan `convex-test` en memoria; las pruebas de navegador guardan y recuperan datos de un **Convex local real**, verifican dos pestañas, navegador independiente, conflicto y desconexión. Las consultas de cálculo anteriores mantienen sus pruebas. Los E2E de persistencia bloquean conexiones WebSocket a hosts remotos.

El proceso existente de `convex dev` publicó las funciones e índices en el backend local sin errores. Un intento adicional de `convex dev --once` no arrancó porque el puerto ya estaba ocupado; se verificó el proceso existente y el recorrido real. No se reconfiguró un despliegue cloud ni se publicó la aplicación.

Revisión adversarial independiente con dos correcciones verificadas: reintentos de distinto contenido y conservación del borrador al volver al ejemplo. La revisión visual usa el navegador en escritorio y móvil; no acredita accesibilidad completa ni prueba en dispositivos físicos.

Referencias técnicas consultadas: [runtime de Convex](https://docs.convex.dev/functions/runtimes) para Web Crypto y [convex-test](https://docs.convex.dev/testing/convex-test) para pruebas en memoria. La evidencia de ejecución es local, separada de esas capacidades documentadas.

## Siguiente hito

Alimentar este recorrido con fuentes externas reales y extracción revisable cuando se configuren las APIs. La interfaz debe conservar precios sin unidad como pendientes, contactos sin precio como alternativas y referencia como contexto. Publicación y piloto requieren todavía sus respectivas etapas de aislamiento, límites y permisos.
