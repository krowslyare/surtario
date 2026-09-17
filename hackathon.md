# Hackathon log

- **Project:** Surtario
- **Event:** Convex All Gas Hackathon
- **What it does:** Maintains persistent ingredient-sourcing cases, preserving supplier evidence, reviewed comparisons and decision follow-up from research through confirmed delivery terms.
- **Live app:** https://incredible-wolverine-122.convex.site
- **Repo:** private
- **Frontend:** Convex static hosting
- **Convex deployment:** https://incredible-wolverine-122.convex.cloud
- **Components:** @convex-dev/agent, @convex-dev/static-hosting, @convex-dev/workflow
- **Convex features:** schema, indexes, queries, mutations, actions, HTTP actions, scheduled mutations, crons, realtime queries
- **Auth:** Other (capacidad anónima de demo; sin cuentas)
- **AI models:** gpt-5.6-luna (local Codex CLI rehearsal only; OpenAI API not yet verified)
- **Started:** 2026-09-07T18:47:16Z
- **Last updated:** 2026-09-17T01:45:49Z

## Log

### 2026-09-07 - working tree
Se prepararon el plan, revisión adversarial, etapas y primera entrega (`docs/`). La revisión independiente corresponde al plan v1.0; la entrada por insumos y proveedores de v1.1 tuvo revisión de coherencia local. Recetas quedan como extensión opcional.
Se definieron UI/UX y tokens, se comprobaron contrastes y ejemplos aritméticos del plan. No hay pantallas ni pruebas de aplicación. Demo prevista con datos sintéticos; validación con restaurante pendiente.
Se contrastaron requisitos y documentación de integraciones; fuentes en el plan. La demo se plantea sin tarifas del SaaS ni paywall. Branding comercial aplazado, conservando colores, tipografía y reglas funcionales.

### 2026-09-07 - b8a2071 · preparación del entorno
Se copiaron los skills oficiales de diseño y registro en `.agents/skills/`, con licencias y revisiones de origen. Se adaptó este archivo al formato del concurso leyendo directamente el skill; el alias aún no se verificó en una sesión nueva.
Plugin global oficial Convex 1.10.0 instalado y habilitado, con skills y configuración MCP inspeccionados. Herramientas no disponibles en la sesión actual: reinicio y comprobación de carga pendientes (`docs/desarrollo/SETUP_AGENTE.md`).
Se conectó el remoto privado y se revisaron los documentos para excluir contexto personal. Hosting seleccionado: `convex.site`, sin aplicación ni componente de hosting configurados. El primer commit registra esta base documental; Started usa su fecha UTC. El registro inicial anterior al commit se basó en evidencia local.
No se ejecutaron APIs del producto, contactaron proveedores ni desplegó o envió la aplicación al concurso. Próximo hito: verificar la carga de herramientas y comenzar la primera entrega.


### 2026-09-07 - working tree · primera comparación
Implementada UI React/Vite en español: necesidad editable, hasta cuatro ofertas manuales, origen, estados incompletos y resumen móvil. Cálculos compartidos en `src/domain/procurement.ts`, ejemplo sintético en `fixtures/`; no se guardan compras ni datos entre recargas.
Revisión adversarial con subagente Sol: corregidos parser de mínimos, precisión de importes y referencia de diferencias. Pruebas de navegador llevaron a corregir foco y nombres accesibles. Tokens trasladados a `src/styles/tokens.css`.
Instalados AI files del proyecto y creado backend Convex local sin cuenta. `convex/comparison.ts` expone consultas validadas de ejemplo y cálculo; no usa tablas ni servicios externos. Verificados resultados por HTTP local; MCP invocable, pero status aún solicita autenticación.
Pasaron 27 pruebas de dominio/entrada, 7 de navegador, build/tipos y prueba de consultas locales para 10/18/20 kg, dato faltante y límite de ofertas. Revisión visual de escritorio y móvil; sin validación con restaurantes ni auditoría completa de accesibilidad.
Persistencia, sincronización entre vistas, extracción, correo y hosting pendientes. No hay despliegue cloud ni entrega al concurso de esta implementación.

Preparación para Git: formato consistente en código y pruebas, licencias de skills administrados conservadas en `third_party/`, configuración de desarrollo separada en el commit `bad7b76`. Se repitieron las 27 pruebas de dominio/entrada y build/tipos después del formato, con resultado satisfactorio.


### 2026-09-07 - working tree · exploración autónoma
La entrada permite investigar un insumo/categoría y zona sin documentos ni cantidad, revisar precios de catálogo y distribuidores sin precio y conservar selección temporal. `src/MarketStudy.tsx` y `fixtures/market.ts` filtran exclusivamente datos ficticios; no hay scraping real.
La continuación a compra exige equivalencia, comienza sin cantidad y conserva condiciones desconocidas y fuente original. Borrador de consulta editable y copiable, sin envío; captura manual como alternativa secundaria. Persistencia y APIs siguen pendientes.
Plan v1.2 y guía de desarrollo alineados tras revisión adversarial independiente; una segunda pasada estática no detectó nuevos errores materiales dentro de este alcance. Pasaron 32 pruebas de dominio/entrada, 15 de navegador y build/tipos; se revisaron escritorio y móvil. Evidencia en `docs/desarrollo/EXPLORACION_MERCADO.md`.
Se corrigió Frontend a `not deployed`: Convex static hosting es la elección futura y aún no está configurado. Este bloque no se ha comprometido en Git, publicado ni desplegado; la primera comparación anterior sí quedó en el remoto privado en `9b420f6`. Próximo bloque: estudios persistentes con sesiones aisladas.


### 2026-09-08 - working tree · estudios persistentes
Implementado guardado y recuperación de estudios sintéticos en Convex local: tabla e índices en `convex/schema.ts`, funciones validadas en `convex/studies.ts` y lista reactiva en `src/components/SavedStudies.tsx`. Precios, contactos y fuentes proceden de fixtures del servidor; no se admiten documentos privados.
Sesión anónima por capacidad aleatoria, almacenada como hash en servidor; límite de 10 estudios por sesión y 500 en esta demo local. Otra sesión no lista ni modifica estudios ajenos. Revisión requerida para actualizar; reintento idéntico de creación no duplica registros. Esto no implementa cuentas de restaurantes ni prepara por sí solo una publicación pública.
Pasaron 36 pruebas de dominio/backend, 18 de navegador y build/tipos. E2E contra Convex local comprobó recarga, dos pestañas, otra sesión, conflicto y desconexión. Revisión visual de escritorio y móvil. El proceso existente de desarrollo confirmó funciones e índices; el arranque adicional fue rechazado por puerto ocupado y no se cambió de destino.
Revisión adversarial independiente cerró dos P2 con regresiones: reintento de contenido distinto y pérdida de selección al volver al ejemplo. La sección de guardado contiene errores para conservar la exploración. Evidencia, comandos y límites actualizados en README y `docs/desarrollo/PERSISTENCIA_ESTUDIOS.md`.
Sin APIs externas, envío de mensajes, carga privada, despliegue cloud, commit ni push de este bloque. Autenticación comercial, controles públicos completos y fuentes reales permanecen pendientes.


