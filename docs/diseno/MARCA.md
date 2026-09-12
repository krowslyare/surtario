# Surtario

Surtario es el nombre elegido por el usuario el 10 de septiembre de 2026. Sustituye a Ronda tras una investigación preliminar de coincidencias del sector y dominios; conserva la dirección visual aprobada. Ver [selección de nombre](NAMING.md). El dominio no se compró y la disponibilidad legal no está confirmada. Esta entrega sustituye el aplazamiento de branding de la guía anterior.

## Idea

Una buena cocina empieza antes de encender el fuego. Cada servicio necesita insumos, y cada insumo tiene una presentación, una procedencia y unas condiciones. Surtario acompaña ese trabajo diario: explorar el mercado, reunir fuentes y preparar la próxima compra con criterio. Puedes empezar con una pregunta, sin inventario, documentos propios ni compras anteriores.

**Nombre:** Surtario. Evoca surtir y el ritmo diario de una cocina. Se pronuncia sur-TA-rio, se escribe sin tilde y no limita el producto a un sistema de inventario. **Descriptor:** Mercado para tu cocina. **Línea de marca:** Buen criterio. Buenos insumos.

La marca acompaña al encargado de cocina o compras. Habla de ingredientes, fuentes, presentaciones y decisiones concretas. No promete ahorro medido, proveedores verificados ni compras automáticas.

## Plan visual antes de construir

- Berenjena `#42202D`: identidad, titulares y acción principal.
- Rábano `#EEC6D0`: superficie fotográfica y gestos de marca.
- Ají `#BA3527`: acento editorial, distinto de los estados de error.
- Lima `#E4EF9B`: detalle del sello; nunca señal de un proveedor ganador.
- Porcelana `#FAFAF7`: base clara de la aplicación.
- Blanco `#FFFFFF`: controles, resultados y documentos.

Tipografía: Bricolage Grotesque para marca y titulares; Manrope para formularios, lectura y cifras tabulares. Fuentes locales con licencia OFL. Texto de trabajo alineado a la izquierda. Los importes mantienen moneda y unidad.

Composición de referencia: escritorio 1920 × 1080 (16:9), contenedor de 1536 px y márgenes de 192 px. Entrada con reparto aproximado 60/40, título fuerte y búsqueda a la izquierda, fotografía editorial a la derecha. Portátiles: 1440 × 900 y 1366 × 768. Móvil: 390 × 844 y 360 × 800, con prueba extrema a 320 px. No escalar una captura de escritorio: recomponer las columnas. No forzar 16:9 al documento desplazable.

```text
Surtario / Mercado para tu cocina           Explorar | Mi estudio
┌─────────────────────────────────┬───────────────────────┐
│ Buen criterio. Buenos insumos.  │ Fotografía propia     │
│ Insumo + zona                   │ mercado → cocina      │
│ Explorar / búsqueda web         │                       │
│ Ejemplo de arroz, fuente clara  │                       │
└─────────────────────────────────┴───────────────────────┘
Lista / archivo                 Estudios guardados
Resultados: proveedor + fuente / presentación + precio / selección
Herramientas complementarias: revisión de cotizaciones
```

Al buscar, la composición se vuelve compacta: desaparece la fotografía y los resultados se adelantan a las herramientas complementarias. Las capacidades sin configurar se explican cerca de su acción. El guardado y los documentos conservan sus estados reales.

## Revisión contra lo genérico

Se descartó una cuadrícula de tarjetas promocionales y métricas, porque el producto aún no tiene resultados comerciales medidos. Tampoco se recupera la ilustración anterior de envases inventados. El gesto memorable es una única naturaleza muerta de ingredientes sobre rosa, acompañada por tipografía contundente; el resto sirve al trabajo. Sin degradados, gráficos decorativos de rentabilidad ni mascotas que compitan con precios.

El símbolo combina un cuenco circular con dos granos; debe funcionar en 24 px, una tinta y positivo/negativo. La personalidad reside en proporciones y repetición consistente, no en adornar cada componente.

## Movimiento

Respuesta breve a selección, pulsación y apertura de diálogos. Entrada fotográfica única, sin bucles ni parallax. Duraciones orientativas: controles 140 ms, selección 180 ms, diálogo 200 ms, fotografía 500 ms. Respetar `prefers-reduced-motion`; los datos no se animan contando desde cero. No añadir reproductores GIF o Lottie para una interacción que CSS puede resolver sin peso adicional.

