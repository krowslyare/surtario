# restaurant-procurement

Nombre de trabajo. Producto para comparar insumos y proveedores a partir de cotizaciones, listas y comprobantes. Primero ayuda a decidir una compra; después permite seguir precios y, opcionalmente, calcular el impacto en recetas.

**Estado:** primera entrega local implementada. Permite editar hasta cuatro ofertas manuales, comparar presentaciones y desembolso y completar datos pendientes. Datos sintéticos; sin restaurante piloto, persistencia ni extracción automática. La UI calcula en el navegador; las consultas Convex reutilizan el mismo módulo y se verificaron por separado contra el backend local.

## Ejecutar

Requiere Node >=22.12 y npm. Se usa `package-lock.json`.

```sh
npm ci
npm run dev
```

Abrir la URL local indicada por Vite (por defecto `http://127.0.0.1:5173`). La comparación funciona sin credenciales y los cambios duran mientras la vista esté abierta.

Para ejecutar las consultas del backend local en una terminal adicional:

```sh
npm run dev:backend
```

En un checkout sin despliegue configurado, la CLI actual puede crear un backend local sin cuenta. Confirmar siempre el destino antes de reutilizar una configuración existente. No se requiere ni se ejecuta `convex deploy` para esta entrega.

## Verificar

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Con el backend local del proyecto ejecutándose en el puerto 3210:

```sh
npm run test:backend
```

Verificado: 27 pruebas de dominio/entrada, 7 pruebas de navegador (incluyen 320, 390, 768 y 1280 px), build/tipos y consultas reales locales para 10/18/20 kg, dato faltante y límite de ofertas. No se han probado dispositivos físicos ni accesibilidad completa.

## Por dónde empezar

1. Leer las [etapas de desarrollo y su estado](docs/desarrollo/ETAPAS.md).
2. Revisar la [primera entrega implementada](docs/desarrollo/PRIMERA_ENTREGA.md). El próximo bloque es persistencia con sesiones aisladas; las APIs externas se conectarán después.
3. Consultar el [plan de producto](docs/producto/PLAN_PRODUCTO.md) para decisiones y límites, y la [revisión adversarial](docs/producto/REVISION_ADVERSARIAL.md) para sus motivos.
4. Aplicar la [guía de UI/UX](docs/diseno/UI_UX.md) y sus tokens de referencia al construir las pantallas.

Las instrucciones para trabajar en este repositorio están en [AGENTS.md](AGENTS.md). El registro factual de avance para el concurso está en [hackathon.md](hackathon.md).

## Recorrido que vamos a construir

Documento de proveedor → revisión de insumo y presentación → cantidad requerida → comparación de ofertas → solicitud de alternativa → respuesta → decisión.

El recorrido debe funcionar **sin recetas y sin compras históricas**. Registrar compras habilita seguimiento de precios. Vincular recetas habilita impacto por plato. Las ofertas, compras realizadas y referencias de mercado se mantienen separadas.

## Organización actual

```text
convexhackaton/
├── src/                       # Interfaz, reglas de cálculo y estilos
│   ├── domain/                # Cálculo puro y sus pruebas
│   └── styles/                # Tokens y estilos de la aplicación
├── fixtures/                  # Datos sintéticos de referencia
├── convex/                    # Consultas de ejemplo y comparación
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

Código actual: `src/App.tsx` (UI), `src/domain/` (reglas y tests), `src/styles/tokens.css` (única fuente de tokens), `fixtures/` (ejemplo sintético), `convex/` (consultas de ejemplo y comparación), `tests/` (navegador). Stack: React, TypeScript, Vite y Convex.

## Dos resultados distintos

- **Hackatón:** demo pública con datos sintéticos, integraciones reales, flujo completo y entrega verificable. Requisitos y guion en la sección 11 del plan.
- **Producto comercial:** validar después con documentos y uso real de un restaurante. La primera comparación no exige recetas; privacidad, soporte y recuperación se verifican antes de admitir datos del cliente.

Remoto: [krowslyare/restaurant-procurement](https://github.com/krowslyare/restaurant-procurement). Durante esta preparación mantiene visibilidad privada; la entrega del concurso requerirá hacerlo público. No hay aplicación desplegada.


## Herramientas del agente

- [Frontend Design de Anthropic](.agents/skills/frontend-design/SKILL.md): usar junto con la guía UI/UX existente; branding comercial aplazado.
- [Skill del concurso](.agents/skills/convex-hackathon-skill/SKILL.md): `/hackathon` actualiza el registro. Si el comando no está disponible, leer y seguir el skill directamente.
- Plugin global oficial Convex cargado. El MCP responde, pero su consulta de estado requiere autenticación; la CLI y las consultas HTTP públicas locales funcionan. AI files del proyecto instalados por la CLI; no se redistribuye el plugin global.
- Hosting elegido: `convex.site`. Configurar el componente oficial en la etapa de hosting.

Estado verificable y pasos para otro colaborador: [setup del agente](docs/desarrollo/SETUP_AGENTE.md). Los skills de diseño y hackatón conservan licencias y revisión de origen en sus carpetas. Los skills administrados por Convex tienen [atribución y licencias](third_party/convex-agent-skills/README.md) conservadas por separado. Estas licencias corresponden a dichos archivos, no establecen una licencia para el resto del proyecto.