### 2026-09-08 - working tree · pulido visual
Nueva dirección visual aplicada a portada, resultados, guardados, comparación y diálogos: tokens índigo/lavanda, tipografía Manrope variable empaquetada localmente e ilustración SVG decorativa de despensa. La portada se compacta al explorar; no se alteraron cálculos, persistencia ni integraciones.
Se revisaron escritorio y móvil, nombres accesibles y contrastes principales; 15 pruebas de exploración/comparación y build/tipos satisfactorios. Las pruebas de reflujo verifican portada y resultados a 320/390/768/1280 px. Movimiento reducido respetado; sin nuevas solicitudes a servicios externos de fuentes.
Guía visual y etapas actualizadas. Se corrigió la ruta de importación de la fuente durante el build y un nombre accesible de ayuda en móvil. No hay premio de diseño, auditoría integral de accesibilidad, commit/push ni despliegue de este bloque.


### 2026-09-08 - working tree · verificación antes de Git
Se ejecutaron las 36 pruebas de dominio/backend, build/tipos, 18 E2E existentes y smoke de cálculo contra Convex local. Se añadió y ejecutó un ensayo E2E continuo en `tests/studies.spec.ts`: explorar, revisar fuentes/contacto, guardar/recuperar, preparar consulta sin envío, confirmar equivalencia y completar condiciones sintéticas para verificar 10 y 20 kg. Total: 19 recorridos de navegador verificados.
`npm run test:demo` reproduce el ensayo. Guion objetivo y brechas registrados en `docs/desarrollo/ENSAYO_DEMO.md`; no se grabó video ni se ejecutaron sponsors externos. Reglas oficiales consultadas de nuevo: siguen pendientes integraciones reales, demo pública y materiales de entrega.
Se prepara commit y push de exploración, persistencia y pulido en la rama de desarrollo. Remoto y visibilidad privada comprobados; el push no cambia visibilidad ni despliega la app.

### 2026-09-08 - working tree · revisión de composición
La exploración ahora abre con el buscador y un ejemplo concreto, sin eslóganes ni ilustración grande. `src/MarketStudy.tsx` destaca el precio normalizado junto al importe y contenido del empaque; conserva fuentes, fechas y datos pendientes. `src/styles/app.css` reúne los resultados en una lista compacta y mantiene accesible el estudio al desplazarse. Se actualizaron la guía visual, README y etapas.
Build/tipos y 19 pruebas E2E satisfactorios, incluido el ensayo completo de demo. Revisión visual en escritorio y móvil; reflujo automatizado de 320 a 1280 px. Solo cambios locales de presentación: sin cambios de backend, llamadas a sponsors, commit, push ni despliegue en este bloque.

### 2026-09-08 - working tree · entrada local de insumos
Se implementó `IngredientIntake` con listas manuales, XLSX/CSV, selección de hoja/columna y revisión editable. Fotos/PDF permiten transcripción manual con origen local; OpenAI sigue pendiente. El parser de `src/intake/` corre en Worker cancelable. Se conservan archivo, hoja, columna y fila; no se suben archivos ni se convierten celdas en ofertas. Cambiar de insumo desde una selección existente exige iniciar otro estudio para evitar mezclas.
41 pruebas de dominio/backend, 24 E2E y build satisfactorios. Pruebas nuevas con XLSX sintético de dos hojas, CSV, foto manual, cancelación, archivo inválido y separación de estudio. Revisión visual en escritorio/móvil y adversarial de procedencia y cambio de insumo. Los fallos iniciales de selectores accesibles se corrigieron sin relajar aserciones. Lista y documento permanecen transitorios en navegador; sin nuevas funciones Convex, sponsors reales, commit, push ni despliegue. Alcance en `docs/desarrollo/ENTRADA_INSUMOS.md`.

### 2026-09-08 - working tree · preparación interna de descubrimiento
El bloque de entrada/UI fue subido en `6402ef5` y se abrió el PR 1 en borrador, sin merge ni cambio de visibilidad. Se implementaron `convex/discovery.ts` y el adaptador Firecrawl en `convex/lib/`: búsqueda de hasta tres fuentes con texto acotado, validación de respuesta, timeout y sin reintentos automáticos. La action es interna, no persiste resultados ni se expone a visitantes.
47 tests y build satisfactorios. Convex local cargó la action; una invocación sin clave se detuvo antes de llamar al proveedor, y el cliente público no pudo invocarla. No hay llamada real Firecrawl ni claves configuradas. La UI y persistencia siguen usando ejemplos. Configuración del backend y pasos para OpenAI/AgentMail documentados en `docs/desarrollo/INTEGRACIONES.md`; estos dos conectores siguen pendientes. Sin despliegue público.

### 2026-09-08 - working tree · extracción y revisión separadas
En `codex/extraction-review`, se agregó una prueba interna OpenAI usando Agent con dos textos sintéticos, sin herramientas, threads ni mensajes guardados. Clave y modelo se leen del entorno tipado de Convex; no hay modelo configurado ni llamada real. El esquema cerrado requiere evidencia literal y conserva datos ausentes. Convex local cargó el componente/action, rechazó la prueba sin credenciales y negó su invocación por cliente público.
La UI muestra una revisión simulada: texto original, propuesta, evidencia, correcciones y confirmación. Permite continuar a comparación con cantidad vacía y condiciones pendientes. Se separaron propuesta extraída y baseline confirmado tras revisión adversarial; prueba de corrección 80 a 85 y etiquetas específicas evitan presentar la corrección como original del documento. No conecta archivos reales ni implementa OCR.
53 tests de dominio/backend, 26 E2E y build satisfactorios. Revisión visual de escritorio/móvil; se corrigió el ancho de diálogo y se añadió comprobación de reflujo. Alcance y comandos en `docs/desarrollo/EXTRACCION_REVISION.md`. Se prepara un PR dependiente del PR 1, sin sumar este corte a su rama ni fusionarlo. Sin despliegue público; persistencia de decisiones y correo permanecen para entregas posteriores.

### 2026-09-08 - working tree · comparaciones y elección
Implementados guardado/recuperación de comparaciones sintéticas, condiciones y opción elegida en Convex local (`convex/comparisons.ts`, `src/components/SavedComparisons.tsx`). Elegir no registra compra. Se conserva evidencia original, aislamiento por capacidad y revisión optimista; carga privada continúa deshabilitada.
Revisión adversarial independiente detectó y verificó correcciones de conservación de fuentes y validación contra snapshots históricos. UI conserva el borrador ante confirmación tardía y exige nueva elección al cambiar condiciones.
Pasaron 58 pruebas de dominio/backend, 30 E2E del conjunto completo y una regresión adicional de confirmación tardía; build correcto. Query local ejecutada y revisión visual de escritorio/móvil realizada. Entrega en rama independiente sobre extracción/revisión; sin APIs externas reales, publicación ni despliegue remoto.

