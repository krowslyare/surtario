# restaurant-procurement

Nombre de trabajo. Producto para investigar precios y distribuidores de insumos, conservar estudios y preparar compras cuando haga falta. Los documentos propios, historial y recetas aportan contexto opcional.

**Estado:** exploración local implementada con ejemplos ficticios de arroz y abarrotes en Lima. Permite revisar precios y contactos sin precio, seleccionar opciones y continuar opcionalmente a una comparación por cantidad. No requiere documentos ni inventario. La captura manual sigue disponible como alternativa.

Estudios guardados en Convex local con fuentes y selección recuperables, lista reactiva y aislamiento por sesión de navegador. Las comparaciones de los ejemplos también admiten guardado de condiciones y opción elegida; las ofertas manuales nuevas y archivos propios siguen transitorios. Las revisiones de fuentes web guardadas también admiten persistencia. Entrada local de listas manuales, XLSX y CSV con revisión. Fotos/PDF admiten transcripción manual conservando el archivo en la pestaña. Búsqueda Firecrawl y extracción OpenAI conectadas al recorrido mediante habilitación de servidor; llamadas reales aún no verificadas. Lectura multimodal de ejemplos PNG/PDF preparada; llamada real y restaurante piloto pendientes.

## Ejecutar

Requiere Node >=22.12 y npm. Se usa `package-lock.json`.

```sh
npm ci
npm run dev
```

Abrir la URL local indicada por Vite (por defecto `http://127.0.0.1:5173`). El ejemplo funciona sin credenciales. El estudio conserva selección al volver desde la compra. Con el backend configurado, «Guardar estudio» permite recuperarlo desde «Guardados» tras recargar; los cambios sin guardar se pierden. En la comparación, «Guardar comparación» conserva condiciones y elección. «Comparaciones guardadas» permite recuperarlas después; los cambios sin guardar se pierden. Elegir no registra una compra.

Para habilitar persistencia y consultas, ejecutar el backend local en una terminal adicional:

```sh
npm run dev:backend
```

Configurar `VITE_CONVEX_URL=http://127.0.0.1:3210` en `.env.local` si la CLI no lo hizo, siguiendo [.env.example](.env.example), y reiniciar Vite. Sin URL, la exploración sigue disponible y el guardado aparece explícitamente sin configurar.

En un checkout sin despliegue configurado, la CLI actual puede crear un backend local sin cuenta. Confirmar siempre el destino antes de reutilizar una configuración existente. No se requiere ni se ejecuta `convex deploy` para esta entrega.

