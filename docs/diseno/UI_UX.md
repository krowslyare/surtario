# Guía de UI y UX

Versión 1.2 · Surtario elegido por el usuario el 10 de septiembre de 2026. Identidad aplicada al producto local; validación con restaurantes y búsqueda registral de marcas pendientes.

Esta guía aplica a la aplicación y demo. Complementa el [plan de producto](../producto/PLAN_PRODUCTO.md). La dirección, historia y activos se documentan en [MARCA.md](MARCA.md).

## 1. Alcance

Mantener colores, tipografía, espacios y componentes consistentes. La interfaz debe ayudar al encargado a conocer alternativas de mercado y, cuando decida comprar, entender qué pagaría.

Nombre elegido: **Surtario**. Descriptor: **Mercado para tu cocina**. Línea de marca: **Buen criterio. Buenos insumos.** El usuario amplió el alcance para incluir identidad, assets y composición. Mantener el nombre fuera de la lógica de negocio, claves de sesión y datos de compras. La [investigación preliminar](NAMING.md) incluye coincidencias del sector y dominios. Surtario está elegido; el dominio no se compró y la búsqueda registral de marcas está pendiente.

## 2. Dirección visual

Ingredientes antes del servicio: fotografía editorial propia sobre rosa, titulares contundentes y una superficie de trabajo clara. Una sola imagen protagonista en la entrada. Al explorar, la imagen desaparece y la composición prioriza los resultados; en escritorio amplio, el resumen de selección y el guardado ocupan el lateral. Listas y cotizaciones quedan en secciones complementarias desplegables que conservan su estado. No animar cifras ni prometer ahorro. Las fuentes y condiciones permanecen visibles.

Tokens implementados: [tokens.css](../../src/styles/tokens.css), única fuente de valores de la UI. [brand.css](../../src/styles/brand.css) aplica la identidad; [workspace.css](../../src/styles/workspace.css) organiza los espacios de trabajo; [brand-guide.css](../../src/styles/brand-guide.css) pertenece solo a la página de marca, cargada bajo demanda.

| Función | Token / valor |
| --- | --- |
| Fondo porcelana | `--color-canvas`: `#FAFAF7` |
| Superficies | `--color-surface`: `#FFFFFF` |
| Tinta berenjena y acción principal | `--color-text`, `--color-primary`: `#42202D` |
| Texto secundario | `--color-text-muted`: `#72616A` |
| Superficie rábano | `--color-hero`: `#EEC6D0` |
| Acento ají | `--color-accent`: `#BA3527` |
| Detalle lima | `--color-lime`: `#E4EF9B` |
| Pendiente | Texto `#8A4B08` sobre `#FFF4D6` |
| Error | Texto `#B42318` sobre `#FEECE9` |
| Información y foco | `#175CD3` |
| Bordes | Decorativos `#E0D9DB`; controles `#99858D` |

Bricolage Grotesque variable para marca y títulos (41.34 kB WOFF2) y Manrope variable para la interfaz (24.83 kB). Ambas locales, con `font-display: swap` y licencia OFL. Inputs 16 px; texto operativo 14–16 px; metadatos secundarios 11–12 px. Titular inicial hasta 88 px en 1080p y 42–64 px en móvil; resultados 30–36 px. Cifras tabulares, moneda y unidades explícitas. No usar texto secundario sobre rosa: esa combinación solo da 3.75:1.

Espacios de 4/8/12/16/24/32/48 px, con separación editorial mayor en la entrada. Controles táctiles de al menos 44 px. Resultados dentro de una lista compartida; la selección cambia fondo y borde, además del texto del botón. El símbolo propio representa un cuenco circular y dos granos. Las variantes SVG conservan proporción; el logotipo exportado no necesita fuentes instaladas.

Referencia principal: **1920 × 1080, 16:9**, área de contenido 1536 px y márgenes de 192 px. Entrada de aproximadamente 60/40 entre tarea e imagen. Resultados con lateral de 312 px en escritorio (280 px en portátil); por debajo de 1000 px se apilan. El lateral permanece debajo de la cabecera al desplazarse en escritorio amplio. No imponer una altura fija de 1080 a toda la aplicación. Validar también 1366 × 768, 1440 × 900, 768 × 1024, 390 × 844, 360 × 800 y reflujo a 320 px. En móvil la tarea aparece antes que la foto.