### 2026-09-08 - working tree · investigación web conectada
Conectados búsqueda Firecrawl y extracción explícita OpenAI con revisión UI; fuentes y propuestas guardadas en `researchRuns`, con URL/fecha, aislamiento por capacidad, reservas idempotentes y límites de consumo (`convex/research.ts`, `src/components/LiveResearch.tsx`). Habilitación de servidor separada de claves; sin llamadas externas ejecutadas.
Las ofertas revisadas pasan a comparación tras validar equivalencia; originales y correcciones quedan diferenciados. Las correcciones web siguen transitorias y no se habilitan documentos privados ni correo. Revisión adversarial independiente llevó a corregir guardado incierto del modelo y estados reactivos atrasados.
65 pruebas de dominio/backend, 33 E2E y build satisfactorios; flujo positivo con respuestas simuladas, consulta de estado real en Convex local y revisión visual móvil. Sin publicación ni despliegue remoto.

### 2026-09-08 - working tree · persistencia de revisión web
Extendido el guardado de comparaciones a revisiones vinculadas a investigaciones de la sesión (`convex/comparisons.ts`). El servidor reconstruye texto, URL, propuesta original y revisión desde referencias verificadas. Condiciones y elección se recuperan sin registrar compra; archivos privados siguen excluidos.
Corregidas igualdad de evidencia en reintentos y validación de condiciones editables. Revisión adversarial independiente completada sin hallazgos materiales pendientes. 68 pruebas de dominio/backend, 34 E2E y build correctos; recorrido de corrección, guardado y recarga ejecutado en Convex local con fuente sintética. Sin llamadas externas ni despliegue público.


### 2026-09-08 - working tree · cotizaciones de prueba
Solicitud persistente desde comparación guardada, revisión de texto/destino, copia manual para WhatsApp y envío AgentMail restringido por servidor (`convex/quotationMail.ts`, `src/components/QuotationMail.tsx`). Las respuestas requieren firma válida y correlación por buzón, hilo y remitente; duplicados y eventos sin correspondencia quedan separados. Recibir no modifica precios ni registra compras.
Revisión adversarial de aislamiento e idempotencia; corregidos límites de respuesta, estados inciertos, hilos ambiguos y campos incompatibles en persistencia. 77 pruebas de dominio/backend, 35 E2E y build correctos. Envíos y webhooks probados con transporte/payloads sintéticos; borrador, recarga, portapapeles y móvil probados contra Convex local.
Estado local confirmó correo deshabilitado. Sin credenciales, envíos reales, registro externo de webhook ni despliegue público. Configuración y reconciliación pendiente documentadas en `docs/desarrollo/AGENTMAIL.md`. Se prepara PR separado sobre persistencia de revisión web.


### 2026-09-08 - working tree · verificación de PR y entrega de integraciones
Añadido workflow GitHub Actions de instalación reproducible, 77 tests de dominio/backend y build/tipos, sin secretos ni despliegue. Las actions quedan fijadas por SHA y el token solo tiene lectura. E2E con Convex local siguen separados del check automatizado.
Actualizadas las guías de integraciones, README, etapas y guion del video para reflejar búsqueda, revisión persistente y correo ya implementados. Las llamadas reales, hosting y grabación siguen pendientes. Tests y build comprobados localmente; ejecución remota del workflow se verifica en el PR.


### 2026-09-08 - working tree · lectura multimodal de ejemplos
Añadida lectura de imagen/PDF sintéticos mediante Agent/OpenAI en `convex/documents.ts` y `convex/lib/documentExtraction.ts`. El servidor envía los bytes del archivo, clasifica el documento y conserva transcripción/propuesta por sesión. Revisión con original visible, correcciones y confirmación antes de comparar; una compra/lista no se convierte en oferta.
Revisión adversarial local de acceso, consumo y procedencia: API limitada a archivos sintéticos del servidor, reservas idempotentes, cuotas y errores sin reintento automático. Las citas contra transcripción generada no se presentan como verificación visual. 84 tests y build correctos; 36 E2E completos más un caso positivo adicional de lectura simulada. Original y revisión móvil inspeccionados.
Sin llamadas reales a OpenAI ni carga privada. Resultado del modelo persistente; correcciones y comparación derivada de documentos todavía transitorias. Alcance y límites en `docs/desarrollo/LECTURA_DOCUMENTOS.md`. Sin despliegue público.


### 2026-09-08 - working tree · persistencia de revisión documental
Conectado el guardado de comparaciones derivadas de foto/PDF sintéticos. Convex reconstruye fuente y propuesta desde una lectura completa de la sesión y conserva revisión confirmada, condiciones posteriores y elección. Referencias ajenas, tipos distintos de cotización y correcciones inválidas se rechazan; las actualizaciones preservan procedencia y revisión optimista.
87 tests de dominio/backend, 38 E2E y build satisfactorios. Recorrido local comprobó corrección 80 a 85, flete 15, total 100, elección, recarga y enlace al PDF. Revisión adversarial local de propiedad, procedencia y reintentos; sin llamadas a OpenAI ni carga privada. La CLI rechazó el selector local explícito para el backend anónimo; la importación sintética acotada funcionó con el destino existente verificado, sin reemplazar registros.


### 2026-09-09 - working tree · consulta desde estudio sin precio
Las solicitudes de catálogo pueden partir de un distribuidor de un estudio guardado, sin comparación, precio ni cantidad. Convex valida propiedad y pertenencia y conserva la referencia al estudio; destinatario fijado en servidor y confirmación explícita previos al envío. La copia manual queda diferenciada del borrador de correo.
88 tests y build satisfactorios. En 39 E2E, 37 pasaron inicialmente y dos avisos antiguos fallaron tras cambiar el texto; actualizadas esas expectativas, pasaron las 13 pruebas afectadas de mercado/estudios, incluido el nuevo recorrido de creación y recarga. Revisión adversarial local de referencias, compatibilidad con solicitudes anteriores y autorización; sin envíos reales ni despliegue.
Alcance: distribuidores de estudios sintéticos persistidos. La búsqueda web libre aún no admite este contrato de distribuidor. Detalles en `docs/desarrollo/AGENTMAIL.md`.


### 2026-09-09 - working tree · candidatos web y consulta
Una fuente de investigación web completada puede conservarse como distribuidor candidato sin precio ni extracción. `convex/prospects.ts` reconstruye enlace, fecha e insumo desde la fuente de la sesión; nombre y contacto son anotaciones revisadas. Biblioteca reactiva y consulta vinculada al candidato, sin transformar el contacto en destinatario autorizado.
90 tests, 40 E2E y build satisfactorios. Recorrido local con respuesta web sintética: guardar candidato sin markdown, recargar, preparar consulta y recuperar borrador; revisión móvil realizada. Revisión adversarial local de propiedad, referencias, idempotencia y separación de contacto/envío. Sin llamadas externas ni despliegue; pertinencia de fuentes reales pendiente de credenciales.


