# Extracción y revisión de cotizaciones

Entrega independiente sobre la base del PR 1. Estado global en [ETAPAS.md](./ETAPAS.md).

## Lo implementado

«Revisar ejemplo de cotización» abre un documento sintético junto a siete campos: proveedor, insumo, especificación, contenido, unidad, precio por presentación y moneda. La pantalla muestra propuesta, evidencia y correcciones manuales. El ejemplo deja ausente el peso del saco; no lo deduce. Cerrar/reabrir conserva el borrador en esta pestaña. Cambiar un campo invalida la confirmación anterior.

Confirmar prepara una comparación opcional con cantidad vacía; mínimo, flete, impuestos y entrega permanecen pendientes. No registra compra ni guarda un documento. Moneda y unidad deben ser explícitas; contenido y precio pueden quedar pendientes. La fuente conserva propuesta estructurada y valores revisados por separado; los importes de entrada a comparación se titulan «al confirmar revisión», no «originales del documento».

**La UI usa un resultado sintético, no llama a OpenAI.** Los archivos del flujo de listas continúan locales y la revisión de cotización todavía no se conecta a esos archivos. No hay OCR de fotos/PDF implementado en este corte.

## Prueba interna OpenAI

`convex/extraction.ts` implementa una action interna mediante el componente oficial Agent. Se registra en `convex/convex.config.ts`; usa el proveedor OpenAI directamente porque este backend es local y no dispone de AI Gateway cloud. Variables opcionales tipadas: `OPENAI_API_KEY` y `OPENAI_EXTRACTION_MODEL`. Ambas son obligatorias al ejecutar la prueba, sin modelo asumido.

La entrada solo permite elegir `clear` o `ambiguous`, dos documentos de texto sintéticos definidos por el servidor. No acepta texto privado, URLs, imágenes ni archivos de visitantes. No crea threads, no guarda mensajes y no declara herramientas. Sin reintentos automáticos, máximo de 2000 tokens de salida y timeout de 30 segundos. El error externo se sustituye por un mensaje propio.

Esquema cerrado Zod; cada valor requiere evidencia literal presente en el documento. Se rechazan campos extra, monedas/unidades fuera del contrato, valores sin evidencia y citas inexistentes. Una cita literal no prueba que la interpretación sea correcta: la revisión humana sigue siendo obligatoria.

Con backend local identificado, configurar interactivamente las variables en Convex, sin escribir secretos como argumentos:

```sh
npx convex env set OPENAI_API_KEY --deployment local
npx convex env set OPENAI_EXTRACTION_MODEL --deployment local
```

Elegir un modelo disponible en la cuenta con salida estructurada; no se ha verificado ninguno en este proyecto. Después, ejecutar conscientemente las pruebas, que pueden consumir créditos:

```sh
npx convex run extraction:probe '{"example":"clear"}'
npx convex run extraction:probe '{"example":"ambiguous"}'
```

Esperado: la primera propuesta identifica 18 kg y PEN 80; la segunda deja contenido/unidad ausentes. Si el modelo inventa valores, el caso no se considera aprobado aunque el JSON sea válido. No habilitar la UI pagada ni documentos privados como efecto secundario de poner la clave.

## Evidencia y límites

- 53 tests de dominio/backend; verifican confirmación, pendientes, decimales, evidencia literal y separación de propuesta/revisión.
- 26 E2E del producto; dos del nuevo recorrido, con borrador, revisión y origen al pasar a comparación. Revisión visual en 1280 y 390 px, reflujo a 320 px; se corrigió el ancho de diálogo en escritorio.
- Build y tipos satisfactorios. Convex local cargó action y componente; prueba sin credenciales falla antes del proveedor. Un cliente público no puede invocar la action.
- Revisión adversarial detectó que se llamaba «original» al baseline corregido. Se separaron la propuesta estructurada y valores confirmados y se ajustaron etiquetas y pruebas.
- Sin llamada real OpenAI, persistencia de decisiones, cargas privadas habilitadas ni despliegue público. El siguiente corte será persistencia de condiciones/decisión; correo corresponde a otro PR.

Dependencias verificadas: Agent 0.7.1, AI SDK 7, proveedor OpenAI 4.0.60. Referencias: [generación estructurada de Agent](https://docs.convex.dev/agents/agent-usage), [opciones de almacenamiento](https://docs.convex.dev/agents/messages) y tipos instalados. Instalación y registro no acreditan ejecución real del modelo.