Movimiento: pulsación 140 ms, selección 180 ms, diálogo 200 ms y entrada única de fotografía 500 ms. Sin bucles ni parallax. `prefers-reduced-motion` desactiva animaciones/transiciones. Mantener los datos y foco estables ante actualizaciones reactivas. CSS coordina estados de campos, selección y diálogos; Motion anima filtros y secciones desplegables. No se incorporó GIF/Lottie. Las cifras se actualizan directamente, sin interpolar importes.

La versión es clara. El modo oscuro de toda la aplicación queda pendiente; el logo negativo sí está incluido para materiales. No añadir pricing del SaaS, checkout ni paywall: la tarifa comercial sigue sin validarse. La identidad no convierte los ejemplos en fuentes reales.

## 3. Jerarquía de información

En exploración: insumo/categoría y zona → tipo de resultado → presentación/precio o contacto disponible → fuente/fecha → añadir al estudio o preparar consulta. No pedir cantidad ni documentos para conocer alternativas. Distinguir un estudio sin resultados de una búsqueda todavía no realizada y de falta de cobertura del ejemplo.

Al preparar una compra mostrar, en este orden:

1. **Necesidad:** ingrediente/especificación, cantidad y entrega requerida.
2. **Resultado por proveedor:** cuánto se desembolsa, cuánto se recibe y qué excedente queda.
3. **Explicación:** precio por unidad, presentación, entrega y condiciones.
4. **Respaldo:** fecha, documento y dato original.
5. **Acción:** pedir aclaración, solicitar otra oferta o registrar una decisión.

Mostrar el precio por kg junto a su etiqueta. No permitir que una cifra grande sin contexto se confunda con el total del pedido. En la primera sesión, la ausencia de historial o recetas no produce alertas ni una configuración bloqueante.

## 4. Tres pantallas de referencia

### A. Explorar mercado y mi estudio

Entrada por insumo/categoría y zona. Separar precios de catálogo, distribuidores sin precio y referencias generales. Cada resultado muestra origen/fecha, ubicación declarada y contacto cuando exista evidencia; sin precio no significa precio cero. Seleccionar opciones permite construir un estudio sin preparar una compra. «Cargar documento» es contexto opcional cuando esté implementado.

El prototipo local ofrece «Explorar ejemplo» y avisa que filtra datos ficticios; no simula una búsqueda real. La demo conectada ofrecerá «Probar ejemplo» con fuentes y contactos identificados. No exige archivos privados ni cantidad. Las condiciones no verificadas permanecen pendientes al continuar a compra.

No abrir con indicadores de ganancias, ahorro o platos que todavía no podemos calcular.

### B. Revisar documento

En escritorio, documento y campos extraídos uno al lado del otro. En teléfono, alternar documento/campos conservando edición; no forzar dos columnas estrechas. Cada campo dudoso señala qué falta y permite corregirlo.

Ejemplo: «Dice “caja”, pero no indica el peso. ¿Cuántos kg contiene?». Si el usuario no lo sabe, permitir conservar pendiente y continuar con otros datos; no asignar peso por defecto.

CTA: «Confirmar datos». Tipo de documento visible: oferta, lista o comprobante. Este botón nunca se denomina «Confirmar compra». Los borradores pueden guardarse sin activar datos dudosos.

### C. Comparar compra

Cantidad requerida editable en el encabezado. En escritorio, tabla con proveedores como columnas y conceptos comparables como filas. En móvil, dos ofertas en bloques consecutivos con el mismo orden de campos; un resumen común mantiene visibles los totales para evitar recordar cifras al desplazarse. No esconder total, flete o condición pendiente tras tooltips.

Orden por defecto estable al llegar nuevas respuestas. No mover filas mientras el usuario las está leyendo. Anunciar «Llegó una nueva oferta» y marcar qué cambió. El resultado actualizado sigue siendo verificable contra su documento.

Acción «Registrar decisión» abre una selección explícita; no compra. Antes de enviar correo, mostrar destinatarios, cantidad y mensaje. Elegir una oferta y registrar una compra realizada son acciones distintas.

**Ejemplo que gobierna el diseño:** para 10 kg, A cuesta S/95 y entrega 18 kg; B cuesta S/50 y entrega 10 kg. A tiene menor precio por kg, pero B requiere menos desembolso. La pantalla debe permitir entender ambas cosas sin llamar «mejor proveedor» a ninguno automáticamente.

Recetas aparece como extensión después de la comparación: «Ver impacto en platos». No forma parte del onboarding obligatorio.

## 5. Componentes mínimos y estados