### 2026-09-09 - working tree · respuesta a oferta revisada
Una respuesta vinculada permite preparar una oferta mediante revisión manual explícita, abrir una comparación nueva y guardarla en Convex. El servidor reconstruye el correo por solicitud/mensaje de la sesión y conserva campos confirmados, condiciones y elección sin sobrescribir la comparación anterior ni registrar compra.
92 tests, 41 E2E y build satisfactorios. Recorrido con correo sintético en Convex local: abrir respuesta, transcribir, confirmar, guardar y recargar con texto original y corrección separados. Corregida etiqueta accesible del selector y revisión móvil completada. Revisión adversarial local de propiedad, procedencia, respuestas no vinculadas y reintentos.
Sin lectura automática del correo por OpenAI ni envíos reales. No combina automáticamente la nueva oferta con otras comparaciones. Alcance en `docs/desarrollo/RESPUESTA_A_OFERTA.md`; sin despliegue público.


### 2026-09-09 - working tree · comparar respuesta con ofertas existentes
La revisión de una respuesta permite añadirla a la comparación guardada actual con confirmación explícita de equivalencia. Se conservan cantidad y fuentes anteriores, se elimina la elección y se exige guardar los cambios. El servidor reconstruye el correo de la sesión y comprueba identidad, moneda, duplicados, límite de cuatro fuentes y revisión vigente.
94 tests de dominio/backend, 42 E2E y build satisfactorios. Recorridos locales con correo sintético prueban ambas opciones: comparación nueva e incorporación a la existente, guardado y recarga con procedencia. Revisión adversarial local de propiedad, validación de equivalencia, historial y elección; revisión móvil sin desbordamiento horizontal.
La lectura del correo sigue siendo manual. No hubo envíos ni llamadas externas, despliegue o habilitación de documentos privados. Contrato actualizado en `docs/desarrollo/RESPUESTA_A_OFERTA.md`.

### 2026-09-09 - working tree · correcciones de revisión del PR 1
Corregidos tres hallazgos de Codex: unidad de empaque desconocida conservada como pendiente, mínimo sin valor supuesto al crear una oferta y resumen por grupos completos de la misma moneda. Una oferta incompleta o en otra moneda no oculta la comparación válida de las demás.
47 tests y build aprobados en el checkout del PR 1; 8 E2E de comparación aprobados en un servidor frontal aislado, incluida regresión de campos pendientes y tercera oferta. Sin cambios de backend ni llamadas externas. Nueva ronda de revisión solicitada tras publicar el commit; merge todavía pendiente.


### 2026-09-09 - working tree · segunda ronda del PR 1
Corregido el cierre accidental al pulsar el espacio interior del diálogo; el fondo exterior sigue cerrándolo. La fecha de una oferta manual usa el calendario local del navegador, evitando avanzar de día por UTC durante la noche peruana.
47 tests, build y 9 E2E de comparación aprobados. Regresión con reloj fijo a las 21:30 de Lima comprueba fecha, conservación del formulario y cierre exterior. La primera expectativa de mes usó una abreviatura distinta de es-PE; corregida a set. manteniendo día y año. Sin cambios de backend ni llamadas externas. Nueva revisión pendiente antes del merge.


### 2026-09-09 - working tree · PR 2 review preparation
Merged main into the extraction review branch to retain the five reviewed PR 1 fixes. Resolved documentation conflicts by preserving both delivery records. Integrated revision passed 53 domain/backend tests, build, and 11 comparison/extraction E2E tests on an isolated frontend. No external calls or deployment. PR 2 will be reviewed against main; subsequent PRs remain drafts.


### 2026-09-09 - working tree · PR 3 local review
Integrated the reviewed main branch into comparison persistence. An independent Sol 5.6 review, adjudicated by Astra, identified stale save notices after restoring a draft. Save success and error notices now clear when the draft identity changes, while late responses retain their existing handling.
58 domain/backend tests and build passed. Eleven comparison/extraction browser checks passed before the notice fix; five persistence browser checks passed after it, including restored-draft notice and delayed-response coverage. Persistence UI checks used the existing local backend, which contains later implementation code; the PR-specific backend was exercised with convex-test.
No GitHub bot review was requested. Local review found no confirmed ownership or persistence blocker. No external provider call, private-data enablement, or deployment was performed.


### 2026-09-09 - working tree · PR 4 local review
Integrated reviewed main into bounded web research. Independent Sol 5.6 review and Astra adjudication found no material actionable defects in reservation/idempotency, ownership, uncertain extraction persistence or reactive UI reconciliation. A speculative transient double-click notice was not treated as a blocker.
65 domain/backend tests, build and all 35 E2E checks passed on the integrated revision. Provider responses and the research UI transport were simulated; persistence browser tests used the existing local backend, which includes later implementation code. The PR-specific backend was tested in memory with convex-test.
No GitHub review bot was invoked, no real provider requests were made, and no private uploads or public deployment were enabled. Reviewed web corrections remain transient in this delivery.


### 2026-09-09 - working tree · PR 5 local review
Integrated reviewed main into persisted web-offer reviews. Independent Sol 5.6 review and Astra adjudication found no material findings in ownership, server source reconstruction, immutable evidence, idempotency, revisions or frontend serialization.
68 domain/backend tests and build passed. Thirty-five E2E checks passed in the full run; the web-persistence case initially failed before setup because the isolated checkout could not locate the anonymous backend. It passed after a temporary CLI working-directory adjustment using the original local checkout configuration; the adjustment was removed. The 36 browser cases therefore passed across those runs.
The new browser case verified correction, delivery, total, choice and original evidence after reload against the existing local backend with later implementation code. PR-specific backend tests ran in memory. No real provider calls, GitHub bot review or deployment.


### 2026-09-09 - working tree · PR 6 local review
Integrated reviewed main into quotation requests. Independent Sol 5.6 review and Astra adjudication identified valid signed long replies failing the persistence text limit. The webhook now retains bounded text with an explicit truncation notice instead of returning a repeatable server error.
78 domain/backend tests and build passed, including a signed long-reply regression. Six focused browser checks passed for quotation drafting, reload, clipboard, mobile layout and comparison persistence; the browser used the existing local backend with later implementation code. Exact PR backend behavior was tested in memory with simulated mail transport.
No GitHub review bot, actual mail send, external webhook registration or deployment was performed. Real AgentMail round-trip validation remains pending.


### 2026-09-09 - working tree · PR 7 review preparation
Integrated reviewed main into CI and integration handoff documentation, preserving the quotation webhook fix. The workflow runs dependency installation, in-memory tests and build with read-only permissions and pinned actions; no provider secrets or deployment steps.
78 domain/backend tests and build passed locally. Removed a stale browser-test count from the new README guidance. CI for the integrated head remains to be verified; local tests do not establish hosted or external-provider behavior.


### 2026-09-09 - working tree · PR 8 local review
Integrated reviewed main into synthetic image/PDF extraction. Sol review and parent adjudication corrected comparison labels that misrepresented documents as public web pages; labels now refer to their recorded source. The PNG preview represents the same PDF content, verified against the fixture. Human review and server-owned file limits remain enforced.
85 domain/backend tests and build passed. 2 focused browser checks passed using synthetic data and the existing local backend where needed; that backend includes later implementation code. Exact PR backend tests ran in memory. No real provider calls or deployment.


### 2026-09-09 - working tree · PR 9 local review
Integrated reviewed document extraction into persisted document comparisons. Sol review and parent adjudication found no additional material issues. The browser seed command temporarily used the original local checkout configuration; that test-only adjustment was removed.
88 domain/backend tests and build passed. 1 focused browser checks passed using synthetic data and the existing local backend where needed; that backend includes later implementation code. Exact PR backend tests ran in memory. No real provider calls or deployment.


