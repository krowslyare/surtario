# Etapas de desarrollo

**Current iteration after merged PR #36:** [contextual funnel and recovery](#september-19-2026--contextual-funnel-and-recovery), product landing and navigation refinements. Older test counts below belong to their dated deliveries. The current branch is being prepared for review; cloud publication and live-provider acceptance are separate.

Esta tabla es la fuente de estado del proyecto. Marcar una etapa completada solo con evidencia de su criterio de salida. El calendario del plan es orientativo; ante retrasos aplicar sus recortes, sin afirmar resultados no ejecutados.

The PR #36 review corrections are described in [the current consolidation record](CONSOLIDACION_DECISION.md#pr-36-review-corrections): comparison-only action routing, complete blocker projection and visible term/viability deltas. That record describes the preceding PR; its validation is distinct from the current funnel and landing work.

## Estado

September 17 live follow-up: [current provider checks](LIVE_PROVIDER_CHECKS.md) found real Firecrawl partial coverage (13 sources / 11 with text; 128.459 s), a missing AgentMail `inbox_read` permission, and absent OpenAI credentials/models. Added a reproducible redacted preflight/probe command. Full integrated API acceptance remains blocked; CI does not certify it.

| Etapa | Resultado | Estado | Evidencia actual |
| --- | --- | --- | --- |
| 0 | Repositorio organizado y plan ejecutable | Completada | README, guía, plan, revisión y primera entrega locales |
| 1 | Base de desarrollo y caso de compra calculable | Completada localmente | UI manual, 27 tests, 7 pruebas de navegador y build; comandos en README |
| 2 | Viabilidad de integraciones externas | En curso | Real Firecrawl discovery/product read and AgentMail round trip/replay passed. Local source inspection and real Luna replay now distinguish catalogs, products and missing prices. Direct OpenAI API and combined hosted acceptance remain pending; see source-analysis evidence below |
| 3 | Estudio de mercado y compra opcional | En curso | Unified saved study for reviewed web offers, no-price candidates and selected examples; manual/XLSX/CSV lists and synthetic image/PDF extraction implemented. Local study save/reload and manual boundaries verified; complete hosted acceptance pending |
| 4 | Solicitud, respuesta y decisión conectadas | En curso | Guided save/scenario/advice and explicit AI suggestions for linked replies implemented. Local Luna CLI exercised reply extraction, actual advisor tools and saved-analysis recovery; browser tests cover reply-to-new/existing comparison. The earlier real AgentMail round trip is recorded separately. Direct OpenAI API and the combined hosted journey remain pending |
| 5 | Demo pública aislada y robusta | En preparación | Reviewed main backend/frontend published to development on September 10; all eight hosted files match the build, SPA/404/unsigned-webhook checks and synthetic study save/reload/reopen passed. Complete provider journey and final public-demo acceptance remain pending |
| 6 | Impacto opcional en recetas | Pendiente, recortable | No condiciona etapas 3–5 ni entrega |
| 7 | Materiales y entrega del concurso | Pendiente | Requisitos documentados; nada publicado |
| P | Habilitación y validación de piloto privado | Pendiente, vía comercial independiente | No hay restaurante disponible |

Preparación del agente: skills cargados, MCP invocable pero status requiere autenticación. Backend local probado por CLI y HTTP; AI files instalados. Ver [SETUP_AGENTE.md](./SETUP_AGENTE.md). La evidencia de persistencia proviene de las pruebas de aplicación, no del estado del MCP.

Bloque de persistencia completado localmente: selección y fuentes recuperables, biblioteca reactiva, aislamiento de sesión y control de revisiones. Ver [evidencia y límites](./PERSISTENCIA_ESTUDIOS.md). No habilita datos privados ni completa la demo pública.

The integrated study, reply and advisor flow is implemented and verified locally. Reviewed web offers and no-price candidates share one recoverable study. Reply AI suggestions retain manual fallback and observed-attempt provenance; a single advisor action saves and analyzes the current scenario without duplicate calls on recovery. 173 unit/backend/configuration tests, all 54 browser journeys, frontend/backend typechecks and hosting checks passed. Computer use exercised the linked synthetic mail flow with real Luna CLI extraction and advice. Two separate real Firecrawl requests and recorded-source interpretation passed. See [integrated evidence](DEMO_FLOW_VALIDATION.md) and [source-analysis evidence](FIRECRAWL_SOURCE_ANALYSIS.md). The reviewed main backend and frontend were published to the dedicated development deployment on September 10; see [hosting verification](HOSTING.md). Combined live-provider acceptance remains pending.

Next: confirm the intended OpenAI account/project, configure its server key and compatible models, then verify web/document extraction and advisor tools against real responses. The separate Firecrawl and authorized AgentMail checks do not complete stages 2–4. Finish the combined hosted acceptance flow and rehearsal before treating the development preview as the final demo. See [provider procedure and dated evidence](./CREDENTIALS_AND_E2E.md).

Revisión visual aplicada: Manrope local y tokens verde bosque/blanco cálido; búsqueda y resultados como foco principal, herramientas al costado en escritorio y después de los resultados en móvil, precio normalizado destacado y acceso persistente al estudio. La portada ilustrada fue retirada. Ver [guía visual y evidencia](../diseno/UI_UX.md). No modifica el estado de integraciones ni habilita publicación.

Ensayo del guion actual completado en navegador: explorar → guardar/recuperar → consulta sin envío → compra opcional → totales comprobados. 36 pruebas de dominio/backend y 19 de navegador, build y smoke de cálculo local satisfactorios. [Guion y brechas de concurso](./ENSAYO_DEMO.md); video no grabado, integraciones y publicación pendientes.

## 1 · Base y caso de referencia

Objetivo: tener un proyecto ejecutable y un caso de compra cuyo resultado pueda comprobarse a mano.

Trabajo: revisar herramientas locales; preparar React/TypeScript/Vite y estructura Convex cuando haya acceso; crear datos sintéticos; implementar reglas puras de comparación y pruebas relevantes. Documentar comandos que realmente funcionen. Guardar un lockfile del gestor elegido.

Salida: interfaz local mínima, comparación de referencia correcta, errores de datos explícitos y documentación para ejecutarla. El backend puede quedar señalado como pendiente de vinculación si requiere una cuenta todavía no disponible; la etapa no se declara conectada a Convex sin prueba.

Aplicar la [guía de UI/UX](../diseno/UI_UX.md) desde esta etapa. No incluye OCR completo, exploración de nombre/logo definitivo, cuentas comerciales, recetas ni publicación.

## 2 · Pruebas tempranas de integraciones

Objetivo: comprobar las dependencias de mayor incertidumbre con el mismo caso de compra.

Trabajo y evidencia:

- Convex: escritura/lectura y actualización en dos vistas autorizadas del mismo caso. Registrar entorno real; no confundir estado React local con sincronización del backend.
- OpenAI: extraer un documento sintético claro y uno ambiguo; salida estructurada con origen y datos faltantes. No inventar contenido de empaque.
- Firecrawl: leer una fuente pública fechada con producto y unidad identificables. Registrar extracción y pertinencia por separado. Intentar el fallback acotado del plan si falla.
- AgentMail: solicitud a buzón de prueba y respuesta correlacionada mediante IDs. Usar destinos del equipo autorizados; no contactar restaurantes o proveedores reales.

Salida: resultados reales y limitaciones registrados. Un mock puede habilitar trabajo local, pero no cuenta como integración ejecutada. Si la fuente web no aporta al caso o no es extraíble, resolver esa decisión antes de pulir la demo.

## 3 · Mercado a estudio y compra opcional

Objetivo: un estudio útil sin recetas, documentos propios, cantidad ni historial.

Trabajo: explorar por insumo/categoría y zona; separar catálogo, distribuidor sin precio y referencia; revisar fuentes/fechas/contactos y conservar selección. Persistir estudios con aislamiento. Permitir enriquecer con documentos revisados cuando esté implementada extracción. Continuar a compra solo al confirmar equivalencia y añadir cantidad/condiciones.

Salida: estudio recuperable sin documentos ni cantidad; contacto sin precio conserva fuente sin asignar cero; búsqueda vacía no afirma ausencia de proveedores; categoría amplia no mezcla productos incompatibles. Al continuar a compra, mostrar paquetes, mínimo, excedente y desembolso sin inventar entrega o impuestos. Una oferta nueva no registra compra.

