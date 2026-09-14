# Etapas de desarrollo

Esta tabla es la fuente de estado del proyecto. Marcar una etapa completada solo con evidencia de su criterio de salida. El calendario del plan es orientativo; ante retrasos aplicar sus recortes, sin afirmar resultados no ejecutados.

## Estado

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