### 2026-09-09 - working tree · PR 10 local review
Integrated reviewed main into catalog requests from saved studies. Sol review and parent adjudication found no material issues in ownership, origin-bound retries, fixed test recipients or explicit send approval.
89 domain/backend tests and build passed. 2 focused browser checks passed using synthetic data and the existing local backend where needed; that backend includes later implementation code. Exact PR backend tests ran in memory. No real provider calls or deployment.


### 2026-09-09 - working tree · PR 11 local review
Integrated reviewed main into web distributor candidates and linked inquiries. Sol review and parent adjudication found no material issues. Sources are reconstructed from owned research, and found contacts never authorize email delivery. The temporary local CLI working-directory adjustment for browser setup was removed.
91 domain/backend tests and build passed. 1 focused browser checks passed using synthetic data and the existing local backend where needed; that backend includes later implementation code. Exact PR backend tests ran in memory. No real provider calls or deployment.


### 2026-09-09 - working tree · PR 12 local review
Integrated reviewed main into manually reviewed reply offers. Sol review identified misleading source labels and malformed reply dates; inherited neutral provenance labels and pending-date handling now preserve unknown dates without crashing or substituting request dates. Regression covers persisted malformed reply dates and browser recovery. Temporary browser CLI setup adjustment removed.
94 domain/backend tests and build passed. 1 focused browser checks passed using synthetic data and the existing local backend where needed; that backend includes later implementation code. Exact PR backend tests ran in memory. No real provider calls or deployment.


### 2026-09-09 - working tree · PR 13 local review
Integrated reviewed main into adding reply offers to existing comparisons. Sol review found a stale-query save bug; the client now tracks confirmed server revisions so a second save does not append an already persisted reply. Parent adjudicated and tested the fix. Final browser suite passed 43 cases initially; the remaining web-source link selector was updated for the corrected provenance label and then passed. All 44 cases passed across those runs, including the demo rehearsal. Temporary CLI setup adjustments were removed.
97 domain/backend tests and build passed. 44 focused browser checks passed using synthetic data and the existing local backend where needed; that backend includes later implementation code. Exact PR backend tests ran in memory. No real provider calls or deployment.


### 2026-09-09 - working tree · purchasing advisor
Added cash/coverage scenarios, optional decision context, executive advice and a copyable negotiation draft. Owned Convex snapshots retain inputs, revision and evidence; the interface marks changed analyses stale.
The registered Agent component now has bounded read-only scenario/evidence tools. Its provider action remains disabled without explicit server configuration; no model call, purchase or message was executed.
Independent Sol review found removed-source and mixed-currency issues, corrected with regressions. 110 domain/backend tests, build and eight focused browser checks passed locally, including snapshot recovery and mobile/desktop layouts. External provider E2E and public deployment remain pending.


### 2026-09-09 - working tree · operator mail recovery
Added internal recovery inspection, verified sent-receipt reconciliation and quarantined-reply linking. Frozen-route validation and idempotency preserve request ownership; no recovery path calls a provider or resends mail.
Independent review found unreachable old queue entries and duplicate receipt assignment; both now have regression coverage. 116 combined domain/backend tests, frontend/backend typechecks and build passed. Live delivery and webhook verification with AgentMail remain pending.


### 2026-09-09 - working tree · saved ingredient lists
Added session-owned storage of reviewed manual/XLSX/CSV ingredient names and recovery after reload. File bytes, other columns and document transcriptions are not part of the stored contract.
Parent review caught a late-save confirmation affecting a replacement queue; a browser regression now verifies the correction. 121 combined domain/backend tests, build and ten focused browser cases passed against an isolated local Convex backend. No external provider calls or deployment.


### 2026-09-09 - working tree · hosting preparation
Registered the official static-hosting component while preserving the exact AgentMail webhook route. The local readiness command builds Vite, resolves referenced assets and checks for backend secret variable names in the bundle; a router test verifies the disabled webhook response alongside the static GET fallback.
Preparation only: no cloud deployment or asset upload occurred. Provider capabilities remain disabled by default. Hosting and provider execution procedures are documented separately.


### 2026-09-09 - working tree · complete local demo verification
Integrated the advisor, mail recovery, saved lists and hosting preparation. Fixed an initial-save race that reset purchasing context, with a browser regression covering context entered before the comparison is saved. Local E2E configuration now pins the selected anonymous backend and permits the separate Vite socket; shared snapshot imports run sequentially.
122 domain/backend tests, frontend/backend typechecks, the hosting build/asset check and all 49 browser journeys passed. The full flow includes source review, stored comparisons, synthetic documents/replies, purchasing scenarios, session isolation and the demo rehearsal.
README and provider acceptance instructions were refreshed in English. No real provider request, email delivery, cloud deployment, public repository change or video submission occurred. Those checks remain the next stage after credentials are configured.


### 2026-09-09 - working tree · PR 14 local review
Preserved decision context during the first comparison save and added scheduled recovery for interrupted advisor executions. Expiry keeps deterministic results and prevents a late model completion from replacing a failed state; it never retries a provider.
Independent Sol review was adjudicated and corrected. 112 domain/backend tests, frontend/backend typechecks, build and three advisor browser journeys passed. Browser checks used the existing synthetic local backend; changed backend behavior was verified in memory. No real provider calls or public deployment.


### 2026-09-09 - working tree · final local PR reviews
Completed independent Sol reviews with parent adjudication for advisor, mail recovery, saved lists and hosting. Corrected interrupted advisor execution and moved the first-save context fix into the advisor delivery. Recovery and list reviews found no further material issues.
Hardened browser tests against an already-running frontend connected to another local backend; all persistence socket guards now enforce the selected origin, including delayed-response tests. The occupied-port check and socket rejection tests passed.
126 unit/backend tests, frontend/backend typechecks, hosting checks and all 49 browser journeys passed on the combined code. Updated functions were accepted by the anonymous local backend. External providers remained simulated or disabled; no cloud deployment, real email, public visibility change or submission.


### 2026-09-09 - working tree · real provider checks and development preview
Configured a dedicated Convex cloud development deployment and server-only provider secrets through the authorized Chrome consoles. A real Firecrawl probe returned three Peruvian catalog sources; OpenAI extraction and price/coverage validation remain pending.
An approved synthetic AgentMail request reached an owned test inbox. Its reply linked through the signed webhook (`200 Accepted`); replaying the same event succeeded without duplicating the reply. Manual offer review, save and recovery preserved PEN 4.80/kg and PEN 96 for 20 kg. No purchase was recorded.
Published the development frontend through the registered static hosting component. Build-matching root/assets, SPA fallback, missing-asset 404 and unsigned-webhook rejection passed. Chrome recovered a hosted study in a fresh page; the hosted session stayed separate from the localhost study. Corrected the footer's fixed unsent-message claim and added an explicit development upload command.
OpenAI account/model configuration, document extraction, advisor tool execution and the complete hosted provider journey remain unverified. Provider latency was not instrumented. Repository visibility, production and contest submission were unchanged. Evidence: `docs/desarrollo/CREDENTIALS_AND_E2E.md`, `HOSTING.md` and stage status in `ETAPAS.md`.