The current implementation saves selected examples, reviewed web sources and no-price candidates in local Convex. Browser recovery and owned-source reconstruction are verified. Real Firecrawl calls are recorded separately; combined hosted acceptance remains pending.

## 4 · Cotización a decisión

Objetivo: cerrar la interacción posterior, no terminar en una tabla de precios.

Trabajo: solicitud de un ingrediente a proveedores seleccionados; revisión previa al envío; respuesta vinculada a solicitud; comparación actualizada; decisión registrada. Texto copiable para WhatsApp con recepción manual de respuesta. Referencia web dentro del detalle del insumo.

Salida: flujo de los cuatro sponsors ejecutado; correo de prueba real; duplicados y timeout sin doble envío; respuesta sin correspondencia en revisión. Elegir oferta no compra ni cambia historial.

## 5 · Demo utilizable y aislada

Objetivo: permitir que un juez recorra el producto sin invitación ni acceso a datos privados.

Trabajo: sesiones independientes, documentos sintéticos incluidos, límites por sesión y globales, destinatarios restringidos en servidor, webhooks verificados, fallos/reintentos visibles y captura móvil revisada. Preparar hosting compatible con el concurso.

Entrada pública con «Probar ejemplo», sin planes de suscripción, checkout ni pago para explorar. Los precios de insumos sí forman parte de la comparación.

Development hosting is published with `@convex-dev/static-hosting` 0.2.1. HTTPS root and hashed assets match the build, extensionless routes return the SPA shell, missing assets return 404, and the webhook rejects unsigned requests. The full provider journey and final release acceptance remain pending. See [hosting contract and evidence](./HOSTING.md).

Salida: dos visitantes no interfieren; no se permite envío arbitrario ni acceso a archivos ajenos; fuente vieja lleva fecha; el E2E completo pasa. Verificar URL real después de publicar dentro del alcance autorizado. Si sigue local, registrar «preparado para desplegar», no «publicado».

## 6 · Recetas como extensión opcional

Se empieza solo con el ciclo de compras estable y tiempo disponible. No bloquea el resultado principal.

Trabajo: vincular de una a tres recetas a insumos existentes, cantidades y rendimiento confirmados; cálculo determinista por porción; mostrar compra base frente a escenario de oferta. Preparaciones base y porcentajes de margen se recortan primero.

Salida: impacto correcto y trazable, sin duplicar merma ni confundir escenario con compra. Receta incompleta no afecta compras. Si se omite, el guion alternativo demuestra seguimiento de nuevas ofertas.

## 7 · Entrega de hackatón

Trabajo: revisar requisitos oficiales vigentes antes de entregar; actualizar registro factual, README y enlaces; grabar recorrido menor de tres minutos; revisar contenido a publicar; preparar publicación social y envío a la plataforma del concurso.

Salida: repo público y URL admitida accesibles, video reproducible, registro consistente con lo construido, publicación y recepción de entrega verificadas cuando estén autorizadas y ejecutadas. No marcar entrega completa por tener solo borradores.

Los documentos privados y conversaciones no forman parte del material público. Las reglas verificadas durante planificación, fuentes, fechas y guion están en la sección 11 del plan.

## P · Piloto privado y venta inicial

Esta vía se activa cuando haya contacto; no condiciona la demo sintética.

Antes de documentos reales: usuario administrador autenticado, aislamiento entre restaurantes y demo, archivos restringidos, exportación/borrado y recuperación probados, explicación de tratamiento de datos y soporte definido.

Primer caso: una pregunta de mercado de un insumo y zona. Registrar alternativas pertinentes, utilidad de fuentes/contactos, esfuerzo del usuario y acompañante, y segundo uso del estudio. Medir por separado la continuación opcional a compra con dos ofertas y una cantidad. Probar precio con oferta concreta después de observar valor; no exigir recetas ni dar demanda por validada.

Salida comercial inicial: uso real y continuidad medidos, con resultados y rechazos documentados. Para venta más amplia, aplicar condiciones del plan; una demo funcional no significa preparación comercial general.

## Cómo cerrar cada etapa

En la fila correspondiente, registrar estado y enlace a evidencia breve: archivos, prueba/comando y resultado, entorno y limitaciones. En `hackathon.md`, añadir lo realizado ese día. No mantener otros checklists de estado duplicados ni abrir infraestructura de tareas antes de necesitarla.

## Entrada de listas · evidencia local

Entrada manual, XLSX/CSV con elección de hoja/columna y revisión de nombres implementados. Fotos/PDF conservan origen y permiten transcripción manual; OCR pendiente. Archivo/lista transitorios en navegador, sin uploads ni ofertas creadas automáticamente. 41 pruebas de dominio/backend, 24 E2E y build satisfactorios. [Alcance, límites y evidencia](./ENTRADA_INSUMOS.md). Etapas 2–4 continúan abiertas hasta ejecutar las integraciones reales.

## Preparación de Firecrawl · evidencia local

Action interna y adaptador de búsqueda acotada implementados. 47 tests y build satisfactorios; action cargada en Convex local, bloqueada sin clave y no invocable por cliente público. Sin petición real ni conexión a la UI/persistencia. [Configuración y secuencia de integraciones](./INTEGRACIONES.md). La etapa 2 sigue abierta.

## Extracción y revisión · entrega independiente

Prueba interna OpenAI con dos textos sintéticos y revisión UI de propuesta/evidencia/corrección implementadas por separado. Componente Agent registrado localmente; sin llamada de modelo verificada ni OCR. Revisión permite pasar a comparación conservando originales y pendientes. 53 tests, 26 E2E y build satisfactorios; [evidencia y límites](./EXTRACCION_REVISION.md). No completa etapas 2–4.

PRs por entrega: extracción/revisión se revisa contra la rama base del PR 1; condiciones/decisión y correo irán en cortes posteriores. Ningún PR se fusiona por el solo hecho de tener pruebas locales correctas.

## Condiciones y elección · entrega independiente

Comparaciones de arroz/catálogos sintéticos recuperables con cantidad, condiciones, evidencia original y opción elegida. Elegir no registra compra. Fuente histórica conservada al retirar ofertas; revisión adversarial encontró y verificó esa corrección. Aislamiento por sesión, conflictos de revisión, límites y decisiones incompletas probados. [Contrato y límites](./PERSISTENCIA_COMPARACIONES.md). APIs externas y despliegue siguen pendientes; esta entrega no completa la etapa 4.

Verificación de este corte: 58 pruebas de dominio/backend; 30 E2E completos y una regresión adicional de confirmación tardía (31 casos en total), build y query local de la nueva tabla correctos. Revisión visual de comparación en 390/1280 px y pruebas de reflujo existentes satisfactorias.

## Búsqueda web conectada · entrega independiente

Implementado recorrido Firecrawl → fuentes persistentes → extracción explícita OpenAI → revisión y comparación. Habilitación y credenciales ausentes en local: llamadas reales y pertinencia pendientes. 65 pruebas de dominio/backend, 33 E2E y build; caso positivo con proveedores/transporte simulados, separado de consultas locales reales. Revisión adversarial corregida y límites de consumo probados. [Contrato y evidencia](./BUSQUEDA_WEB.md). No completa etapas 2–4; AgentMail y persistencia de correcciones web siguen pendientes.

## Revisión web guardada · entrega independiente

Correcciones confirmadas, condiciones y elección de fuentes web recuperables mediante referencias a investigaciones de la misma sesión. Evidencia y propuesta originales reconstruidas por servidor; sin documentos privados. 68 pruebas de dominio/backend, 34 E2E y build satisfactorios; recorrido de revisión/guardado/recarga ejecutado en Convex local con fuente sintética. [Contrato](./REVISION_WEB_GUARDADA.md). Llamadas de sponsors y AgentMail siguen pendientes.

Lectura de PNG/PDF sintéticos preparada con revisión visual y clasificación documental. Resultados del modelo, correcciones confirmadas, condiciones y elección persistentes; recuperación documental probada en Convex local. Ver [alcance y evidencia](LECTURA_DOCUMENTOS.md). No completa la extracción real ni habilita archivos privados.

Fuentes web sin precio conectadas a una biblioteca de candidatos revisados y consultas persistentes. [Contrato y evidencia](DISTRIBUIDORES_WEB.md). Búsqueda externa y correo real pendientes; no se habilitan envíos a contactos encontrados.

