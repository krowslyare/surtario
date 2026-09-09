# Hackathon log

- **Project:** restaurant-procurement
- **Event:** Convex All Gas Hackathon
- **What it does:** Explora ejemplos de precios y distribuidores sin exigir documentos ni cantidad; guarda estudios sintéticos por sesión de navegador y permite preparar una comparación opcional.
- **Live app:** not deployed
- **Repo:** private
- **Frontend:** not deployed
- **Convex deployment:** not deployed
- **Components:** @convex-dev/agent
- **Convex features:** schema, indexes, queries, mutations, internal action, realtime queries (local)
- **Auth:** Other (capacidad anónima de demo; sin cuentas)
- **AI models:** none
- **Started:** 2026-09-07T18:47:16Z
- **Last updated:** 2026-09-09T01:14:24Z

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