### 2026-09-09 - working tree · procurement workspace experience
Reorganized research around the search and supplier evidence, with study tools alongside on desktop and after results on mobile. Comparison quantity now precedes saving; document tools use a disclosure that preserves the review draft.
Applied forest/sage tokens, a shared SVG mark, native reduced-motion-aware transitions and persistent dialog headers. An image-generation reference guided composition without introducing fabricated supplier photos or features.
Chrome computer use reviewed desktop and mobile flows. 126 domain/backend tests, all 51 browser journeys, typecheck/build and hosting-asset validation passed locally, including the demo rehearsal and keyboard/reduced-motion checks.
The final run followed a local fixture-CLI setup correction; calculations, ownership, saved revisions and mail permissions remain intact. No cloud deployment or provider/model call occurred in this UI delivery. Full real-provider acceptance and restaurant validation remain pending. Evidence: `docs/diseno/PULIDO_EXPERIENCIA.md`.


### 2026-09-09 - working tree · Luna CLI end-to-end rehearsal
A local-only provider bridge now runs real Luna CLI structured generation through the existing Agent/AI SDK boundary while simulating web discovery and mail transport. Chrome computer use exercised reviewed offers, a no-price distributor, explicit email approval, duplicate signed webhook delivery, reply-to-comparison, PNG/PDF reading, XLSX/manual lists and saved decision recovery. Six substantive Luna calls completed; actual Convex tools produced the scenarios and evidence supplied to the advisor. No external email or provider API call was made by this rehearsal.
The first live model attempt exposed a missing Agent context scope; all stateless calls now use isolated server-generated scopes without history or message storage. A subsequent advice error revealed old pending source text overriding reviewed conditions; the tool now passes current confirmations explicitly. Regression tests retain the actual Agent/SDK. Research errors no longer expose Convex stacks, missing-number copy is legible and unchanged saved verdicts are not duplicated.
138 unit/backend tests, typechecks, hosting checks and 51 browser journeys passed. The test checkout's shared-dependency font warning was corrected and 12 focused visual/keyboard checks passed on repeat. The original PDF renderer failure remained visible until an explicit retry after local font configuration was fixed. Desktop and 390px computer-use evidence and reproduction steps are documented in `docs/desarrollo/LUNA_REHEARSAL.md`. Direct OpenAI API and full hosted acceptance, production, public visibility and contest submission remain pending.


### 2026-09-10 - 51fdbcd · review corrections and integration
GitHub Codex reviewed the provider, UI and rehearsal PRs. PRs #18 and #19 were merged; independent local review caught stale example results after changing to a live query. The fix preserves saved research and study selections, with a browser regression and a second clean Codex review.
Rehearsal configuration now enforces its visible notice before enabling simulated providers and uses shared warning colors. Research runs and mail send reservations retain server-derived synthetic provenance through review, comparison and advisor tools; legacy records remain unchanged. Computer use also corrected review copy that confused synthetic source content with whether extraction used a model.
147 unit/backend/configuration tests, frontend/backend typechecks and hosting checks passed. All 51 browser journeys were verified across the full run and the two corrected fixture cases. In-app browser computer use confirmed the search transition, retained selection and one fresh Luna extraction; Chrome control timed out. No cloud deployment, external email, public repository change or contest submission occurred. The final GitHub review identified the same provenance issue in bundled PNG/PDF sources; both paths now mark them synthetic, with persistence assertions and focused document checks. The last small follow-up was reviewed locally before integration.


### 2026-09-10 - working tree · real Firecrawl source validation
Ran seven real discovery attempts through the existing internal Convex action on the development deployment. The initial five returned 15 sources, including unreadable social pages, a site error, ambiguous catalog prices and irrelevant negative-control results. One published rice presentation/price pair matched a separate page inspection.
A targeted rice query returned no sources and a targeted oil query reached the existing timeout without a retry. Recorded sanitized measurements and source-quality follow-ups in `docs/desarrollo/FIRECRAWL_VALIDATION.md`; raw page bodies and contact details are excluded from Git. No model extraction, email, study write or deployment occurred. Real-source extraction and hosted acceptance remain pending.


### 2026-09-10 - working tree · source analysis and product evidence
Added server source inspection, persisted Agent classification with numbered literal evidence, and an explicit bounded Firecrawl product-page read. Catalogs and unusable sources cannot become comparable offers; selected child pages retain their URL, observation time and parent. Reviewed values still require confirmation, with purchase conditions kept separate.
A real scrape recovered the selected rice page with PEN 208 for 50 kg. Real Luna CLI replay separated catalogs from that product and retained missing prices; initial quotation-validation failures led to server-reconstructed evidence references. Replaying the original 15 sources identified four unreadable pages, one site error and all three irrelevant controls. Full provider acceptance remains open.
155 unit/backend/configuration tests and three focused browser journeys passed. In-app browser computer use verified mobile/desktop research, explicit child reading, one real Luna extraction, review and local Convex save. Independent adversarial review closed after fixing legacy quality bypass, validation order, redirects and multiline title provenance. Evidence: `docs/desarrollo/FIRECRAWL_SOURCE_ANALYSIS.md`. No cloud deployment, external email, direct OpenAI API call, public visibility change or contest submission occurred.


### 2026-09-10 - working tree · unified study and final provider pass
Connected reviewed web offers and no-price candidates to one saved market study, with server-owned source reconstruction, ingredient/location bounds and consistent recovery/counts. Added explicit AI suggestions for linked replies while preserving manual review, late edits and the exact reviewed extraction attempt. The prominent advisor now saves comparison/context and prepares the scenario through one action; positive quantity, semantic reuse and full draft guards prevent invalid or duplicate calls.
Rechecked current Firecrawl scrape documentation, target-page status and freshness behavior, and vendored its official scrape skill with license and pinned provenance. Two real Firecrawl calls returned three discovery sources and the selected product at PEN 208 per 50 kg. Five real Luna CLI generations ran through local Convex/Agent: two recorded-page analyses, one synthetic web source, one linked synthetic reply and one advisor explanation using actual calculation/evidence tools. The first numeric price proposal was corrected by a clarified prompt and explicit rerun.
Computer use saved and recovered the combined study, approved a locally simulated test email, observed one reply after duplicate signed events, reviewed PEN 47 per 10 kg and confirmed PEN 94 for a 20 kg scenario. Advice correctly requested another offer instead of inventing savings; reload recovered it without another model call. 173 unit/backend/configuration tests, all 54 browser journeys, frontend/backend typechecks and hosting checks passed. Independent adversarial review closed without remaining material findings after fixes. Evidence: `docs/desarrollo/DEMO_FLOW_VALIDATION.md` and `FIRECRAWL_SOURCE_ANALYSIS.md`.
The 170-second video plan remains unmeasured. Direct OpenAI API configuration and combined hosted acceptance remain pending. This pass did not send external email, deploy to cloud, change repository visibility or submit the project.