Respuesta revisada incorporable a la comparación actual tras confirmar equivalencia, conservando cantidad y fuentes y dejando pendiente una nueva elección. [Contrato y verificación local](RESPUESTA_A_OFERTA.md). No completa el recorrido externo de correo.


Revisión del PR 1: corregidos valores supuestos de unidad/mínimo y resumen entre ofertas compatibles. 47 tests, build y 8 E2E de comparación pasan en el checkout aislado del PR; integraciones externas y entrega pública siguen pendientes.

Segunda ronda del PR 1: diálogo conserva entradas al pulsar dentro; procedencia manual fechada según calendario local. 47 tests, build y 9 E2E de comparación aprobados; no modifica el estado de las etapas externas.

PR 2 review preparation: integrated the reviewed PR 1 fixes from main; 53 tests, build, and 11 comparison/extraction E2E tests passed locally. External integration stages remain open.

PR 3 local review: integrated main and cleared stale save notices when restoring a new draft. Independent Sol 5.6 review adjudicated by Astra; 58 tests and build passed, plus five persistence UI checks against the existing local backend. External integrations remain unverified.

PR 4 local review: integrated main, 65 tests/build and 35 E2E checks passed. Sol 5.6 review adjudicated by Astra found no material blocker. Provider behavior remains simulated; stages 2–4 still require real integration evidence.

PR 5 local review: integrated main; Sol 5.6 review adjudicated by Astra found no material findings. 68 tests/build passed; 35 E2E passed initially and the web-persistence case passed with temporary local CLI configuration adjustment. External provider validation remains pending.


## PR 6 · local review
Reviewed main integrated. Fixed signed long replies returning a persistent server error by retaining bounded text with a visible truncation notice. Validation: 78 domain/backend tests, build and six focused browser checks passed; browser persistence used the existing local backend with later code. Mail transport remained simulated. External integration stages remain open.


PR 8 local review: Integrated reviewed main into synthetic image/PDF extraction. Corrected comparison labels that misrepresented documents as public web pages. The PNG preview represents the same PDF content, verified against the fixture. Human review and server-owned file limits remain enforced. 85 tests/build and 2 focused browser checks passed. Real provider verification and deployment remain pending.


PR 9 local review: Integrated reviewed document extraction into persisted document comparisons. Sol review and parent adjudication found no additional material issues. The browser seed command temporarily used the original local checkout configuration; that test-only adjustment was removed. 88 tests/build and 1 focused browser checks passed. Real provider verification and deployment remain pending.


PR 10 local review: Integrated reviewed main into catalog requests from saved studies. Sol review and parent adjudication found no material issues in ownership, origin-bound retries, fixed test recipients or explicit send approval. 89 tests/build and 2 focused browser checks passed. Real provider verification and deployment remain pending.


PR 11 local review: Integrated reviewed main into web distributor candidates and linked inquiries. Sol review and parent adjudication found no material issues. Sources are reconstructed from owned research, and found contacts never authorize email delivery. The temporary local CLI working-directory adjustment for browser setup was removed. 91 tests/build and 1 focused browser checks passed. Real provider verification and deployment remain pending.


PR 12 local review: Integrated reviewed main into manually reviewed reply offers. Sol review identified misleading source labels and malformed reply dates; inherited neutral provenance labels and pending-date handling now preserve unknown dates without crashing or substituting request dates. Regression covers persisted malformed reply dates and browser recovery. Temporary browser CLI setup adjustment removed. 94 tests/build and 1 focused browser checks passed. Real provider verification and deployment remain pending.


PR 13 local review: Integrated reviewed main into adding reply offers to existing comparisons. Sol review found a stale-query save bug; the client now tracks confirmed server revisions so a second save does not append an already persisted reply. Parent adjudicated and tested the fix. Final browser suite passed 43 cases initially; the remaining web-source link selector was updated for the corrected provenance label and then passed. All 44 cases passed across those runs, including the demo rehearsal. Temporary CLI setup adjustments were removed. 97 tests/build and 44 focused browser checks passed. Real provider verification and deployment remain pending.


## Purchasing advisor · local delivery

Implemented an optional decision context, deterministic cash/coverage scenarios, an executive verdict and a copyable negotiation draft. Owned snapshots persist comparison revision and evidence; changed inputs visibly invalidate the previous analysis. The bounded Agent action uses read-only calculation/evidence tools and remains disabled without explicit server configuration. Independent review findings were corrected. 110 domain/backend tests, build and eight focused local browser checks passed. See [advisor contract and verification](ASESOR_COMPRAS.md). Stages 2–5 remain open for real provider validation and public deployment.


## Operator mail recovery · local delivery

Internal-only inspection and reconciliation now cover uncertain sends and quarantined replies. A verified provider receipt cannot be assigned to another request; reply linking checks the frozen inbox, thread, sender and limits atomically. No recovery function sends or retries email. Independent review corrected incomplete queue visibility and receipt collisions. 116 combined domain/backend tests, frontend/backend typechecks and build passed. The real mail round trip remains pending; see [operator procedure](AGENTMAIL.md).


## Saved ingredient lists · local delivery

Reviewed manual and spreadsheet names can be saved by session and recovered after reload without uploading the file or creating offers. Server-derived origin labels, input/storage limits and immutable retries are enforced. A delayed confirmation does not mark a replacement queue saved. 121 combined domain/backend tests, build and ten focused local browser checks passed. [Contract and verification](SAVED_INGREDIENT_LISTS.md). Private documents, external providers and public deployment remain pending.


## Integrated hackathon implementation · local verification

Advisor, operator recovery, saved ingredient lists and static-hosting preparation were integrated in separate deliveries. The complete local suite passed: 122 domain/backend tests, frontend/backend typechecks, hosting build/asset checks and 49 browser journeys including the demo rehearsal. The first full pass caught an advisor context reset during initial comparison save; the corrected flow now preserves edits until the logical draft is replaced. The local test harness allows only the selected backend and Vite origins and serializes shared snapshot imports.

Implementation for this agreed demo scope is prepared. Real Firecrawl/OpenAI/AgentMail behavior, hosted HTTP behavior, public visibility and contest materials remain unverified; stages 2–5 and 7 are not complete. Follow [provider configuration and complete E2E](CREDENTIALS_AND_E2E.md). Recipes and private restaurant data remain separate extensions.


## PR 14 · local review

Independent Sol review and parent adjudication corrected interrupted advisor executions that could remain running indefinitely. A durable internal expiry preserves the calculation, does not retry the model, and ignores late completion. The initial-save context fix was moved into this delivery so budget and usage survive the first comparison save.

112 domain/backend tests, frontend/backend typechecks and build passed. Three advisor browser journeys passed on the PR frontend using the existing synthetic local backend; the exact changed backend was tested in memory. Real provider behavior and public deployment remain pending.


## PRs 15–17 · local review and integrated verification

Independent Sol review and parent adjudication found no material issues in operator mail recovery or saved lists. After integrating the reviewed advisor fixes, PR 15 passed 118 unit/backend tests and PR 16 passed 123; both passed frontend/backend typechecks and build.

The hosting review found that browser tests could reuse a Vite process connected to another local backend. Playwright now starts its own server and refuses an occupied port; all persistence guards, including delayed-response overrides, validate the selected WebSocket origin. A real occupied-port invocation was rejected before running tests, and negative socket checks passed.

The final combined code passed 126 unit/backend tests, frontend/backend typechecks, hosting build/asset checks and all 49 browser journeys, including the demo rehearsal. The existing anonymous local backend accepted the updated functions. Provider calls remained simulated or disabled; no cloud deployment, public visibility change or contest submission occurred. Stages 2–5 and 7 retain their external verification requirements.


### September 9, 2026 — real provider and development hosting checks

Configured a dedicated cloud development deployment using the author's provider consoles. A real internal Firecrawl probe returned three Peruvian catalog sources; prices, equivalence and coverage were not yet extracted or validated by OpenAI. A synthetic study without quantity or price produced one reviewed AgentMail request to an owned test inbox. The reply arrived through the signed webhook (`200 Accepted`); replaying that same event succeeded while the app retained one reply. The manually reviewed offer was saved and recovered at PEN 4.80/kg and PEN 96 for 20 kg. No purchase was recorded.

