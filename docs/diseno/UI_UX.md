# Guía de UI y UX

Versión 0.6 · Revisión de jerarquía y experiencia solicitada por el usuario. Branding comercial fuera del alcance actual. Primera comparación revisada visualmente en navegador; validación con restaurantes pendiente.

Esta guía aplica a la aplicación y demo. Complementa el [plan de producto](../producto/PLAN_PRODUCTO.md); no crea otra etapa de investigación o diseño de marca.

## 1. Alcance

Mantener colores, tipografía, espacios y componentes consistentes. La interfaz debe ayudar al encargado a conocer alternativas de mercado y, cuando decida comprar, entender qué pagaría.

Nombre provisional: **Compras para restaurantes**, como texto sencillo en el encabezado. Nombre comercial, logo, eslogan, posicionamiento, dominio y activos de marca se trabajarán al abordar la versión comercial. No dedicarles tareas durante este corte ni incrustar el nombre provisional en lógica de negocio.

## 2. Dirección visual

Dirección: mesa de trabajo para investigar insumos, con tinta verde bosque y fondo blanco cálido. Búsqueda protagonista, sin hero ilustrado ni eslóganes. Los resultados comparten una lista compacta: proveedor y fuente a la izquierda, precio normalizado y presentación a la derecha; en móvil se apilan. Selección con acento lateral y texto, sin declarar ganador. «Mi estudio» permanece accesible en el encabezado al desplazarse.

Tokens implementados: [tokens.css](../../src/styles/tokens.css), única fuente de valores de la UI.

| Función | Token / valor inicial |
| --- | --- |
| Fondo de aplicación | `--color-canvas`: `#F7F8F2` |
| Superficies | `--color-surface`: `#FFFFFF` |
| Texto principal | `--color-text`: `#213D32` |
| Texto secundario | `--color-text-muted`: `#5D6C63` |
| Acción principal | `--color-primary`: `#213D32`, texto blanco |
| Selección | Verde suave `#E8EEDF`, acento `#DBEDAB` y texto explícito |
| Pendiente | Texto `#8A4B08` sobre `#FFF4D6` |
| Error | Texto `#B42318` sobre `#FEECE9` |
| Información | Texto `#175CD3` sobre `#EFF8FF` |
| Bordes | Decorativos `#DCE2D7`; controles `#849183` |

Tipografía: Manrope variable, subconjunto latino WOFF2 de 24.83 kB empaquetado localmente, con fallback de sistema y font-display swap. No consulta servicios de fuentes externos. Licencia OFL-1.1 conservada en la dependencia `@fontsource-variable/manrope`. Texto base e inputs 16 px; tablas y etiquetas 14 px; metadatos no decisivos 11–12 px. Título inicial de 32–44 px, reducido a 28 px al explorar en escritorio; cifras de mercado de 28–30 px. Pesos 400/500/600/650/800; evitar texto fino. Cifras con dígitos tabulares y alineadas a la derecha en columnas numéricas.

Escala de espacios: 4, 8, 12, 16, 24, 32, 48 px. Controles de al menos 44 px de alto. Los resultados comparten un contenedor de radio 10 px con separadores internos, sin sombras ni una tarjeta dentro de otra. Las superficies de comparación y diálogos mantienen sus estilos.

La versión es clara. La ilustración de despensa deja de mostrarse; la entrada presenta datos del ejemplo calculados desde los fixtures. Entrada de título de 300 ms, diálogos de 180 ms y transiciones de selección de 160 ms. La preferencia de movimiento reducido desactiva animaciones y transiciones. No se sustituye el desplazamiento nativo. Modo oscuro y branding comercial definitivo siguen aplazados.

Para la entrega del concurso no diseñar sección de pricing, tarjetas de planes, checkout ni paywall. El acceso público se presenta con «Probar ejemplo». Esto se refiere a la tarifa del SaaS: precios de insumos, cotizaciones y totales permanecen visibles. La tarifa comercial está pendiente de validación.

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