### 2026-09-10 - working tree · PR 21–26 review corrections
PRs #21–#25 are merged after independent Sol 5.6 review, with PR #23 reviewed by Luna, and parent adjudication. PR #24 keeps Firecrawl discovery candidates while suppressing markdown whose source or final metadata URL points to another page, with canonical same-page normalization and unchanged behavior when metadata is absent. PR #25 synchronizes open linked-reply reviews with reactive extraction state, preserves manual edits as pending suggestions and ignores stale responses. PR #26 now fingerprints only active offers while retaining historical source records; its review and fix verification are complete.
The current integrated pass records 175 unit/backend/configuration tests and 10 focused browser journeys (four reply/research checks and six advisor checks), plus frontend/backend typechecks and hosting build/asset checks. The preceding full-suite delivery covered all 54 browser journeys. This is local verification only; no new cloud deployment, provider call, repository visibility change or contest submission is recorded. Stages 2–5 and 7 retain their provider and hosted-acceptance requirements, separate from PR review completion.


### 2026-09-10 - 6ed1dd1 · reviewed main development deployment
Published the merged PR #21–#26 backend and frontend to the existing Convex development preview. Backend deployment, frontend typecheck/build and hosting checks passed. All eight served files matched the local build by SHA-256; SPA fallback, asset 404 and unsigned webhook rejection passed.
In-app browser verification saved a synthetic study containing one priced offer and one distributor without a price, then recovered both after reload. Evidence: `docs/desarrollo/HOSTING.md`. The application remains at the reviewed main revision; this entry records deployment evidence.
Provider settings, production and private repository visibility were unchanged; no external provider call or email was sent. Work stops here for the separate branding pass. Direct OpenAI API, combined hosted provider acceptance, recording and contest submission remain pending.


### 2026-09-12 - working tree · Surtario UI integration
Integrated the bundled Surtario identity, tokens, typography, motion and shared controls with the reviewed application state. Unified studies, saved lists, source freshness, linked-reply extraction, purchasing advice and hosting/rehearsal guards remain in the combined code.
The 175 unit/backend/configuration tests and frontend production build passed locally. Headless checks at 1920 × 1080 and 390 × 844 confirmed the Surtario identity and no horizontal overflow. Focused persistence/advisor browser coverage was not completed because the available anonymous backend lacked the current advisor function; no previous E2E evidence is presented as a fresh run.
No deployment, provider call, email, environment copy, push, visibility change or submission occurred.


### 2026-09-12 - df02b03 · English-first US workflows and freight insight
Integrated the Surtario visual work with research, saved studies/lists, quotation/reply review and the purchasing advisor. The application uses English with a fictional USD/lb Portland example; Peru fixtures remain for PEN/metric coverage. Source text is preserved. A missing-freight insight calculates the same-currency decision boundary and separates hypothetical cost exploration from confirmed offer edits.
Independent Sol review and GitHub review produced scoped corrections to study market boundaries, unit selectors, currency defaults, hypothetical state and conditional labels. A real Luna rehearsal exposed an evidence reconstruction mismatch that hid new advisor output after persistence; shared reviewed-evidence construction and a backend round-trip regression correct it. Keyboard search and saved distributor inquiry scope were corrected during browser verification.
197 unit/backend/configuration tests, all 63 browser journeys, frontend/backend typechecks and hosting checks passed locally. Three real Luna CLI calls exercised one extraction and two advisor generations with actual Convex Agent calculation/evidence tools; recovered advice required no extra generation. Web discovery/page data and mail transport were synthetic, and the bridge prescribed tool sequencing. No direct OpenAI API acceptance, external email, cloud deployment, visibility change or submission is claimed. Detailed evidence and remaining pilot/provider gates: `docs/desarrollo/ENGLISH_PRODUCT_VALIDATION.md`.


### 2026-09-12 - d26b14c · US unit PR review corrections
Addressed all three GitHub review findings in PR #27: added lb/oz review selectors to the prerequisite itself, retained coherent Spanish UI/model guidance in that intermediate PR, and documented the authorized US example scope. 182 tests, frontend/backend typechecks, production build and GitHub CI passed. The dependent English product integration changes UI and model language together.


### 2026-09-12 - d2a70d1 · final Luna review correction
Independent Luna max review found that saved source snapshots include unselected distributors, which could expose an unrelated catalog inquiry. Inquiry controls now use saved selected IDs, and the server rejects draft creation for distributors absent from that selection. US and Peru regression tests failed before the fix and passed afterward; browser checks cover US priced-only recovery and web-only studies. 199 unit/backend/configuration tests, three targeted browser checks, the full 64-journey browser suite, both typechecks and hosting checks passed. No external message or deployment occurred.


### 2026-09-13 - working tree · finding-to-decision follow-through
Connected the missing-freight finding to a complete supplier question, an amount preview using the existing deterministic DSS context, explicit operator confirmation and a visible before/after recommendation. Confirmation changes only freight and preserves source evidence. The result can save through existing comparison persistence; the confirmed amount survives reload, while the recap belongs to the current view. No message, selection or purchase is triggered.
205 unit/backend/configuration tests, 13 focused browser journeys, frontend/backend TypeScript and hosting checks passed locally. Cases cover boundary amounts, real advisor priorities, budget constraints, stale input, confirmation reset, focus and mobile layout. Independent Luna max review found a misleading save action under blocked site storage; saving now follows persistence readiness, with a passing browser regression. No schema change, external model call, provider configuration or cloud deployment was performed. Evidence and limits: `docs/desarrollo/DECISION_FOLLOWTHROUGH.md`.

### 2026-09-13 - working tree · compact product landing
Added an English product entrance at the root route, using the existing Surtario identity and ingredient photograph. A fictional supplier reply demonstrates the deterministic delivery calculation; the workspace loads on entry and explicit market, comparison, brand and Peru links remain available.
205 unit/backend/configuration tests and hosting checks passed. All 67 browser journeys passed across the full run and targeted rechecks after correcting local CLI configuration and old other-tab workspace URLs; later timeouts passed without changing assertions. Desktop/mobile captures, keyboard, reduced motion and back/reload are covered. No new model call, backend change, deployment or visibility change.

Independent Sol review returned `ship` with no material fixes after inspecting all four captures, the established design contract and routing/product truth. Luna could not complete the initial review because of a usage limit; Sol performed the replacement review.

### 2026-09-13 - working tree · pre-merge Sol correction
Fresh Sol pre-merge review found a contradictory save status for reviewed web studies outside sample markets. Status now uses the same eligibility as the save button. The Arequipa prospect regression failed before the fix and passed afterward, including save/recovery; all six affected browser journeys passed across the focused run and corrected message expectation. 199 unit/backend tests and hosting checks passed. The English UI contract now explicitly preserves original Spanish Peru data/citations without promising bilingual controls. Sol rechecked and closed the finding. No deployment or external provider call.


### 2026-09-14 - working tree · persistent sourcing cases
Persistent sourcing cases now connect an optional saved study, bounded research self-loop, reviewed comparison updates and versioned supplier messages. Explicit source watches run daily for seven days and preserve changed/unverified observations for human review. AI can propose research steps, evidence and inquiry text; it cannot approve an email, select its recipient or record a purchase. The UI recovers cases, highlights the next action and exposes dated history and supporting details on demand.