The development frontend is reachable over HTTPS, with build matching root/assets, SPA fallback, asset 404 and unsigned webhook rejection verified. The hosted fixture empty-result state and separate browser-origin session were checked. OpenAI account selection, actual model compatibility, document extraction, advisor tools and the complete hosted two-session journey remain open. Provider latency was not instrumented. Evidence and reproduction boundaries: [provider acceptance](CREDENTIALS_AND_E2E.md), [hosting](HOSTING.md).


## 2026-09-09 · procurement workspace experience

Reworked research into a main evidence column with study tools alongside; mobile prioritizes results and provides a keyboard-accessible shortcut to list/file tools. Comparison quantity now precedes saving. Unified forest/sage tokens, shared SVG identity, restrained native motion and persistent dialog headers apply across the existing flows. The document disclosure preserves review drafts.

126 domain/backend tests, all 51 browser journeys in one final run, typecheck/build and hosting-asset validation passed locally. Chrome computer use reviewed desktop and 390px mobile, while the suite covers 320/390/768/1280px reflow and reduced motion. See [design decisions and verification](../diseno/PULIDO_EXPERIENCIA.md). The local CLI fixture setup was corrected before the final run; no cloud or provider settings changed. This delivery does not complete stages 2–5 or restaurant validation.


## 2026-09-09 · Luna CLI provider rehearsal

The isolated local application completed a Chrome computer-use journey with real `gpt-5.6-luna` CLI generation and simulated Firecrawl/AgentMail transports. Reviewed web offers, a distributor without price, explicit send approval, duplicate signed reply delivery, reply-to-comparison, PNG/PDF reading, XLSX/manual lists and saved scenario recovery were exercised. At 20 kg, the verified synthetic comparison required PEN 100 versus PEN 590; the latter received 125 kg and left 105 kg excess. The difference is cash required, not realized savings.

The rehearsal exposed and fixed a missing context scope at all stateless Agent call sites and advice that repeated stale source conditions after user review. The real Agent/AI SDK now run in regression tests with only HTTP replaced; no thread history or messages are stored. Research errors are sanitized for users and an unchanged saved verdict is shown once. The local-only transport rejects cloud/ambiguous targets and strips credentials before forwarding.

138 unit/backend tests, frontend/backend typechecks and hosting build checks passed. All 51 browser journeys passed on a separate anonymous backend. A shared-dependency font warning in that test checkout was corrected with its own install, followed by 12 passing focused visual/keyboard checks. Chrome inspected the actual rehearsal at desktop and 390 × 844, including the native file picker. Six substantive Luna calls completed in 8.1–13.3 seconds; these are local sample timings.

See [reproduction steps, failures and evidence boundaries](LUNA_REHEARSAL.md). Direct OpenAI API calls, the combined hosted provider flow, contest recording/submission and private restaurant validation remain pending. Stages 2–5 and 7 are not marked complete by this simulation. Cloud settings, repository visibility and production were unchanged.


## PR review closure — September 10, 2026 UTC

PRs #18 and #19 were merged after GitHub Codex review; independent local review additionally caught stale examples after a different web query, now fixed without losing saved research or the selected study. PR #20 review fixes enforce the rehearsal notice and preserve server-derived synthetic provenance through source review, saved comparisons and advisor evidence. Existing records are not reclassified.

147 unit/backend/configuration tests, frontend/backend typechecks and hosting checks passed. Browser verification covers all 51 journeys: 49 passed in the complete run; two fixture setup calls needed the newly required internal provenance argument and passed after correction, including synthetic source recovery. Computer use in the in-app browser verified the rice-to-fish transition and selected-study recovery; a fresh Luna CLI extraction used the persisted synthetic marker. Chrome computer use timed out in this review session. This closure changes GitHub code, not the hosted deployment or the outstanding real OpenAI API acceptance.

The final GitHub review also identified bundled PNG/PDF sources marked as live. Both the review input and server reconstruction now retain synthetic provenance, with save/update assertions and focused browser document checks. This changes source classification, not whether extraction uses a real model.


## Real Firecrawl source quality — September 10, 2026

Seven real attempts on the existing cloud development probe covered four ingredients, a negative control and two targeted follow-ups. The five initial queries returned 15 sources: four lacked Markdown, one contained a site error, two were truncated and all three negative-control sources were irrelevant. Mundo Abarrotes preserved a readable price/presentation pair; other results exposed conflicting units, missing prices and contact-only opportunities. Exact targeted rice search returned no sources; targeted oil search timed out without a retry.

Manual source inspection, sanitized measurements and the next bounded implementation slice are in [FIRECRAWL_VALIDATION.md](FIRECRAWL_VALIDATION.md). No model extraction, email, study writes or deployment occurred. Provider discovery is verified, but relevance and price-extraction acceptance remain open; stages 2–4 are not complete.


## September 10, 2026 — final integrated local pass

Unified market studies preserve owned reviewed web offers, no-price candidates and selected examples through save/reload, with consistent counts and ingredient/location bounds. Linked replies now support explicit AI suggestions with manual fallback, immutable attempt provenance and protection for edits made while extraction runs. The advisor sits before detailed tables and has one save/scenario/optional-AI action, with positive-quantity checks, semantic reuse and full draft guards.

173 unit/backend/configuration tests and all 54 browser journeys passed on the combined code; frontend/backend types and hosting build/asset checks also passed. Independent adversarial review closed after the material fixes. Desktop and mobile visual checks plus real Luna CLI computer use covered study recovery, a synthetic mail reply, PEN 94 for 20 kg and an executive verdict that correctly requested another offer. Two real Firecrawl calls and the official skill are recorded with dated provenance. No direct OpenAI API call, external email, cloud deployment, visibility change or contest submission occurred in this pass. Stages 2–5 and 7 retain their remaining acceptance requirements.


## September 10, 2026 — PR review closure

PRs #21–#25 are merged after independent Sol 5.6 review, with PR #23 reviewed by Luna, and parent adjudication. PR #24 verifies Firecrawl search provenance: discovery candidates remain reviewable while markdown is withheld when `metadata.sourceURL` or `metadata.url` identifies another page; canonical URL normalization preserves valid same-page metadata, and absent metadata keeps the prior behavior. PR #25 synchronizes linked-reply extraction with the reactive query, preserves manual edits as an explicit pending suggestion and ignores stale responses. PR #26 corrects the accepted-state fingerprint to use only active offers while retaining historical source records; its review and fix verification are complete.

The current integrated pass has 175 unit/backend/configuration tests and 10 focused browser journeys passing (four reply/research checks and six advisor checks), with frontend/backend typechecks and hosting build/asset checks. The previous delivery covered all 54 browser journeys. This review state is local evidence only: no new cloud deployment, provider call, repository visibility change or contest submission is recorded. Stages 2–5 and 7 retain their provider and hosted-acceptance requirements; those remain separate from PR review completion.


## September 10, 2026 — reviewed main development deployment

PRs #21–#26 are merged; `6ed1dd1` was the deployed application revision. Published its backend with `convex dev --once` and frontend with `deploy:hosting:dev` to the existing development target. All eight hosted files matched the build by SHA-256; SPA reload, missing asset 404 and unsigned webhook rejection passed. In-app browser verification saved a synthetic rice study with a priced offer and a no-price distributor, then recovered both after reload. See [hosting evidence](HOSTING.md).

The requested stop is after this deployment. Provider keys/gates, production and repository visibility were unchanged; no external provider call or email was sent. Direct OpenAI API, the combined hosted provider journey, branding, timed recording and submission remain pending. Stages 2–5 and 7 retain those acceptance requirements.


## September 12, 2026 — local Surtario UI integration

Integrated the Surtario identity and polished market/comparison presentation with the reviewed `main` application behavior. Unified studies, saved ingredient lists, source-quality review, linked-reply extraction, the purchasing advisor and hosting/rehearsal guards remain present. The visual layer retains bundled brand assets and fonts, aubergine/radish/chili tokens, reduced-motion handling and shared controls; no provider, deployment or environment setting changed.

The 175 unit/backend/configuration tests and frontend production build passed in the isolated integration worktree. Headless desktop and mobile checks found the expected Surtario identity and zero horizontal overflow. A focused browser run was not completed because the already-running anonymous local backend lacked `advisor:status`; this entry does not replace the earlier 54-journey evidence or claim fresh persistence/advisor E2E coverage.


## September 12, 2026 — English-first product and US decision flow

Integrated the existing Surtario visual work with the current research, unified studies, quote/reply review and advisor workflows. English is the product language; a fictional Portland rice example uses explicit USD/lb, and Peru fixtures remain available for PEN/metric regression. Source evidence retains its original language. Shared controls, keyboard submission, saved-research navigation and distributor inquiries operate within the active saved study.