| Componente | Contrato visual y de uso |
| --- | --- |
| Botón | Primario, secundario y textual; un primario por área de tarea. Etiqueta con verbo concreto. Estado ocupado conserva ancho y explica la acción |
| Campo | Etiqueta persistente, unidad visible, ayuda y error asociados. Placeholder nunca reemplaza etiqueta. Preservar valores al fallar |
| Importe | Moneda y concepto explícitos; dos decimales al presentar dinero, precisión interna sin recorte prematuro. Ausencia se muestra como «Pendiente», nunca S/0.00 |
| Estado | Texto e icono además de color: «Por revisar», «Oferta vigente», «Vencida», «Envío pendiente», «Elegida». «Elegida» no equivale a «Comprada» |
| Fuente | Documento/proveedor, fecha y acción «Ver origen». Fuente desactualizada visible junto al dato |
| Comparación | Mismos conceptos/unidades por oferta; resalta diferencias explicables. Base incompleta indica qué no se puede comparar |
| Mensaje | Acción concreta para resolver. No ocultar una falla duradera en un aviso fugaz |
| Diálogo o panel | Título claro, foco controlado, cierre predecible y edición preservada. Reservarlo para tareas delimitadas |

Estados obligatorios del flujo: vacío, procesando, resultado parcial, pendiente de revisión, confirmado, error recuperable y dato desactualizado. En correo, distinguir «enviado» de «estado de envío por comprobar»; no ofrecer reenvío ciego después de un timeout.

Una actualización reactiva no debe robar foco, reiniciar un formulario ni desplazar la selección. Los cambios de precio se señalan con texto y un énfasis breve, sin parpadeo. Respetar preferencia de movimiento reducido.

## 6. Voz y microcopy

Español claro y directo, con «tú». Familiaridad sin jerga de chat en la interfaz. Usar «insumo», «cotización», «presentación», «entrega» y «cantidad». Explicar términos poco habituales en contexto. Evitar «RFQ», «escandallo», «pipeline», «mutation» y nombres de sponsors dentro del trabajo del restaurante.

| Usar | Evitar |
| --- | --- |
| «Para comprar 10 kg, pagarías S/50 con esta oferta» | «Ahorra S/45 garantizados» |
| «Falta confirmar el costo de entrega» | «Datos inválidos» sin explicación |
| «No encontramos el peso de la caja» | «La IA tiene baja confianza» sin acción |
| «Oferta recibida el 7 sep 2026» | «Precio actual» sin fecha |
| «Registraste esta decisión» | «Compra completada» si solo se eligió una oferta |
| «Referencia de mercado; condiciones distintas» | «Precio verdadero del mercado» |

Fechas legibles y sin ambigüedad. Moneda y unidades consistentes; no mezclar separadores decimales dentro de la misma pantalla. En inputs, interpretar separadores con reglas explícitas y mostrar el valor entendido antes de confirmar. No convertir automáticamente una coma ambigua en un importe distinto.

En la demo, mostrar un recorrido observable: pregunta de mercado → fuentes y alternativas → estudio útil. Continuación opcional: condiciones ordenadas → decisión de compra explicada. No inventar testimonios, porcentajes de ahorro ni adopción. Los logos de sponsors, cuando correspondan, van en créditos o información del proyecto, no entre precios.

## 7. Accesibilidad y teléfono