Local verification covers capability ownership, canceled/late work, duplicate events, immutable mail approval, stale comparison revisions, saved-study context, offline recovery and responsive layouts. Provider calls in these tests are mocked or synthetic. The workflow component is registered; no cloud deployment or provider flags were changed. Real OpenAI API behavior, the combined hosted flow and a seven-day live watch remain unverified. See [the architecture and configuration contract](docs/desarrollo/CASOS_ABASTECIMIENTO.md).

Independent pre-PR review found and closed two continuation defects: unchanged case comparisons now retain their selected offer, and replies opened directly from a study update the existing case comparison instead of creating an unlinked one. Added focused browser regressions for both. Fresh verification passed 222 unit/backend tests, frontend/backend TypeScript and hosting checks. The full browser run passed 71/72; the remaining failure was an incomplete research-module test stub, corrected without removing assertions. The new direct-study reply test and both workspace tests then passed; selection recovery was checked separately. This is local synthetic evidence; CI and hosted acceptance are separate checks.


### 2026-09-15 - working tree · supplier reply delivery confirmation
A supplier reply can now resolve an unknown delivery charge in its linked comparison. The operator chooses the offer, enters the amount and confirms an exact excerpt. One mutation checks ownership, linkage and revision, updates freight only, clears the old selection and stores the before/after deterministic reports and original reply reference in `deliveryConfirmations`. Repeated confirmation is idempotent; the history identifies the confirmation date and comparison revision.
225 unit/backend tests, both TypeScript checks, hosting checks and seven affected browser journeys passed locally, including mobile/reduced motion, saved evidence recovery and a delayed response that preserves a newer draft. Independent review found and closed late-response draft replacement and misleading historical “Now” labels. Test replies were synthetic; no external email, model call or cloud deployment occurred.


### 2026-09-15 - working tree · cloud acceptance and supplier-dialog readability

Development deployment `incredible-wolverine-122` was updated from main at `dfd3e02612fc930b544e4d0af2df6e34ba2789f4`, then received the frontend changes from `codex/cloud-demo-acceptance-0915` (uncommitted). Real Firecrawl search returned public rice sources; an unpriced candidate and its study survived reload. `LIVE_RESEARCH_ENABLED` is enabled. OpenAI remains unavailable and explicitly deferred by the user.

Two synthetic requests were delivered through AgentMail to the configured test inbox; three replies returned through the signed webhook. Manual review created a 40 lb comparison: two 20 lb bags at USD 18, freight initially pending. A linked reply supplied USD 4 delivery, giving USD 40 total. Confirmation preserved the exact quote, updated the existing comparison and enabled selection. Reload recovered revision 4 with the selected offer and USD 40 total. No purchase or real supplier commitment was made. Browser sessions showed separate saved-study lists; this is UI isolation evidence, not a new adversarial authorization audit.

The live walkthrough exposed excessive email/history text, mixed interface language, a zero count for one selected web candidate and lost comparison continuity when reviewing that candidate's reply. Dialogs now use a bounded literal email preview, expandable original/history, clearer form spacing and explicit delivery/total amounts. Candidate replies retain the sourcing-case comparison and can confirm freight without a second request. Historical cloud data created before this correction was completed through its already-linked test request.

Verification: 225 unit/backend tests passed; build/hosting checks passed. Seven affected browser journeys passed across the focused run and targeted recheck, including direct-candidate freight, original evidence, stale/delayed responses and extraction updates preserving edits. Desktop/mobile captures were inspected, then the hosted real-email dialog was inspected and refined. Cloud publication matched 30 build files and checked SPA fallback/missing assets. These frontend changes have no commit, PR or CI result yet. Automatic deployment remains separate pending work. Live OpenAI extraction/advice and a seven-day watch remain unverified.


### 2026-09-15 - working tree · development publication PR preparation

Consolidated the cloud-tested supplier-dialog changes with the prepared main-only deployment job so automatic publication retains the tested UI. The workflow tests before publishing, rejects missing/non-dev/wrong-target keys, serializes deployments and compares all published files plus SPA/missing-asset behavior. `CONVEX_DEV_DEPLOY_KEY` exists in GitHub; its value was not read. Pull requests do not deploy or receive that credential. First Actions deployment and live credential acceptance remain pending until merge.

Pre-PR review checked candidate/case linkage, retained full email evidence, pending freight and deployment target/secret boundaries. Fresh verification passed 233 tests (including eight credential guard cases), TypeScript/build/hosting checks and workflow YAML parsing. The seven focused UI journeys and real hosted acceptance above remain the behavioral evidence. No additional provider call or deployment was needed for this consolidation.


### September 15, 2026 — direct comparison example and select focus
The direct comparison entry now defaults to a separate English synthetic rice comparison (USD/lb, Supplier A/B); explicit `example=pe` retains the original Peru fixtures. Initial source evidence and reset use the same active example. Saved/reviewed offers retain their original terms. Select options use an inset aubergine focus ring instead of the clipped blue global ring; keyboard navigation and Escape/focus return remain supported.


### 2026-09-16 — branded workspace entrance
Replaced the plain loading message with a rose brand screen, a short logo drop and restrained bounce, and a readable tagline. The screen stays at least 1.7 seconds and exits only once the workspace mounts; reduced motion disables animation. Failed module downloads offer a retry. The brand-guide link is removed from the product and its route is development-only. Focus indicators retain their visibility using the brand aubergine.
Build and seven of eight landing/interaction browser tests passed locally. The remaining mobile-summary test also fails on clean pre-change HEAD 9fb09a3; it was not weakened. Desktop/mobile loading states were inspected. This verifies local UI behavior, not hosted acceptance or provider integrations. No deployment was performed in this round.

PR review fixes: covered workspace remains inert and hidden from assistive technology until the arrival screen finishes; all focus halos derive from the shared focus token. Build and six landing/arrival E2E pass, including keyboard isolation with and without reduced motion.


### 2026-09-17 - working tree · isolated Firecrawl research PR
Separated adaptive research, discovery/reading budgets, canonical deduplication and cited-field validation from visual and example changes. Retained minimal coverage UI and cross-round selection. Historical real Firecrawl/Luna records document source limitations and incomplete results; no new paid provider request in this separation.
Fresh research-only tree: 263 tests, TypeScript/build/hosting checks and two research browser journeys passed. External Codex review and CI are not yet complete. UI refinement and source-dialog presentation remain in a separate worktree. Main merge triggers development publication, which needs an active-workflow check.

Codex Review of PR #35 identified three issues: Spanish adaptive rounds ignored refinements/exclusions, decimal-comma citations could lose supported values, and catalog children could repeat a previously read URL. Corrected all three. Eleven additional cases cover Spanish/English localized refinement, exclusion of prior catalog links, decimal/grouping formats and rejection of concatenated fabricated numbers. Eight regression cases failed on the reviewed commit; all 274 tests pass after the fixes. Frontend/backend types and hosting build checks passed. Remote CI of the final commit remains the merge gate.