The new missing-freight insight calculates a boundary against an eligible same-currency offer, supports a clearly hypothetical cost, and requires a separate confirmed-term edit. Independent Sol review identified and closed scoped state, unit/currency and accessibility-label findings. GitHub review corrections on PR #27 add all lb/oz review selectors and align interim language and scope documentation. A real Luna rehearsal found a client/server evidence mismatch that hid fresh advisor output; shared evidence construction and a round-trip regression fix it.

197 unit/backend/configuration tests and all 63 browser journeys passed locally, with frontend/backend typechecks and hosting checks. Three real Luna CLI calls covered extraction and advisor generation; corrected saved recovery made no new model call. Discovery/page data and mail transport in that rehearsal were synthetic. See [product validation](ENGLISH_PRODUCT_VALIDATION.md) for evidence and limits. The original working tree remains separate. No cloud deployment, external email, visibility change or contest submission occurred. Stages 2–5, 7 and private-pilot enablement retain their outstanding acceptance requirements.


PR #27 is the reviewed prerequisite for US measurements. Its follow-up d26b14c includes editable lb/oz selectors, documented authorized scope, and coherent Spanish guidance during that intermediate delivery. Its 182 tests, both typechecks, build and GitHub CI passed. The dependent product integration supersedes the intermediate language with English UI and model explanations together.


Final Luna max review found that saved source snapshots include unselected distributors. The product now uses saved selection IDs for inquiry controls, and `quotationMail.create` rejects unselected distributors on the server. Both US/Peru regression cases failed before the correction and passed afterward. The corrected pass has 199 unit/backend/configuration tests, three targeted browser journeys and the full 64-journey browser suite passing, plus both typechecks and hosting checks. Both PRs have passing GitHub test/build checks.


## September 13, 2026 — finding-to-decision follow-through

The missing-freight insight now contains the supplier question, hypothetical amount, before/after DSS recommendation and explicit supplier-answer confirmation. It reuses the current advisor priority and constraints. Confirmation edits freight only; the resulting panel states whether the recommended action changed and can save the comparison. Saved freight survives reload; the before/after recap remains current-view state. No automatic selection, purchase or outbound message is added.

205 unit/backend/configuration tests, 13 focused browser journeys, both TypeScript checks and hosting checks passed locally. The focused flow checks confirmation reset, actual unit-price context, focus, mobile layout and saved recovery. Independent Luna max review found an enabled save action when site storage was blocked; the correction gates saving on session/query/connection readiness and includes a passing browser regression. The prior baseline covered all 64 browser journeys. See [the flow contract and evidence](DECISION_FOLLOWTHROUGH.md). Provider, hosted acceptance and private-pilot gates remain unchanged.

## September 13, 2026 — compact product entrance

The root route now presents the English Surtario landing with existing brand photography and an interactive fictional delivery example. The workspace loads on entry and remains directly available at `/?view=market`; comparison/brand and legacy Peru links remain supported. No backend/schema or provider behavior changed.

205 unit/backend/configuration checks and hosting build passed. All 67 browser journeys were verified across the complete run and focused corrections/rechecks. The new landing checks keyboard, reduced motion, back/reload and 1920/1440/390/320 px reflow. See [landing behavior and evidence](../diseno/surfaces/LANDING.md). No cloud deployment or repository visibility change.

Independent Sol review returned `ship` with no material fixes after inspecting all four captures, the established design contract and routing/product truth. Luna could not complete the initial review because of a usage limit; Sol performed the replacement review.

## September 13, 2026 — pre-merge Sol correction

Fresh Sol pre-merge review found a contradictory save status for reviewed web studies outside sample markets. Status now uses the same eligibility as the save button. The Arequipa prospect regression failed before the fix and passed afterward, including save/recovery; all six affected browser journeys passed across the focused run and corrected message expectation. 199 unit/backend tests and hosting checks passed. The English UI contract now explicitly preserves original Spanish Peru data/citations without promising bilingual controls. Sol rechecked and closed the finding. No deployment or external provider call.


## September 14, 2026 — persistent sourcing cases and selected-source watches

Persistent sourcing cases now connect an optional saved study, bounded research self-loop, reviewed comparison updates and versioned supplier messages. Explicit source watches run daily for seven days and preserve changed/unverified observations for human review. AI can propose research steps, evidence and inquiry text; it cannot approve an email, select its recipient or record a purchase. The UI recovers cases, highlights the next action and exposes dated history and supporting details on demand.

Local verification covers capability ownership, canceled/late work, duplicate events, immutable mail approval, stale comparison revisions, saved-study context, offline recovery and responsive layouts. Provider calls in these tests are mocked or synthetic. The workflow component is registered; no cloud deployment or provider flags were changed. Real OpenAI API behavior, the combined hosted flow and a seven-day live watch remain unverified. See [the architecture and configuration contract](CASOS_ABASTECIMIENTO.md).

Independent pre-PR review found and closed two continuation defects: unchanged case comparisons now retain their selected offer, and replies opened directly from a study update the existing case comparison instead of creating an unlinked one. Added focused browser regressions for both. Fresh verification passed 222 unit/backend tests, frontend/backend TypeScript and hosting checks. The full browser run passed 71/72; the remaining failure was an incomplete research-module test stub, corrected without removing assertions. The new direct-study reply test and both workspace tests then passed; selection recovery was checked separately. This is local synthetic evidence; CI and hosted acceptance are separate checks.


## September 15, 2026 — supplier reply delivery confirmation

A linked supplier reply can resolve freight in the existing comparison after explicit human confirmation of offer, amount, currency/tax basis and exact evidence. Before/after reports use the same buying preferences and persist with the comparison revision. Other terms stay unchanged, prior selection is cleared, and stale/conflicting confirmations are rejected. A late response preserves newer local drafts.

225 unit/backend tests, frontend/backend TypeScript and hosting checks passed locally. Seven affected browser journeys passed, including both delivery confirmation paths (normal and delayed), reply extraction recovery and study/case continuity. Mobile/reduced-motion captures were checked. Independent review closed both findings; no remaining material findings. Evidence is synthetic and local. No cloud deployment, external email or new AI inference was performed. Hosted provider acceptance remains separate.


## September 15, 2026 — cloud acceptance and supplier-dialog readability

Development deployment `incredible-wolverine-122` was updated from main at `dfd3e02612fc930b544e4d0af2df6e34ba2789f4`, then received the frontend changes from `codex/cloud-demo-acceptance-0915` (uncommitted). Real Firecrawl search returned public rice sources; an unpriced candidate and its study survived reload. `LIVE_RESEARCH_ENABLED` is enabled. OpenAI remains unavailable and explicitly deferred by the user.

Two synthetic requests were delivered through AgentMail to the configured test inbox; three replies returned through the signed webhook. Manual review created a 40 lb comparison: two 20 lb bags at USD 18, freight initially pending. A linked reply supplied USD 4 delivery, giving USD 40 total. Confirmation preserved the exact quote, updated the existing comparison and enabled selection. Reload recovered revision 4 with the selected offer and USD 40 total. No purchase or real supplier commitment was made. Browser sessions showed separate saved-study lists; this is UI isolation evidence, not a new adversarial authorization audit.

The live walkthrough exposed excessive email/history text, mixed interface language, a zero count for one selected web candidate and lost comparison continuity when reviewing that candidate's reply. Dialogs now use a bounded literal email preview, expandable original/history, clearer form spacing and explicit delivery/total amounts. Candidate replies retain the sourcing-case comparison and can confirm freight without a second request. Historical cloud data created before this correction was completed through its already-linked test request.

Verification: 225 unit/backend tests passed; build/hosting checks passed. Seven affected browser journeys passed across the focused run and targeted recheck, including direct-candidate freight, original evidence, stale/delayed responses and extraction updates preserving edits. Desktop/mobile captures were inspected, then the hosted real-email dialog was inspected and refined. Cloud publication matched 30 build files and checked SPA fallback/missing assets. These frontend changes have no commit, PR or CI result yet. Automatic deployment remains separate pending work. Live OpenAI extraction/advice and a seven-day watch remain unverified.


## September 15, 2026 — development publication PR preparation