Objetivo: diseñar hacia WCAG 2.2 AA. No declarar cumplimiento por tener esta guía. Texto normal con contraste de al menos 4.5:1; texto grande al menos 3:1. Ningún estado se comunica solo por color. Referencias: [contraste](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [uso del color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).

Objetivo propio de controles táctiles: 44 × 44 px, incluidos iconos con área ampliada. Es una decisión de comodidad; no confundirla con el mínimo AA de 24 × 24 px o sus excepciones de [WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

Navegación por teclado, foco visible, nombres accesibles y orden lógico. Mensajes de estado anunciables sin interrumpir innecesariamente. Probar zoom y reflujo; botones pegados al borde inferior no deben tapar campos con teclado móvil. Evitar funciones que solo existan al pasar el mouse.

Referencia desktop 1920 × 1080; revisar también 1366/1440 px y anchos de 360, 390, 768 y 1280 px, con reflujo extremo a 320 px. Espaciado lateral de 16 px en móvil y 24–32 px en escritorio. Para la comparación central, evitar scroll horizontal de toda la página.

## 8. Cómo aplicar y verificar

Construir componentes conforme aparezcan en el recorrido de exploración y comparación. Añadir el componente de documento al existir extracción; no fabricar un catálogo de componentes ajenos al flujo. Si se adopta una librería, adaptar sus controles a estas reglas en lugar de mezclar estilos.

Revisar entrada de exploración, resultados con/sin precio, estudio, compra opcional y estados parciales con datos sintéticos. La extracción documental tendrá su propia revisión cuando exista.

Para aceptar exploración: el usuario distingue precio, contacto y referencia, encuentra la fuente y conserva opciones sin cantidad ni documentos. Para aceptar compra: reconoce cantidad y desembolso e identifica condiciones pendientes. En ambas entiende la próxima acción. Verificarlo con teclado y en teléfono. Las imágenes o capturas de verificación deben corresponder a la UI implementada.

Contrastes calculados de Surtario: texto principal/porcelana 13.60:1; secundario/porcelana 5.53:1; blanco/acción principal 14.23:1; berenjena/rosa 9.23:1; borde de control/blanco 3.45:1; ají/porcelana 5.54:1. Texto secundario/rosa 3.75:1: no usar para texto normal. Son combinaciones sólidas concretas, no un certificado para la aplicación completa; revalidar fondos y opacidades al editar.

Primera entrega revisada en escritorio y móvil, con prueba de reflujo de 320 a 1280 px y cierre de diálogos por teclado. Pendientes: extracción documental, pruebas con usuarios y auditoría completa de accesibilidad. La identidad Surtario está aplicada localmente; búsqueda registral de marcas y validación comercial pendientes.


## Guardado de estudios · entrega local

«Guardar estudio» confirma solo tras respuesta de Convex. «Guardados» muestra carga, vacío o lista reactiva; nunca sustituir carga por cero. Recuperar conserva fuentes y selección; actualizar desde una revisión antigua muestra conflicto y exige recuperar la versión actual. Un cambio en otra pestaña actualiza la lista y conserva el borrador abierto.

Sin conexión se informa guardado no confirmado y se conserva el borrador. Un error de consulta no debe derribar exploración. La sesión pertenece a este navegador; avisar que borrar almacenamiento pierde acceso y que los borradores de mensajes siguen transitorios; las comparaciones de ejemplo tienen guardado independiente. Sin backend configurado no mostrar éxito de persistencia. Revisión visual realizada en escritorio y móvil sobre la UI implementada.


## Evidencia del pulido visual

Aplicado a portada, resultados, guardados, comparación y diálogos, conservando cálculos y persistencia. Revisión en navegador de escritorio y móvil; 15 pruebas de exploración/comparación, incluidas fuentes, teclado y reflujo a 320/390/768/1280 px, y build/tipos satisfactorios. Se comprobó también la portada antes de buscar y se corrigió el nombre accesible de ayuda al ocultarse su texto en móvil. No acredita un premio de diseño ni auditoría completa de accesibilidad.


## Revisión de composición · versión 0.5

Se retiraron eslóganes e ilustración del flujo principal. La búsqueda ocupa el primer bloque; el precio por unidad destaca sobre el importe del empaque, que permanece visible. Fuentes, fechas y condiciones pendientes se conservan. Resultados compactos y encabezado de estudio persistente revisados en escritorio y móvil. Build y 19 E2E satisfactorios, incluido el ensayo de demo y reflujo de 320 a 1280 px. Sin cambios de backend, integraciones ni despliegue.


## Entrada local de listas

Acceso secundario «Añadir lista o archivo» debajo de la búsqueda. Diálogo con entrada manual/archivo, elección explícita de hoja y columna, vista previa y revisión editable antes de confirmar. El selector de archivo tiene etiqueta propia en español; no depende del texto del navegador. La cola permite investigar uno por uno y conserva el origen. Archivo y lista transitorios se explican junto a sus controles; fotos/PDF muestran extracción pendiente y alternativa manual. No se presenta carga local como extracción de IA. Revisión en escritorio y móvil; [evidencia de entrada](../desarrollo/ENTRADA_INSUMOS.md).


## Revisión de cotización · ejemplo local

Documento y campos con evidencia en dos columnas en escritorio; una columna en móvil. Pendientes vacíos, correcciones señaladas y checkbox invalidado tras editar. Borrador conservado al cerrar, no al recargar. La UI identifica la simulación y no afirma haber llamado a IA. En comparación, los valores confirmados se distinguen de la propuesta extraída. [Evidencia](../desarrollo/EXTRACCION_REVISION.md).

## Comparaciones guardadas y elección

Guardado independiente del estudio, con lista reactiva y recuperación de condiciones. «Elegir oferta» solo se habilita cuando esa oferta es calculable; el estado indica elección, no compra. Cambiar condiciones invalida la elección activa. Datos de fuentes conservan su fecha original; el guardado no convierte un ejemplo en una cotización real. Errores, desconexión y restricción a ejemplos se explican junto al control de guardado.


## Evidencia de identidad Surtario · 10 de septiembre de 2026

Entrada, resultados, comparación y página de marca revisados con datos sintéticos. Se comprobaron vista 1920 × 1080, adaptación móvil, fuente/contacto, selección y enlaces de assets. La guía permite copiar colores, alternar SVG positivo/negativo/una tinta y probar selección sin escribir datos de negocio. Movimiento reducido de la selección comprobado en navegador (`transition-duration: 0s`).

94 tests de dominio/backend y build satisfactorios. En 43 E2E, 39 pasaron en la ejecución paralela; cuatro agotaron el tiempo de ejecución. Esos cuatro pasaron después aislados con un worker, sin cambiar aserciones ni límites. Incluyen recuperación documental, archivo inválido y respuestas vinculadas. El E2E de reflujo añade explícitamente 1920 × 1080. No acredita pruebas en dispositivos físicos, auditoría completa de accesibilidad, disponibilidad legal del nombre ni despliegue.


## Verificación del nombre Surtario · 10 de septiembre de 2026

Nombre elegido por el usuario y aplicado conservando la dirección visual. Build/tipos y los nueve E2E existentes de exploración satisfactorios (320/390/768/1280/1920 px). Revisión visual de guía en 1920 × 1080, producto en 320 px y las tres piezas SVG. Las variantes de logotipo apuntan a Surtario y los 15 archivos servidos coinciden con disco; kit ZIP íntegro y sin nombres de archivo anteriores. Las cifras de 94 tests y 43 E2E de la entrega anterior son evidencia previa; este ajuste de nombre no volvió a ejecutar esos conjuntos completos. Dominio sin comprar; sin push ni despliegue.


## Componentes e interacción · versión 1.2

El [contrato de interacción](INTERACCION.md) recoge la composición y sus decisiones. `src/components/ui/Select.tsx` es el selector de todas las pantallas, sobre Radix Select: valor pendiente explícito, navegación por teclado y menú dentro de la capa del diálogo. `Disclosure.tsx` conserva borradores y excluye los controles cerrados del teclado. `SegmentedControl.tsx` se comparte entre filtros de resultados y variantes de marca. `controls.css`, `select.css` y `motion.css` establecen estados visuales y movimiento comunes. Los nuevos componentes deben consumir estos controles y los tokens existentes.

Explorar o abrir un estudio lleva el foco a su resultado. El lateral reúne selección, guardado y la continuación opcional a compra. «Lista de insumos» y «Cotizaciones y documentos» se despliegan aparte. En comparación, necesidad, guardado y ofertas tienen zonas diferenciadas; los importes aparecen dentro del primer encuadre de 1920 × 1080 en el ejemplo inicial. La guía de marca incorpora selectores, filtros, sección desplegable y diálogo reales para probar el estándar.

Revisión local de contratos: valores de `FormData`, pendientes vacíos, invalidación de confirmaciones, Escape por capas, devolución de foco, clic en el interior del panel y persistencia al contraer. Se corrigieron desbordamiento causado por campos auxiliares, coordenadas del menú afectadas por transformaciones y posición tras explorar. Las pruebas esperan la finalización del cierre antes de editar fuera de un diálogo; no se ampliaron límites ni relajaron resultados esperados.

Verificación de 1.2: 94 tests y 46 E2E con un worker satisfactorios; cinco E2E de documentos/interacción repetidos después del último ajuste. Build y revisión visual de escritorio 1920 × 1080 y móvil correctos. El aviso de tamaño del bloque principal y los límites de validación se registran en [INTERACCION.md](INTERACCION.md). Sin cambios de backend, push ni despliegue.


### Refinamiento de exploración con Impeccable

El recorrido de mercado y su guardado consumen `src/components/ui/Button.tsx`; las variantes y estados viven en `controls.css`. Resultados y resumen siguen `workspace.css`, con fuentes junto a acciones, opciones elegidas visibles y compra opcional secundaria al guardado. `PRODUCT.md` y `DESIGN.md` son entradas resumidas a estas guías. Evidencia y límites en [INTERACCION.md](INTERACCION.md).
