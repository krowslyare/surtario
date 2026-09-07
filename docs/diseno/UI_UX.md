# Guía de UI y UX

Versión 0.2 · 7 de septiembre de 2026 · Base visual para desarrollar. Branding comercial fuera del alcance actual. Aún no se ha validado visualmente una interfaz ni probado con restaurantes.

Esta guía aplica a la aplicación y demo. Complementa el [plan de producto](../producto/PLAN_PRODUCTO.md); no crea otra etapa de investigación o diseño de marca.

## 1. Alcance

Mantener colores, tipografía, espacios y componentes consistentes. La interfaz debe ayudar al encargado a comparar compras y entender qué está pagando.

Nombre provisional: **Compras para restaurantes**, como texto sencillo en el encabezado. Nombre comercial, logo, eslogan, posicionamiento, dominio y activos de marca se trabajarán al abordar la versión comercial. No dedicarles tareas durante este corte ni incrustar el nombre provisional en lógica de negocio.

## 2. Dirección visual

Superficies claras, espacio moderado y jerarquía fuerte. La comparación es el centro de atención. Verde reservado para acción principal y estados positivos explícitos; los precios conservan color de texto normal. Que un proveedor tenga menor precio por kg no vuelve verde toda su oferta.

Tokens de referencia: [tokens.css](./tokens.css). No es una aplicación ni una dependencia instalada. Al implementar, trasladar el archivo a `src/styles/tokens.css`, actualizar esta referencia y mantener una sola fuente de valores.

| Función | Token / valor inicial |
| --- | --- |
| Fondo de aplicación | `--color-canvas`: `#F7F8FA` |
| Superficies | `--color-surface`: `#FFFFFF` |
| Texto principal | `--color-text`: `#172B26` |
| Texto secundario | `--color-text-muted`: `#52615C` |
| Acción principal | `--color-primary`: `#126B50`, texto blanco |
| Pendiente | Texto `#8A4B08` sobre `#FFF4D6` |
| Error | Texto `#B42318` sobre `#FEECE9` |
| Información | Texto `#175CD3` sobre `#EFF8FF` |
| Bordes | Decorativos `#DCE3DF`; controles `#778880` |

Tipografía: pila de sistema sans serif; una familia para toda la aplicación, sin descarga de fuente obligatoria. Texto base e inputs 16 px; tablas y etiquetas 14 px; metadatos 12 px solo si no son decisivos. Título de pantalla 28 px y cifra destacada 32 px. Pesos 400/500/600/700; evitar texto fino. Cifras con dígitos tabulares y alineadas a la derecha en columnas numéricas.

Escala de espacios: 4, 8, 12, 16, 24, 32, 48 px. Controles de 44 px de alto como objetivo propio; radio de 8 px en controles y 12 px en paneles. Bordes suaves entre secciones, sombras solo para elementos elevados. No convertir cada cifra en una tarjeta.

La versión inicial es clara. Modo oscuro e ilustraciones propias quedan fuera de este corte. El branding se retoma para la versión comercial.

Para la entrega del concurso no diseñar sección de pricing, tarjetas de planes, checkout ni paywall. El acceso público se presenta con «Probar ejemplo». Esto se refiere a la tarifa del SaaS: precios de insumos, cotizaciones y totales permanecen visibles. La tarifa comercial está pendiente de validación.

## 3. Jerarquía de información

En una comparación mostrar, en este orden:

1. **Necesidad:** ingrediente/especificación, cantidad y entrega requerida.
2. **Resultado por proveedor:** cuánto se desembolsa, cuánto se recibe y qué excedente queda.
3. **Explicación:** precio por unidad, presentación, entrega y condiciones.
4. **Respaldo:** fecha, documento y dato original.
5. **Acción:** pedir aclaración, solicitar otra oferta o registrar una decisión.

Mostrar el precio por kg junto a su etiqueta. No permitir que una cifra grande sin contexto se confunda con el total del pedido. En la primera sesión, la ausencia de historial o recetas no produce alertas ni una configuración bloqueante.

## 4. Tres pantallas de referencia

### A. Insumos y proveedores

Encabezado con título y acción «Cargar documento». Lista de insumos identificados con presentación, proveedor, fecha y estado de revisión. Filtrar por proveedor/pendientes cuando exista suficiente información para necesitarlo; sin filtros vacíos decorativos.

Estado inicial del producto privado: «Agrega una lista o cotización para empezar». La demo pública ofrece «Probar ejemplo» con documentos sintéticos; no pide archivos privados ni obliga a iniciar sesión para explorar el ejemplo.

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

En la demo, mostrar un antes/después observable: documento difícil de comparar → condiciones ordenadas → decisión explicada. No inventar testimonios, porcentajes de ahorro ni adopción. Los logos de sponsors, cuando correspondan, van en créditos o información del proyecto, no entre precios.

## 7. Accesibilidad y teléfono

Objetivo: diseñar hacia WCAG 2.2 AA. No declarar cumplimiento por tener esta guía. Texto normal con contraste de al menos 4.5:1; texto grande al menos 3:1. Ningún estado se comunica solo por color. Referencias: [contraste](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [uso del color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).

Objetivo propio de controles táctiles: 44 × 44 px, incluidos iconos con área ampliada. Es una decisión de comodidad; no confundirla con el mínimo AA de 24 × 24 px o sus excepciones de [WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

Navegación por teclado, foco visible, nombres accesibles y orden lógico. Mensajes de estado anunciables sin interrumpir innecesariamente. Probar zoom y reflujo; botones pegados al borde inferior no deben tapar campos con teclado móvil. Evitar funciones que solo existan al pasar el mouse.

Anchos de revisión de producto: 360, 390, 768 y 1280 px; revisar también reflujo a 320 px. Espaciado lateral de 16 px en móvil y 24–32 px en escritorio. Para la comparación central, evitar scroll horizontal de toda la página.

## 8. Cómo aplicar y verificar

En la primera entrega implementar solo tokens, texto, botones, campos y comparación. Añadir el componente de documento al existir extracción; no fabricar un catálogo de componentes ajenos al flujo. Si se adopta una librería, adaptar sus controles a estas reglas en lugar de mezclar estilos.

Antes de desarrollar más pantallas, revisar las tres vistas de referencia con datos sintéticos: primera comparación, documento ambiguo y resultado parcial. Esa revisión visual sigue pendiente; puede ajustar esta versión sin cambiar el alcance de producto.

Para aceptar una pantalla: el usuario reconoce cantidad y desembolso, identifica condiciones pendientes, encuentra la fuente y entiende la próxima acción. Verificarlo con teclado y en teléfono. Las imágenes o capturas de verificación deben corresponder a la UI implementada.

Contrastes calculados de la paleta propuesta: texto principal/blanco 14.89:1; secundario/blanco 6.52:1; blanco/acción principal 6.47:1; pendiente 6.20:1; error 5.76:1; información 5.57:1. Son combinaciones sólidas concretas, no un certificado para cualquier mezcla de colores ni para la aplicación completa. Revalidar si se cambia color, fondo u opacidad.

Pendiente para la interfaz: revisión visual de pantallas y pruebas con usuarios. Branding comercial aplazado; no condiciona desarrollo ni entrega del concurso.