Consolidated the cloud-tested supplier-dialog changes with the prepared main-only deployment job so automatic publication retains the tested UI. The workflow tests before publishing, rejects missing/non-dev/wrong-target keys, serializes deployments and compares all published files plus SPA/missing-asset behavior. `CONVEX_DEV_DEPLOY_KEY` exists in GitHub; its value was not read. Pull requests do not deploy or receive that credential. First Actions deployment and live credential acceptance remain pending until merge.

Pre-PR review checked candidate/case linkage, retained full email evidence, pending freight and deployment target/secret boundaries. Fresh verification passed 233 tests (including eight credential guard cases), TypeScript/build/hosting checks and workflow YAML parsing. The seven focused UI journeys and real hosted acceptance above remain the behavioral evidence. No additional provider call or deployment was needed for this consolidation.


### September 15, 2026 — direct comparison example and select focus
The direct comparison entry now defaults to a separate English synthetic rice comparison (USD/lb, Supplier A/B); explicit `example=pe` retains the original Peru fixtures. Initial source evidence and reset use the same active example. Saved/reviewed offers retain their original terms. Select options use an inset aubergine focus ring instead of the clipped blue global ring; keyboard navigation and Escape/focus return remain supported.

Entrada al workspace refinada localmente con transición de marca y recuperación ante fallo de descarga; guía de marca solo en desarrollo. Evidencia 2026-09-16 en INTERACCION.md; sin despliegue.


## September 17, 2026 — isolated Firecrawl research PR

Separated research from the pending UI refinement and saved-example work. The change adds bounded diversified discovery, independent page reads, canonical deduplication, conservative cited-field extraction and adaptive research with explicit stop reasons and preserved per-round evidence. Real-provider records from September 16 remain historical local evidence; they do not certify hosted behavior or complete commercial terms.

Fresh validation of this research-only tree: 263 tests across 42 files, frontend TypeScript/build and hosting asset checks passed; two focused research browser journeys passed with simulated transport. They exercise source review, corrections, cross-round selection, original evidence, pending totals and page-read classification. UI redesign and source-dialog disclosures are intentionally excluded. Codex PR review and CI follow publication. Merging main triggers the existing development deployment workflow; check active sourcing workflows before that publication.

Codex Review of PR #35 identified three issues: Spanish adaptive rounds ignored refinements/exclusions, decimal-comma citations could lose supported values, and catalog children could repeat a previously read URL. Corrected all three. Eleven additional cases cover Spanish/English localized refinement, exclusion of prior catalog links, decimal/grouping formats and rejection of concatenated fabricated numbers. Eight regression cases failed on the reviewed commit; all 274 tests pass after the fixes. Frontend/backend types and hosting build checks passed. Remote CI of the final commit remains the merge gate.


## September 19, 2026 — contextual funnel and recovery

The PR #37 working tree starts from merged PR #36 on `codex/funnel-sourcing-connect`. Unpriced distributor actions atomically save the selected evidence, reuse its sourcing case and prepare/reopen a quotation draft. Reviewed public candidates can instead open a prefilled research question. Neither entry runs research or sends email; existing human approval, recipient restrictions, session ownership and stale-revision guards remain in effect. No tables or provider settings changed.

Home now presents one `Continue your work` hub. Rows group only explicit record links, identify the next required action and retain access to their original source searches. Independent work with identical ingredient/area remains separate. Search has one primary action whose label states live versus demo mode; failed live search exposes an explicit sample alternative. Catalog and reviewed-offer cards enter purchase calculation directly; quantities, uncertain terms and existing case selections are preserved.

Local verification passed 299 unit/backend/configuration tests across 46 files (two workers), frontend/backend TypeScript and the 32-file hosting build check. The 99-journey browser run passed 97; its two failures were obsolete expectations for the replaced transient inquiry and the import warning already changed on main. Both passed after updating those expectations. A subsequent focused pass verified 19 affected journeys; its new failed-search test used an incorrect region locator, then passed in the final six-journey funnel run. Together these runs cover all 102 browser journeys; this is not a claim of one uninterrupted 102-test run on the final tree. Desktop/320/390 px screens were inspected and the mobile header overlap was corrected. The new mutation's five focused tests also passed after checking that retries create only one mail event.

Review covered session ownership, stale revisions, atomic rollback if quotation creation fails, duplicate preparation, preservation of linked comparisons/selections, independent same-market records and recovery of unselected source evidence. Tests used synthetic records and an isolated local backend; no real provider call, email send, cloud deployment, commit, push or PR publication was performed. API/hosted acceptance remains separate.

### September 19, 2026 — continuity presentation refinement

The empty hub now has a structured card with an icon, title, explanation and starting hint. Saved work appears in a bordered list capped at 360 px (or 55% of the viewport height), with a separate saved-item count, row hover/focus feedback and keyboard scrolling. Loading and error states retain the region heading; grouping and recovery behavior are unchanged.

Frontend TypeScript and the 32-file hosting build check passed. Five existing funnel journeys passed; the extended continuity test passed after correcting a substring selector that also matched “prices” when checking “Rice”. It verifies eight independent entries, exact same-ingredient separation, bounded scrolling, keyboard opening and no page overflow at 1920/390/320 px. Empty and populated screenshots were inspected and saved locally under `.local/pr37-continuity/`. Synthetic local records only; no remote publication or provider request.


### September 19, 2026 — offer-review navigation

`Review offer details` now scrolls smoothly to the comparison with keyboard focus transferred without a jump; reduced-motion preference keeps immediate navigation. The existing maximum remains four offers, arranged in two columns on desktop and one on mobile.

Three focused browser journeys passed across the initial run and one geometry-test correction: normal/reduced scrolling and focus, plus four-offer layout and capacity at 1920/390/320 px. The geometry test now waits for the existing hover transition before measuring. Screenshots were inspected and retained locally in `.local/pr37-offers/`. Frontend TypeScript and the 32-file hosting build check passed. No backend behavior, external provider call or remote publication changed.


### September 19, 2026 — recent-work dialog hierarchy

Scoped the continuity dialog presentation: one visible primary title, a subordinate empty-state heading, smaller hint and no nested card frame. Home styling and record behavior remain unchanged. Frontend TypeScript passed; actual browser captures at 1920/390/320 px were inspected, with no horizontal overflow and verified region naming, Escape and focus return. Local captures: `.local/pr37-hierarchy/`. No remote publication or backend change.


The saving-help disclosure received the same hierarchy refinement: secondary 14 px/500 text and an 8 px content gap instead of accumulated spacing. Scoped styles preserve other disclosures. TypeScript, desktop/mobile inspection and keyboard expansion/collapse passed; captures are under `.local/pr37-saving-help/`. No persistence or remote behavior changed.


Main navigation now marks Explore suppliers and My study consistently with `aria-current` and the shared underline; My study no longer inherits the pressed-button fill. The modal action and existing compact navigation stay unchanged. TypeScript and desktop/mobile browser checks passed, including modal focus return and no overflow. Inspected captures: `.local/pr37-navigation/`. Local only; no push or deployment.


## September 19, 2026 — product landing flow explanation

The root landing now explains the sourcing flow with four interactive, keyboard-accessible steps and readable product illustrations: discovery, saved evidence, reviewed supplier questions and optional whole-order comparison. It preserves the branded hero and sample-reply calculation, adds a clear workspace invitation, and explains pending terms, explicit sending confirmation, browser-session recovery and fictional demo pricing. The application workflow and provider gates are unchanged.

Six landing/arrival E2E journeys and frontend TypeScript/build/32-file hosting checks passed locally. Desktop 1920/1440 and mobile 390/320 views, including every walkthrough step, were captured; primary views were visually inspected. The design detector reported no findings on the changed targets. Captures: `.local/pr37-landing/`. No external provider request, commit, push or deployment occurred.

Independent finish review: `ship`, no material fixes. All 17 supplied desktop/mobile and selected-step captures were checked against the established design and product constraints. Scope: this landing extension only.


### September 19, 2026 — prototype framing and walkthrough refinement

The root landing's final invitation is now explicitly a hackathon prototype demo, with a generated, transparent ingredient asset, sample market context and smaller title. The existing hero and product flow remain intact. Number/title alignment, hover/selected distinction and a neutral step connector clarify the walkthrough. Overlaid grid panels reserve stable height, while inactive panels remain inert and hidden from assistive technology. Step changes use a brief reduced-motion-aware transition.

