# Cotizaciones por correo de prueba

Entrega separada del descubrimiento web. El objetivo es revisar una solicitud vinculada a una comparación o estudio guardado, enviarla a un buzón de prueba autorizado y recuperar respuestas del mismo hilo.

## Contrato

- La solicitud toma insumo, especificación y cantidad de la comparación guardada. No registra una compra. Una cantidad pendiente permite pedir catálogo y condiciones sin comprometer volumen.
- El destinatario de prueba se fija en servidor; páginas, correos y navegador no pueden cambiarlo. La UI debe mostrar el destinatario y texto antes de confirmar.
- Las respuestas son texto no confiable. Se vinculan por buzón e IDs de hilo/mensaje; el contenido no puede adjudicarse una sesión ni activar llamadas.
- Recibir o revisar una respuesta no cambia automáticamente precios, stock ni decisiones. El usuario revisa las condiciones antes de editar y guardar la comparación.
- Copiar el texto para WhatsApp es un paso manual, no un envío ni una integración de WhatsApp.

## Configuración

Claves solo en Convex: `AGENTMAIL_API_KEY`, `AGENTMAIL_INBOX_ID`, `AGENTMAIL_TEST_RECIPIENT`, `AGENTMAIL_WEBHOOK_SECRET` y habilitación explícita `AGENTMAIL_ENABLED=true`. No usar variables `VITE_`, no pegar valores en Git ni en el registro del hackatón. Antes de habilitar envío, el usuario debe identificar el destinatario de prueba autorizado.

No se crean buzones, webhooks externos ni envíos como efecto secundario de implementar código. La recepción real requiere registrar una URL pública de webhook en AgentMail cuando exista el despliegue correspondiente.

## Referencias de API

- [Send Message](https://docs.agentmail.to/api-reference/inboxes/messages/send): endpoint de envío y respuesta con IDs de mensaje/hilo.
- [Prevención de duplicados](https://docs.agentmail.to/knowledge-base/preventing-duplicate-sends): cabecera `Idempotency-Key`, distinta de `clientId`, con retención de 24 horas. No repetir automáticamente una operación incierta fuera de esa ventana.
- [Verificación de webhooks](https://docs.agentmail.to/webhook-verification): comprobar firma sobre el cuerpo original antes de procesar eventos.

## Evidencia y límites

77 pruebas de dominio/backend y 35 E2E satisfactorias, además de build/tipos. El navegador comprobó creación, recarga, copia al portapapeles, envío deshabilitado y reflujo móvil. Las pruebas de backend usaron transporte simulado: aislamiento, destinatario congelado, idempotencia, errores inciertos, firma/cuerpo/timestamp, duplicados y correlación. Those checks used simulated transport. A subsequent real development round trip is recorded below and in [provider acceptance evidence](CREDENTIALS_AND_E2E.md).

Hasta 10 solicitudes por sesión y 100 en total, con 30 segundos entre creaciones. Cada solicitud conserva hasta 10 respuestas de texto. Los eventos verificados sin correspondencia, incluidos los recibidos antes de guardar el comprobante de envío y los hilos ambiguos, quedan en una tabla interna acotada a 100 eventos; no hay todavía pantalla ni reconciliación automática para ellos.

Un estado `sending` interrumpido o `uncertain` requiere revisión del operador en AgentMail antes de crear otra solicitud. La API pública no reintenta esos estados. La aceptación del proveedor no confirma entrega. Los borradores sin destinatario/buzón configurado deben recrearse después de configurar el entorno; no cambian silenciosamente de destino.

## Operator recovery workflow

Recovery is available only through internal Convex functions. It does not expose an admin screen, accept a browser session owner, call AgentMail, or resend a message.

1. Run `quotationMail.inspectRecoveryQueue` internally with a limit from 1 to 100. Use 100 for a complete view: the demo caps both requests and quarantined events at 100 globally, so even the oldest retained item remains reachable. Review each `sending` or `uncertain` request in the configured AgentMail inbox using its frozen inbox, recipient, subject, idempotency key, and timestamps. Review quarantined events against their original inbox, thread, sender, message, and body.
2. If AgentMail proves that a request was sent, copy the provider's exact message and thread identifiers. Run `quotationMail.recordVerifiedSentReceipt` internally with the request ID, displayed revision, frozen inbox ID, exact provider identifiers, and `operatorVerified: true`. The mutation accepts only `sending` or `uncertain`, rejects a changed revision, inbox mismatch, invalid identifiers, or a message or thread already assigned to another request in that inbox. Repeating the exact completed operation is harmless.
3. After the receipt exists, run `quotationMail.linkVerifiedUnmatchedReply` internally with the request ID, quarantined event ID, and `operatorVerified: true`. It links only when the stored event matches the request's frozen inbox, provider thread, and normalized recipient address, and that route identifies exactly one request. It rejects a different sender, ambiguous thread, duplicate provider message, or a request that already holds 10 replies. A successful link removes the event from quarantine atomically; repeating it is harmless.
4. If provider evidence is missing or any stored value differs, leave the item unchanged for later investigation. Do not create a replacement request or retry the original send as part of recovery.

These operations require an operator to verify provider state outside the app. They contain no credentials and do not establish that a real AgentMail round trip has occurred.

September 9, 2026: server credentials, a restricted owned test recipient and the public development webhook were configured. One approved request reached the test inbox; its reply was linked through the signed webhook. A replay of the same event produced a second successful delivery attempt and only one linked reply. Manual review, new-offer creation, save and recovery passed. No operator recovery or transport-timeout scenario was exercised against the real provider. The complete AI-assisted journey and video rehearsal remain pending. This delivery accepts text only; it does not process attachments or automatically extract prices from replies.

## Consulta desde estudio sin precio

Un estudio guardado muestra «Consultar a» para sus distribuidores de ejemplo. Se puede preparar y recuperar una solicitud de catálogo sin crear una comparación, oferta ni cantidad. Convex valida propiedad del estudio y pertenencia del distribuidor; el asunto y mensaje se generan desde esos datos guardados. La solicitud mantiene la referencia al estudio y al resultado.

El contacto encontrado no se convierte en destinatario autorizado: la demo usa exclusivamente el destinatario de prueba fijado en servidor. La UI lo muestra con el texto antes de requerir confirmación explícita. Guardar el estudio, preparar el borrador o recibir una respuesta no envía otro mensaje ni registra compra. Las respuestas se recuperan junto a la solicitud, sin extracción automática de precios.

El borrador editable para copiar sigue separado: sus cambios no se envían al correo. La UI explica cómo acceder al borrador de correo revisable. Además, las fuentes de investigaciones web completadas pueden revisarse y guardarse como candidatos, con consulta propia. Ver [distribuidores web](DISTRIBUIDORES_WEB.md). El contacto anotado sigue sin autorizar envíos.

## Oferta desde respuesta

«Revisar como nueva oferta» permite transcribir y confirmar una oferta del correo y abrir una comparación nueva guardable, o añadirla a la comparación actual guardada tras confirmar equivalencia. Esta incorporación conserva fuentes y cantidad y elimina la elección anterior. El servidor vincula la procedencia por solicitud/mensaje; no sobrescribe ofertas anteriores ni registra compra. [Contrato y límites](RESPUESTA_A_OFERTA.md). La extracción de precios del correo sigue siendo manual.




PR 6 review: signed reply text longer than 20,000 characters is retained up to that limit with an explicit truncation notice. Consult the original email for the full message. A signed-webhook regression verifies acknowledgement and bounded retention; this does not establish a real provider round trip.
