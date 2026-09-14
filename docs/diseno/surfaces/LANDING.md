# Landing de producto

La ruta `/` presenta la entrada pública de Surtario. La acción principal y el enlace del encabezado abren el espacio de trabajo existente en `/?view=market`; `App.tsx` decide entre ambas superficies a partir de la URL.

La página conserva el sistema visual definido en `DESIGN.md`, `docs/diseno/UI_UX.md` y `src/styles/tokens.css`: paleta de berenjena, rábano, ají, lima y porcelana; Bricolage Grotesque para titulares; Manrope para texto; componentes de marca y controles compartidos. `src/styles/landing.css` solo compone esta superficie y consume los tokens existentes.

El comprobante interactivo usa un ejemplo ficticio en inglés de 40 lb de arroz, con proveedores ilustrativos y montos en USD. El resultado se calcula con `previewFreightDecision` de forma determinista y se muestra al revelar la respuesta: USD 38.00 de costo completo, incluidos USD 3.00 de entrega, frente a la alternativa completa de USD 40.00. La landing no persiste datos, no llama a un modelo y no registra una compra; el estado de la respuesta vive únicamente en memoria durante la visita.

En escritorio, la introducción y la escena fotográfica se distribuyen en dos columnas. Por debajo de 760 px el contenido fluye en una columna y el comprobante se superpone parcialmente a la fotografía; por debajo de 370 px se reducen márgenes y escala de marca. Con `prefers-reduced-motion: reduce` se elimina la transición de color de la respuesta.

La fotografía `public/brand/market-still-life.webp` es un recurso editorial generado para la identidad y no evidencia proveedores ni abastecimiento real. Su procedencia, proceso de conversión y limitaciones están registrados en `public/brand/README.md`; el prompt original se conserva en `public/brand/IMAGE_PROMPT.txt`.

## Verificación local

205 pruebas unitarias/backend/configuración y build/hosting aprobados. Los 67 recorridos de navegador quedaron verificados entre la corrida completa y las repeticiones enfocadas: la primera corrida pasó 60; seis casos requerían enlazar la configuración del backend anónimo local en el nuevo worktree, y una prueba de varias pestañas necesitaba abrir explícitamente `/?view=market`. Tres timeouts posteriores pasaron sin cambiar las comprobaciones, en una repetición de 19 segundos.

La portada tiene comprobaciones de navegación, recarga, historial, interacción, teclado y movimiento reducido. Las capturas locales cubren 1920, 1440, 390 y 320 px. Esto no constituye despliegue ni aceptación de proveedores externos.

Independent Sol review returned `ship` with no material fixes after inspecting all four captures, the established design contract and routing/product truth. Luna could not complete the initial review because of a usage limit; Sol performed the replacement review.