Six landing E2Es passed with exact alignment and stable-height checks across 1920/1440/390/320 px. A browser frame probe confirmed the transition renders intermediate states; reduced motion disables it. TypeScript/build and 35-file hosting checks passed, as did the changed-target design scan. Captures are under `.local/pr37-landing-refinement/`; new imagery provenance is in `public/brand/RICE_DEMO_PROMPT.txt`. This is local UI work only; no commit, push, deployment or product provider call.

Fresh independent finish review: `ship`, no material fixes, across 21 supplied captures. The previous screenshot findings are visually resolved; motion timing is supported by the browser frame probe.

Follow-up correction after user rejection of the closing composition: reduced ingredient prominence, removed the lime split and repeated checklist, moved FAQ below the invitation. TypeScript and two focused landing/keyboard journeys passed; all four viewport captures received an independent visual check without material defects. Evidence: `.local/pr37-landing-closing-correction/`. No push or deployment; prior review was not user acceptance.

Removed the redundant walkthrough caption at the user’s request and vertically centered its timeline against the adjacent panel. Browser geometry verified matching vertical centers for every step at 1920/1440/800 px and no overflow through 390/320 px; desktop/mobile screenshots and TypeScript passed. Local evidence: `.local/pr37-flow-centered/`. No push or deployment.

Replaced the rejected isolated rice image with a newly generated panoramic ingredient-receiving scene behind the CTA text. Removed the figure/caption and two-column gap. An aubergine overlay preserves white-copy contrast; the lime action stays prominent, with a stronger mobile overlay. The abandoned rice asset and its dedicated provenance were removed. New provenance: `public/brand/SOURCING_CTA_PROMPT.txt` and `sourcing-cta.webp.json`. TypeScript/build/hosting validation and two focused landing/keyboard browser journeys passed; four viewport captures and the design detector were checked. Evidence: `.local/pr37-cta-background/`. No push, deployment or product provider call.

Updated landing CTA and FAQ to present Surtario as a product per the user’s latest direction: ingredient sourcing, comparable pack/order costs, control over sending and browser-bound recovery. Removed prototype/hackathon framing from the CTA and demo-focused FAQ, while keeping sample-price labels with the illustrative examples. No API configuration or provider capability changed. TypeScript and two focused existing browser journeys passed. Local only, no push or deployment.

Unified click-driven scrolling across the landing and workspace. The walkthrough link preserves fragment history and transfers focus without an initial jump. Search, study summary, sourcing follow-ups, offer review and comparison/page-start actions now use the same reduced-motion-aware native scroll helpers. Search navigation no longer competes with the results effect. Native skip links and dialog/select focus handling are unchanged. TypeScript and 15 existing landing/funnel/offer journeys passed; six targeted scroll tests passed after correcting the new mobile test to use its actual Change search control instead of the desktop-only navigation button. Tests observe intermediate scroll positions in both motion preferences; an additional pointer probe recorded 30 positions. No push, deployment or product provider call.

Applied the user-approved closing hierarchy: porcelain explanatory section with smaller heading, a more compact photographic CTA with one-sentence copy, and a porcelain button. Fixed the timeline connector to end at the final circle rather than a fixed inset from the whole list. TypeScript passed; the full explanatory section and CTA were captured together at 1920/1440/390/320 px without overflow. Timeline endpoint geometry matched the last-circle center at five widths, including 800 px. Visual inspection and changed-target detector found no outstanding issues. Evidence: `.local/pr37-cta-hierarchy/` and `.local/pr37-timeline-end/`. Local only; no push or deployment.

Corrected the explanatory-section scope after user feedback: an added rice-review specimen was rejected because the request was presentation-only. Removed it and restored the original three headings and complete paragraphs verbatim. The title now spans the section above three aligned text columns on one quiet outlined surface, stacking on mobile; the adjacent photographic CTA is unchanged. A generated concept remains only as local rejected design evidence, not a product asset or accepted direction. TypeScript and two existing landing/keyboard journeys passed; five viewport captures verify responsive fit and desktop paragraph alignment. Evidence: `.local/pr37-control-redesign/restored-content-*.png`. No push or deployment.

Integrated the explanatory content into the page as a section, removing the floating-card frame and excess header space. The original heading now wraps naturally beside the existing minimal Surtario symbol; all three original messages and the photographic CTA remain intact. TypeScript passed; captures at 1920/1440/800/390/320 px confirm no horizontal overflow and preserved desktop column alignment, with desktop/mobile visual inspection. Evidence: `.local/pr37-control-section/`. Local only; no push or deployment.

### September 19, 2026 — consolidated review checkpoint

Prepared the contextual funnel, landing, visual refinements and shared scroll behavior together for pull-request review. Fresh verification passed all 299 unit/backend/configuration tests, frontend/backend TypeScript, the production build and 35-file hosting check, plus all 21 focused browser journeys in one run. Review found no blocking issue in session ownership, stale revisions, preparation rollback, linked comparisons or confirmation boundaries. This checkpoint does not establish live-provider or hosted acceptance; no merge or deployment is included.


## September 19, 2026 — bounded direct API acceptance

Configured the existing anonymous local backend for direct OpenAI and Firecrawl calls, with no rehearsal bridge, cloud environment mutation, hosting publication or mail send. Both OpenAI model selectors use `gpt-5.6-luna`; application calls now explicitly request low reasoning, retain their output caps and zero SDK retries. A local-only usage callback records model/token counts without prompts, credentials, source text or session identifiers.

Four paid model calls passed: clear text retained 18 kg / PEN 80; ambiguous text left weight/unit null; the bundled synthetic US quotation image retained 25 lb / USD 20; one actual Firecrawl page retained USD 8 / 28 oz with source citations. This verifies image understanding through Responses, without Images generation or Files permissions. Document idempotency, saved recovery and session isolation passed without additional model calls.

A real browser search for long-grain white rice in Portland took 125.88 seconds, retaining 14 candidate sources, 10 with recovered text, with partial-coverage warning. Reviewed the Della Rice product, saved a study, opened Calculate purchase with a hypothetical required quantity of 10 lb, preserved unknown minimum/delivery/tax, and saved the comparison and a templated delivery inquiry without sending. Reload and explicit reopen recovered the offer and its original unsent question. This is a test of product operation, not supplier availability, wholesale suitability or a confirmed order total.

Recorded usage for these four calls: 6,896 input and 1,228 output tokens; USD 0.0028528 estimated at standard uncached Luna rates, excluding prior connectivity probes and Firecrawl credits. This is a token-based estimate, not an account invoice or balance check. Redacted local evidence: `.local/openai-acceptance/`.

Remaining acceptance: AgentMail's configured development inbox GET returned 403 `missing_permission`; no send/webhook round trip was attempted and mail stays disabled locally. Multi-round autonomous research, direct-API advisor and reply extraction were intentionally not exercised in this bounded batch. Before recording, improve the static searching state with actual progress, avoid resetting the active comparison to the synthetic example on reload, and review source relevance (the search includes retail/nonlocal and suspicious candidates). No repeated searches were used to curate a favorable result.

All 300 unit/backend/configuration tests and frontend/backend TypeScript checks passed. Local functions were pushed and queried successfully. No Git commit/push or cloud deployment. Existing SDK warnings about deprecated image parts and mocked non-reasoning test model names do not represent failed real Luna calls.


### 2026-09-20 UTC — search progress and comparison recovery (local)

Quick search now publishes bounded provider checkpoints through the existing owner-scoped Convex query: search attempts checked, candidate count, pages checked and the current public hostname. The UI uses Surtario typography, symbol and tokens with a small stage transition and reduced-motion support; it does not invent percentages, ETAs, supplier availability or comparable prices. A running search can be reopened from Continue your work. Progress writes add no provider requests and ignore terminal runs.

Saving/opening a comparison retains its ID in the URL. Reload resolves it through the existing owner-scoped list before rendering offers; missing or foreign records show a recovery state instead of synthetic offers. Only saved state is restored; unsaved edits are not autosaved. Manually verified that the previous real Della Rice comparison reopens with its 10 lb requirement, source and unsent inquiry intact. Source counts now explicitly do not confirm delivery to the requested area; relevance/geographic suitability still require review, with no new ranking or verification claims.

Verification: 35 focused discovery/research backend tests, 10 browser journeys covering reactive local Convex checkpoints, reload, foreign-session denial, progress completion/error, reduced motion and source-review-to-comparison; frontend/backend TypeScript and production build passed. Computer-use inspection covered the production progress component in an isolated response harness and the actual saved comparison at 1440px and 390px. Corrected a mobile step-marker width defect; no horizontal overflow or browser errors in the checked app view. The design detector reported only an unchanged advisor-card border outside this scope.

