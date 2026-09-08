# Entrega: exploración autónoma del mercado

Implementada localmente el 7 de septiembre de 2026. El estado de etapas permanece en [ETAPAS.md](./ETAPAS.md). Este documento describe el corte inicial; la [entrega posterior de persistencia](./PERSISTENCIA_ESTUDIOS.md) actualiza los límites de guardado. Este bloque corrige la entrada del producto: investigar alternativas tiene sentido aunque el usuario todavía no quiera comprar.

## Recorrido implementado

1. Abrir `/` y explorar el ejemplo de arroz o buscar una categoría/zona.
2. Distinguir precio de catálogo, distribuidor sin precio y referencia general. Consultar fuente y contacto ilustrativo cuando existe.
3. Añadir opciones al estudio y revisar la selección sin cantidad, documentos ni recetas.
4. Preparar opcionalmente un borrador de consulta editable. Solo se copia texto; no hay envío de correo ni integración de WhatsApp.
5. Para calcular una posible compra, confirmar equivalencia entre productos seleccionados. La cantidad empieza vacía; mínimos, flete, impuestos y entrega no confirmados permanecen pendientes. Contactos sin precio y referencias se conservan en el estudio y no se convierten en ofertas.
6. Volver al estudio mantiene su selección mientras la aplicación siga abierta. Restaurar la comparación recupera los catálogos seleccionados, no el caso manual con condiciones completas.

La alternativa manual sigue accesible desde una acción secundaria y `/?view=comparison`. La compra realizada no se registra al seleccionar una opción o confirmar datos.

## Límites explícitos

- Solo se filtran fixtures ficticios de arroz y abarrotes en Lima. No hay búsqueda web, scraping, cobertura real ni contactos verificados. Una búsqueda vacía no significa ausencia de proveedores.
- La selección vive en React y se pierde al recargar. Cambios de comparación se pierden al abandonar esa vista. Todavía no hay guardado en Convex, sincronización ni recuperación de estudios.
- No hay recepción documental, cuentas, envío de mensajes, fuentes públicas conectadas ni acceso a datos privados. Esos hitos mantienen su estado pendiente.
- La consulta editable no prueba disposición a pagar ni adopción de proveedores. Para negocio se medirá utilidad y segundo uso del estudio; para hackatón se demostrará posteriormente el flujo con integraciones reales y datos de prueba.

## Código y verificación

`src/MarketStudy.tsx` implementa la exploración; `src/domain/market.ts` separa resultados y prepara la continuación; `src/Comparison.tsx` conserva la calculadora. `src/App.tsx` mantiene la selección al alternar vistas. `fixtures/market.ts` contiene únicamente datos sintéticos.

Verificación: 32 pruebas de dominio/entrada, 15 de navegador entre comparación y mercado, y build/tipos. Se comprueban estudio sin cantidad, contacto sin precio, búsquedas vacías, equivalencia, condiciones pendientes, restauración, retorno al estudio, ausencia de envío y reflujo a 320/390/768/1280 px. La revisión visual cubre escritorio y teléfono; no acredita auditoría completa de accesibilidad ni dispositivos físicos.

## Continuación implementada

El bloque de persistencia ya fue implementado localmente y documentado por separado en `PERSISTENCIA_ESTUDIOS.md`. Los límites transitorios descritos arriba son la evidencia del primer corte. Estado vigente en `ETAPAS.md`; descubrimiento/extracción y correo reales siguen pendientes.