## Fuentes de referencia

- [Bricolage Grotesque, autor y licencia](https://github.com/ateliertriay/bricolage).
- [W3C: movimiento y preferencias del usuario](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html). Se aplica como criterio de diseño, no como afirmación de certificación.

## Entrega implementada

- Producto en `/`; guía interactiva en `/?view=brand`, cargada bajo demanda y con acceso desde el pie de la app en otra pestaña para preservar borradores.
- Marca compartida por exploración y comparación. Logotipo en contornos SVG (color, negativo y una tinta), símbolo de cuenco/granos y favicon.
- Fotografía creada con la herramienta integrada `imagegen`. Archivo [WebP](../../public/brand/market-still-life.webp), 1122 × 1402 px, 213,360 bytes. [Prompt exacto](../../public/brand/IMAGE_PROMPT.txt), [procedencia y uso](../../public/brand/README.md). Es una imagen editorial, no evidencia de proveedores. No se seleccionó manualmente un modelo.
- [Kit descargable](../../public/brand/surtario-brand-kit.zip) con portada 1920 × 1080, pieza 1080 × 1350 e historia 1080 × 1920 en SVG autocontenido: fotografía incorporada, texto en contornos, sin fuentes o imágenes externas.
- Guía visual con colores copiables, variantes de logo y muestra de selección interactiva sin escritura de datos de negocio.
- Búsqueda sin configurar compactada solo cuando no hay investigaciones guardadas ni ejecución local que mostrar. Los registros existentes siguen accesibles.

## Verificación y revisión adversarial

Revisados navegación, fuente/contacto sin precio, comparación, guía y portada 16:9 en navegador. App sin desbordamiento horizontal a 320/360/390/768/1366/1440/1920 px; guía a 320/390/768/1366/1440/1920 px. Teclado con foco visible de 2 px. Preferencia de movimiento reducido comprobada en la guía (`transition-duration: 0s`).

Contrastes calculados: tinta/porcelana 13.60:1; secundario/porcelana 5.53:1; blanco/primario 14.23:1; tinta/rosa 9.23:1; borde/blanco 3.45:1. Secundario/rosa 3.75:1, combinación excluida para texto normal. No es una certificación integral de accesibilidad.

94 tests de dominio/backend y build/tipos satisfactorios. En 43 E2E, 39 pasaron en paralelo; cuatro timeouts pasaron al aislarlos con un worker sin modificar aserciones ni límites (27.5 s total). El test existente de reflujo ahora incluye 1920 × 1080. No se infiere que la ejecución paralela haya quedado corregida.

La revisión local preservó sesiones, cálculo, fuentes, ausencia de precio y la distinción entre selección y compra. Sin código modificado en `convex/` ni `src/domain/`. Los tests de persistencia añaden únicamente fixtures a Convex local bajo sus comprobaciones de destino. No hubo correos, llamadas de sponsors, push ni despliegue. La llamada real a generación de imagen pertenece a esta entrega de marca; no acredita la integración OpenAI del producto.

Pendientes: búsqueda registral de marcas, revisión con usuarios, dispositivos físicos y auditoría completa de accesibilidad. La búsqueda web y de dominios preliminar está documentada en [NAMING.md](NAMING.md). Se revisó el encuadre fotográfico sin filtros adicionales: la imagen conserva luz y colores generados. La antigua ilustración no se usa en esta identidad.


## Verificación del nombre Surtario · 10 de septiembre de 2026

Nombre elegido por el usuario y aplicado conservando la dirección visual. Build/tipos y los nueve E2E existentes de exploración satisfactorios (320/390/768/1280/1920 px). Revisión visual de guía en 1920 × 1080, producto en 320 px y las tres piezas SVG. Las variantes de logotipo apuntan a Surtario y los 15 archivos servidos coinciden con disco; kit ZIP íntegro y sin nombres de archivo anteriores. Las cifras de 94 tests y 43 E2E de la entrega anterior son evidencia previa; este ajuste de nombre no volvió a ejecutar esos conjuntos completos. Dominio sin comprar; sin push ni despliegue.