Applied functions only to the existing anonymous localhost backend. Browser integration tests inserted isolated synthetic records and checkpoints; no snapshot replacement, additional paid provider calls, outgoing emails, Git commit/push or cloud deploy. The prior AgentMail inbox permission blocker remains; an end-to-end live email round trip and a paid search with these new visual checkpoints have not been rerun.


### 2026-09-20 UTC — useful sourcing results and reviewed-offer presentation (local)

Corrected catalog product-link traversal (embedded thumbnails, multiline titles, alphanumeric HTML SKUs), tightened child-link ingredient relevance and prioritized trade-supplier metadata within the unchanged read budget. A restored web study now opens its original search; the persistence journey covers this regression.

The existing real study now recovers three reviewed selections after reload: Della 28 oz / USD 8, WebstaurantStore 50 lb / USD 37.49 and F. Garcia as an unpriced distributor. One Firecrawl page read and two Luna low extractions were used; Food To Live remained a multi-variant catalog rather than an invented single offer. These are candidate options, not confirmed equivalent specifications or Portland fulfillment.

Redesigned offer hierarchy and compact source/action footer; checked desktop and 390/320 px mobile, fixing price wrapping and contact overflow. 56 focused discovery/source-quality tests, seven funnel/persistence E2Es, frontend/backend TypeScript and build passed. Local functions updated; no new full paid search, outbound messages, Git push or cloud deployment. AgentMail acceptance remains blocked by the previously observed inbox permission failure.


### September 19, 2026 — AgentMail configuration diagnosis and localhost receiver

Corrected the readiness probe: an inbox-scoped Message Read/Send key returns 403 for administrative inbox metadata but succeeds on message listing. Real message listing returned HTTP 200 and an authenticated WebSocket subscription was accepted for the configured inbox. This supersedes the earlier claim that the observed metadata permission failure blocked AgentMail itself.

Configured the existing inbox/test recipient on the anonymous local backend, enabled mail and explicit AI draft/reply actions, and added `npm run dev:mail`. Local reception uses AgentMail's outbound WebSocket and the existing internal reply mutation; hosted signed webhook settings remain unchanged. The UI shows the configured recipient in a newly prepared, unsent draft and still requires send approval. Verification: 22 focused provider/receiver/quotation tests and frontend TypeScript passed. No new outbound email, OpenAI request, Git push or cloud deployment in this setup check. Subscription acceptance is not a complete send/reply acceptance; the local receiver must stay running and has no offline replay.


### September 20, 2026 — local acceptance: progressive discovery through received reply

Implemented source arrivals and actual search/read/review checkpoints through owner-scoped Convex subscriptions, two concurrent page reads within the existing budget, and optional preparation of up to three distinct product pages. Prioritized trade/local evidence and explicit currency for automatic review; proposals remain unconfirmed. Completed results start with six sources and expandable evidence. Fixed the search identity at the user click so hot reload cannot create a new paid request, cleared stale email-save notices on send, and distinguished sending from uncertain delivery.

Ran three fresh direct Firecrawl searches with Luna low. One extra search exposed the hot-reload identity bug and was counted rather than hidden. The final search returned 15 candidates, 11 with recovered text. Reviewed and saved two real published offers (50 lb at USD 37.49 and 28 oz at USD 8.00) plus an unpriced trade distributor. A contradictory white/brown-rice page remained unconfirmed. The final explicit-currency prioritization was checked with deterministic fixtures without another paid search.

Completed one authorized AgentMail send and reply between the configured test inboxes. The local WebSocket receiver correlated the reply and the open UI updated without reload. Luna extracted the response; human review created a separate test-supplier offer. The mail terms were explicitly synthetic, not confirmation by a real supplier. A 60 lb need produced two 50 lb bags, 100 lb received, 40 lb excess, USD 74.98 goods and USD 82.98 including the test freight. Delivery timing stayed pending because the reply did not confirm it. Study, conversation, original source and calculation survived reload; the existing case comparison was preserved.

Verification: 317 unit/backend tests, frontend/backend TypeScript and production build passed; 16 distinct browser journeys passed across the configured-provider run and the missing-configuration rerun (the three initial failures assumed disabled providers). Restored all live local settings after that negative-path check. Inspected desktop and 390/320 px mobile UI without horizontal overflow. Local usage logs recorded 11 Luna calls, 72,259 input and 3,717 output tokens; no Astra, no stress test, no dollar-cost claim. No commit/push or cloud deployment. The local mail receiver must remain running and does not backfill disconnected events. Multi-round autonomous research and unrestricted supplier outreach were not part of this acceptance.


### 2026-09-20 — pulido de correo y lectura de resultados (local)

- Correo HTML con marca Surtario, alternativa de texto y vista previa común, escapada y ligada a la revisión aprobada. Versionado opcional conserva correos históricos sin alterar su formato. Nuevas consultas separan contexto, preguntas comerciales y límite de no-compra.
- Un envío real autorizado entre buzones de prueba: recibido y renderizado en AgentMail; conversación recuperada tras recargar. UI revisada en escritorio y 390/320 px sin desbordamiento. No llamadas OpenAI/Firecrawl en esta pasada.
- La búsqueda persistida permite mostrar sus 15 fuentes (11 legibles); tres análisis automáticos no son el total encontrado. Copy aclarado, títulos de fuente jerarquizados y aviso de contenido separado del enlace.
- 320 pruebas/49 archivos, TypeScript frontend/backend y build correctos. Pendiente de refinamiento visual: competencia entre acciones de cada fuente. HTML verificado en AgentMail, sin afirmar compatibilidad visual probada en todos los clientes. Sin commit/push ni despliegue cloud.


### 2026-09-20 — cobertura inicial ampliada a 30 fuentes (local)

- Recorrido en inglés: hasta 30 fuentes, tres consultas de hasta 20 hits y presupuesto de 30 lecturas. Se conservan diversidad por dominio, deduplicación, filtros, concurrencia de dos lecturas y reintentos acotados de rate limit. IA automática permanece en tres fuentes; no se implementó pricing.
- UI: doce fuentes iniciales, expansión y contracción sin otra llamada. Una búsqueda real nueva devolvió 21 fuentes de 21 dominios, 16 legibles; no equivalen a 21 proveedores verificados. Avances y fuentes visibles durante aproximadamente 137 segundos hasta el último análisis.
- Consumo medido: tres llamadas Luna low, 14.834 tokens de entrada y 897 de salida. Sin inferir costo monetario ni cargos de créditos Firecrawl. No correos nuevos en esta pasada.
- 42 pruebas focalizadas, TypeScript frontend/backend, build y tres E2E pasaron. Caso sintético de 30 tarjetas y revisión manual de las 21 fuentes reales en escritorio/móvil 390 px; sin overflow ni errores de navegador. Backend anónimo local actualizado; sin push ni despliegue cloud.


### September 20, 2026 — pre-push acceptance and review fixes

- Source cards now prioritize review/extraction or inquiry, with secondary supplier actions under **More options**. Existing case-only distributor controls remain directly available. Desktop and 390/320 px browser checks passed without overflow or console errors.
- Fixed the two findings from the earlier Codex review of PR #37: close the continuity dialog before opening a comparison; reset incompatible working selections when resuming a different ingredient/area without deleting saved studies. Both have browser regression coverage.
- One fresh real Firecrawl search returned 21 candidate sources, 16 with recovered text. Three automatic Luna low analyses remained proposals; reviewed and saved one current source against its captured text. One authorized branded AgentMail request and reply between test inboxes appeared reactively without reloading. One Luna reply extraction was checked against the actual message, then added to the existing compatible comparison.
- Synthetic commercial terms only: for 60 lb, three 25 lb bags produce 75 lb received, 15 lb excess, USD 60 goods plus USD 6 freight = USD 66. Tax was explicitly included; delivery timing stayed pending. Existing comparison, saved study, source and email thread survived reload. No supplier outreach or purchase.
- Verification: 320 unit/backend/configuration tests, frontend/backend TypeScript, production build and 20 focused browser journeys passed. The source-quality browser test now explicitly opens the collapsed evidence control before asserting its content. Git publication/review is the next step; no cloud deployment or merge in this acceptance.