## Verificar

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:demo
```

Con el backend local del proyecto ejecutándose en el puerto 3210:

```sh
npm run test:backend
```

Las pruebas de persistencia de navegador requieren el backend local anterior y crean estudios sintéticos en sesiones independientes. Sus conexiones WebSocket están restringidas a localhost; no se ejecutan contra un backend remoto.

Verificado: 84 pruebas de dominio/backend y 37 pruebas de navegador (incluido el ensayo completo de demo) (incluyen 320, 390, 768 y 1280 px), build/tipos y consultas reales locales para 10/18/20 kg, dato faltante y límite de ofertas. Interfaz con Manrope local, búsqueda protagonista, lista compacta y precios por unidad destacados; sin nuevas llamadas externas. No se han probado dispositivos físicos ni accesibilidad completa.

El [ensayo de demo](docs/desarrollo/ENSAYO_DEMO.md) documenta el recorrido reproducible y las partes del video aún pendientes. No se ha grabado un video de entrega.

## Cotizaciones de prueba

Una comparación guardada permite preparar una solicitud, revisar su texto y copiarlo para WhatsApp. El correo requiere habilitación y destinatario de prueba configurados en servidor. Las respuestas vinculadas se revisan antes de editar condiciones; no registran compras ni precios automáticamente. Ver [configuración y límites de AgentMail](docs/desarrollo/AGENTMAIL.md). El envío y la recepción reales todavía no se han ejecutado.

## Verificación de pull requests

GitHub Actions ejecuta `npm ci`, `npm test` y `npm run build` en cada PR y al actualizar `main`, sin claves de sponsors ni despliegues. Incluye tests de Convex en memoria y transporte simulado. Los E2E y el smoke del backend continúan como verificación local explícita: requieren un backend Convex local y no forman parte de ese check. Un check verde no acredita llamadas reales ni publicación.

## Añadir insumos

Desde «Añadir lista o archivo», escribe un nombre por línea o elige un XLSX/CSV. Selecciona hoja, columna y encabezado; revisa los nombres antes de confirmar. Para archivos propios de foto/PDF, la transcripción sigue siendo manual. La sección de lectura automática procesa los ejemplos sintéticos incluidos cuando se habilita OpenAI. Ver [lectura de documentos y límites](docs/desarrollo/LECTURA_DOCUMENTOS.md). Los precios de otras columnas se conservan como contexto, sin incorporarse automáticamente a ofertas.

Usa archivos de ejemplo. Hasta 3 MB y 100 insumos; formatos y límites en [entrada de insumos](docs/desarrollo/ENTRADA_INSUMOS.md). La lista y el archivo permanecen solo en memoria de esta pestaña: se pierden al recargar y «Guardar estudio» no los guarda.

## Por dónde empezar

1. Leer las [etapas de desarrollo y su estado](docs/desarrollo/ETAPAS.md).
2. Revisar la [exploración implementada](docs/desarrollo/EXPLORACION_MERCADO.md) y la [primera comparación](docs/desarrollo/PRIMERA_ENTREGA.md). Ver también [persistencia de estudios](docs/desarrollo/PERSISTENCIA_ESTUDIOS.md). Ver [entrada de insumos](docs/desarrollo/ENTRADA_INSUMOS.md). La [preparación de integraciones](docs/desarrollo/INTEGRACIONES.md) deja una prueba interna Firecrawl lista para configurar; llamada real y extracción automática pendientes.
3. Consultar el [plan de producto](docs/producto/PLAN_PRODUCTO.md) para decisiones y límites, y la [revisión adversarial](docs/producto/REVISION_ADVERSARIAL.md) para sus motivos.
4. Aplicar la [guía de UI/UX](docs/diseno/UI_UX.md) y sus tokens de referencia al construir las pantallas.

Las instrucciones para trabajar en este repositorio están en [AGENTS.md](AGENTS.md). El registro factual de avance para el concurso está en [hackathon.md](hackathon.md).

## Recorrido que vamos a construir

Insumo/categoría y zona → precios, fuentes y distribuidores → estudio de mercado.

Continuación opcional: equivalencias → cantidad y condiciones → cotización/comparación → decisión. Listas, fotos, comprobantes y recetas podrán enriquecer el recorrido sin ser requisitos de entrada.

El estudio funciona **sin documentos propios, cantidad ni intención de compra**. La comparación funciona sin recetas y sin compras históricas. Registrar compras habilita seguimiento de precios. Vincular recetas habilita impacto por plato. Las ofertas, compras realizadas y referencias de mercado se mantienen separadas.

## Organización actual

```text
convexhackaton/
├── src/                       # Interfaz, reglas de cálculo y estilos
│   ├── domain/                # Cálculo puro y sus pruebas
│   └── styles/                # Tokens y estilos de la aplicación
├── fixtures/                  # Datos sintéticos de referencia
├── convex/                    # Consultas, estudios persistentes y validadores
│   └── _generated/            # Tipos y guías administrados por Convex
├── tests/                     # Recorridos de navegador con Playwright
├── scripts/                   # Verificación del backend local
├── docs/                      # Producto, etapas, revisión y UI/UX
├── .agents/skills/            # Skills de proyecto
├── .claude/                   # Archivos añadidos por la CLI de Convex
├── AGENTS.md                  # Instrucciones y sección administrada
├── CLAUDE.md                  # Entrada administrada por Convex
├── hackathon.md               # Registro factual de construcción
├── package.json
├── package-lock.json          # Dependencias de aplicación
└── skills-lock.json           # Origen de los skills instalados
```

Código actual: `src/App.tsx` (navegación), `src/MarketStudy.tsx` (exploración), `src/Comparison.tsx` (compra opcional), `src/domain/` (reglas y tests), `src/styles/tokens.css` (única fuente de tokens), `fixtures/` (ejemplo sintético), `convex/` (cálculo y persistencia de estudios), `tests/` (navegador). Stack: React, TypeScript, Vite y Convex.

## Dos resultados distintos

- **Hackatón:** demo pública con datos sintéticos, integraciones reales, flujo completo y entrega verificable. Requisitos y guion en la sección 11 del plan.
- **Producto comercial:** validar utilidad y segundo uso de estudios con un restaurante. Documentos y compras son contexto opcional; privacidad, soporte y recuperación se verifican antes de admitir datos del cliente.

Remoto: [krowslyare/restaurant-procurement](https://github.com/krowslyare/restaurant-procurement). Durante esta preparación mantiene visibilidad privada; la entrega del concurso requerirá hacerlo público. No hay aplicación desplegada.


## Herramientas del agente

- [Frontend Design de Anthropic](.agents/skills/frontend-design/SKILL.md): usar junto con la guía UI/UX existente; branding comercial aplazado.
- [Skill del concurso](.agents/skills/convex-hackathon-skill/SKILL.md): `/hackathon` actualiza el registro. Si el comando no está disponible, leer y seguir el skill directamente.
- Plugin global oficial Convex cargado. El MCP responde, pero su consulta de estado requiere autenticación; la CLI y las consultas HTTP públicas locales funcionan. AI files del proyecto instalados por la CLI; no se redistribuye el plugin global.
- Hosting elegido: `convex.site`. Configurar el componente oficial en la etapa de hosting.

Estado verificable y pasos para otro colaborador: [setup del agente](docs/desarrollo/SETUP_AGENTE.md). Los skills de diseño y hackatón conservan licencias y revisión de origen en sus carpetas. Los skills administrados por Convex tienen [atribución y licencias](third_party/convex-agent-skills/README.md) conservadas por separado. Estas licencias corresponden a dichos archivos, no establecen una licencia para el resto del proyecto.

## Revisión de cotizaciones

«Revisar ejemplo de cotización» permite revisar campos con evidencia y preparar una comparación sin inventar el peso del saco. La UI usa un resultado sintético; la prueba OpenAI es una action interna separada, preparada para configurar clave y modelo. [Alcance, configuración y evidencia](docs/desarrollo/EXTRACCION_REVISION.md). La lectura de imagen/PDF está conectada para ejemplos sintéticos; archivos privados y validación real siguen pendientes; el correo de prueba está preparado según la sección de cotizaciones. El [guardado de comparaciones y elección](docs/desarrollo/PERSISTENCIA_COMPARACIONES.md) admite los ejemplos de arroz y [revisiones de fuentes web guardadas](docs/desarrollo/REVISION_WEB_GUARDADA.md).

## Investigación web

«Buscar en la web» utiliza Firecrawl cuando está configurado y habilitado en servidor. Guarda hasta tres fuentes por búsqueda, permite solicitar extracción OpenAI por fuente y revisar campos/citas antes de comparar. Sin configuración permanece deshabilitado; los ejemplos siguen separados. [Recorrido, límites y configuración](docs/desarrollo/BUSQUEDA_WEB.md).

Las llamadas reales no se han ejecutado. Backend probado con proveedores simulados y UI positiva con un transporte de prueba. Fuentes y propuestas se guardan automáticamente; las correcciones y condiciones web se conservan al pulsar «Guardar comparación». No se admiten documentos privados ni se envían correos.
