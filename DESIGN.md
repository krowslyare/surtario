# Diseño de Surtario

Entrada para Impeccable. La autoridad visual y los tokens están en [UI_UX.md](docs/diseno/UI_UX.md), [INTERACCION.md](docs/diseno/INTERACCION.md) y [tokens.css](src/styles/tokens.css). Mantener estos documentos como fuente de decisiones; no crear una paleta paralela.

Exploración es una superficie de trabajo (Operate): búsqueda → resultados con fuente/precio/contacto → selección y guardado → compra opcional. Conservar berenjena, rábano, ají, lima y porcelana, Bricolage Grotesque y Manrope, y los assets existentes.

Priorizar comparación legible, acciones predecibles, teclado, foco visible y objetivos táctiles de 44 px. El movimiento responde a selección, filtros, apertura y guardado; sin animar importes ni retrasar el trabajo. Respetar movimiento reducido. Los estados vacíos, sin conexión y sin precio deben conservar significado.

Los componentes compartidos viven en `src/components/ui/`. La composición de exploración vive en `src/styles/workspace.css`; `controls.css` contiene estados comunes. No introducir estilos por pantalla que contradigan esos contratos.