Entrada por insumo/categoría y zona. Separar precios de catálogo, distribuidores sin precio y referencias generales. Cada resultado muestra origen/fecha, ubicación declarada y contacto cuando exista evidencia; sin precio no significa precio cero. Seleccionar opciones permite construir un estudio sin preparar una compra. Las listas aparecen en «Tus insumos» y la revisión de documentos en «Revisar una cotización». En móvil, «Usar lista o archivo» da acceso directo a estas herramientas.

El prototipo local ofrece «Explorar ejemplo» y avisa que filtra datos ficticios; no simula una búsqueda real. La demo conectada ofrecerá «Probar ejemplo» con fuentes y contactos identificados. No exige archivos privados ni cantidad. Las condiciones no verificadas permanecen pendientes al continuar a compra.

No abrir con indicadores de ganancias, ahorro o platos que todavía no podemos calcular.

### B. Revisar documento

En escritorio, documento y campos extraídos uno al lado del otro. En teléfono, documento y campos se apilan conservando la edición; el cierre del diálogo permanece visible al desplazarse. Cada campo dudoso señala qué falta y permite corregirlo.

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

Anchos de revisión de producto: 360, 390, 768 y 1280 px; revisar también reflujo a 320 px. Espaciado lateral de 16 px en móvil y 24–32 px en escritorio. Para la comparación central, evitar scroll horizontal de toda la página.

## 8. Cómo aplicar y verificar

Construir componentes conforme aparezcan en el recorrido de exploración y comparación. Añadir el componente de documento al existir extracción; no fabricar un catálogo de componentes ajenos al flujo. Si se adopta una librería, adaptar sus controles a estas reglas en lugar de mezclar estilos.

Revisar entrada de exploración, resultados con/sin precio, estudio, compra opcional y estados parciales con datos sintéticos. La extracción documental tendrá su propia revisión cuando exista.

Para aceptar exploración: el usuario distingue precio, contacto y referencia, encuentra la fuente y conserva opciones sin cantidad ni documentos. Para aceptar compra: reconoce cantidad y desembolso e identifica condiciones pendientes. En ambas entiende la próxima acción. Verificarlo con teclado y en teléfono. Las imágenes o capturas de verificación deben corresponder a la UI implementada.

Contrastes calculados de la paleta implementada: texto principal/blanco y blanco/acción principal 11.81:1; secundario/blanco 5.54:1; secundario/fondo 5.19:1; secundario/verde suave 4.68:1; borde de control/blanco 3.30:1; texto principal/acento de selección 9.40:1. Son combinaciones sólidas concretas, no un certificado para cualquier mezcla de colores ni para la aplicación completa. Revalidar si se cambia color, fondo u opacidad.

Primera entrega revisada en escritorio y móvil, con prueba de reflujo de 320 a 1280 px y cierre de diálogos por teclado. Pendientes: extracción documental, pruebas con usuarios y auditoría completa de accesibilidad. Branding comercial aplazado; no condiciona desarrollo ni entrega del concurso.


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


## Workspace · versión 0.6

Búsqueda y proveedores ocupan la columna principal. Guardado y herramientas quedan al costado en escritorio; en móvil, los resultados preceden al guardado y las herramientas. La revisión visual descartó apilar el panel de guardado antes del primer proveedor. En comparación, cantidad y especificación preceden al guardado; restaurar el ejemplo permanece como acción secundaria.

La revisión de cotizaciones se agrupa en un desplegable nativo. Cerrar este bloque o su diálogo conserva el borrador de revisión. «Mi estudio» lleva el foco al título de la selección. Si la búsqueda web está habilitada, Enter ejecuta esa búsqueda; «Explorar ejemplo» sigue siendo una acción separada. Estado de proveedores, fuentes, impuestos y entrega permanecen explícitos.

Marca SVG sencilla compartida y favicon a juego; el nombre comercial sigue pendiente. La imagen generada se usó como referencia de composición, sin incorporar fotos de proveedores ni funciones inventadas. [Plan visual y evidencia](PULIDO_EXPERIENCIA.md).
