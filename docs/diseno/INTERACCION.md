# Surtario: composición e interacción

## Dirección de esta entrega

La identidad aprobada se conserva: berenjena `#42202D`, rábano `#EEC6D0`, ají `#BA3527`, lima `#E4EF9B` y porcelana `#FAFAF7`. Bricolage Grotesque da carácter a títulos; Manrope mantiene legibles controles y condiciones. Valores compartidos en `tokens.css`.

El encargado de cocina explora alternativas, conserva su criterio en un estudio y solo después, si lo necesita, prepara una compra. La interfaz debe distinguir estas tareas sin obligarlo a completar un embudo.

```text
Entrada:    búsqueda + ejemplo                 fotografía de marca
Trabajo:    búsqueda compacta
            resultados / fuentes              resumen del estudio
            filtros y opciones                guardado
Apoyos:     lista de insumos                   cotizaciones y documentos
Compra:     necesidad → ofertas → condiciones y elección
```

Alineación izquierda. Desktop de referencia 1920 × 1080, contenido máximo 1536 px. En portátil las acciones se recomponen; en móvil resultados y estudio se apilan, sin paneles fijos que tapen contenido. Lista y cotizaciones se abren a pedido conservando borradores. Los controles de guardado permanecen visibles junto al estudio.

Revisión del plan: se descartó añadir un dashboard con tarjetas y una secuencia obligatoria de compra. No refleja la tarea de investigar el mercado. El lateral contiene opciones seleccionadas reales; los documentos son entradas opcionales y la compra conserva su carácter opcional. La personalidad se concentra en la identidad y el criterio de composición, sin adornar cada fila.

## Contrato de componentes

- Selectores compartidos con teclado, búsqueda por escritura, foco visible, selección pendiente explícita y menú propio. En formularios conservan `name` y los valores de `FormData`; dentro de diálogos, el menú pertenece a su capa y Escape lo cierra antes que al diálogo.
- Filtros segmentados con el mismo control y señal visible del valor activo. Sus rótulos y opciones no cambian al seleccionar.
- Botones, campos, casillas y estados usan dimensiones y tokens comunes. El foco y el texto acompañan al color; los controles inactivos no responden con animaciones de pulsación.
- Secciones desplegables con `aria-expanded`, foco fuera del contenido cerrado y conservación del estado interno.
- Diálogos con título único, cierre exterior preciso, devolución de foco y transiciones breves.

## Movimiento

Movimiento asociado a acciones: indicador de filtro, selección de una opción, apertura de menú, despliegue y diálogo. La foto mantiene su única entrada inicial. Sin bucles, cifras animadas ni entradas escalonadas en cada fila. `prefers-reduced-motion` elimina desplazamientos y transiciones. Los cálculos y las confirmaciones nunca esperan a una animación.

## Verificación prevista

Build/tipos, pruebas existentes adaptadas a controles accesibles, teclado dentro y fuera de diálogos, conservación de borradores al contraer, flujo completo sin documentos y revisión visual a 1920 × 1080 y móvil. La evidencia final se registra al ejecutar; este plan no acredita comprobaciones.


## Evidencia ejecutada · 11 de septiembre de 2026

- `npm test`: 94 pruebas de dominio/backend satisfactorias.
- `npm run test:e2e -- --workers=1`: 46 pruebas satisfactorias, incluido el recorrido completo de demo. Tras uniformizar también el despliegue de transcripción, cinco E2E de documentos/interacción volvieron a pasar.
- `npm run build`: tipos y compilación correctos. Vite advierte un bloque principal de aproximadamente 612 kB (192 kB gzip). No se midió rendimiento en dispositivos físicos.
- Revisión visual en navegador: entrada, resultados, comparación con importes en el primer encuadre y menú dentro de diálogo a 1920 × 1080; resultados a 390 × 844 y reflujo automatizado a 320/390/768/1280/1920 px. Guía de marca con los controles implementados.
- Tres pruebas de interacción adicionales cubren teclado y Escape por capas, valores del formulario tras guardar, clic dentro del panel, pendientes vacíos, correcciones conservadas al contraer, exclusión del teclado y movimiento reducido con menú a 320 px.

La revisión local corrigió un campo auxiliar que desbordaba el diálogo, una transformación que interfería con el posicionamiento del menú y la posición de scroll tras iniciar la exploración. Las pruebas esperan el cierre real del diálogo antes de editar fuera; no se ampliaron timeouts ni se relajaron aserciones de negocio. La revisión por agente independiente no se completó por límite de uso; la integración y la revisión final se realizaron en la tarea principal. No se acredita auditoría completa de accesibilidad ni validación con restaurantes.

Sin cambios en funciones Convex, llamadas de sponsors, correos, commits, push ni despliegue. Los E2E de persistencia utilizan datos sintéticos en el backend local existente.


## Refinamiento con Impeccable · 11 de septiembre de 2026

Se aplicaron las guías de polish, extract, animate y craft-floor de Impeccable 4.3.1 al recorrido de exploración. Skill local y licencias en `.agents/skills/impeccable/`, fijado al commit `cb56ed6c19a07329a9fa0cd4e657bee040156593`. El launcher inicial falló por permisos; se restauró el bit ejecutable, pero esta entrega se trabajó leyendo el contexto directamente. No se ejecutó el motor de detección ni se instalaron hooks o extensión. `PRODUCT.md` y `DESIGN.md` enlazan las fuentes existentes, sin crear otro estado de etapas.

Dirección: conservar paleta y tipografías, reducir la altura de resultados y distinguir selección, guardado y compra opcional. Se retiró la previsualización duplicada del ejemplo y se concentró el aviso de disponibilidad web junto a la búsqueda. Fuentes y fechas comparten pie de fila con acciones. El lateral muestra las opciones elegidas, prioriza guardar y mantiene compra como continuación secundaria. El acceso móvil al resumen traslada el foco al encabezado.

`Button.tsx` centraliza variantes primaria/secundaria/textual, tipo nativo explícito y estado ocupado con etiqueta reservada, spinner y `aria-busy`. Exploración y guardado lo consumen. Los botones de selección conservan ancho; cambian fondo, icono y texto. La lista del resumen responde a incorporación con un movimiento de 180 ms y hay un anuncio accesible independiente del resultado del guardado. No se animan importes. El resto de los flujos conserva sus controles anteriores.

Revisión adversarial local: selección no implica persistencia, contacto sin precio no habilita cálculo, fuentes/fechas permanecen visibles, orden visual y de teclado coinciden en guardar/recuperar, y el salto móvil conserva foco. Se corrigió desbordamiento de imagen a 768 px y una regla antigua que ocultaba la etiqueta de navegación. Los tests de guardado apuntan ahora a su región específica porque selección tiene su propio anuncio; conservan las aserciones de contenido y persistencia.

Verificación: 94 tests de dominio/backend, 47 E2E con un worker (incluido ensayo completo, persistencia y reflujo de 320 a 1920 px) y build/tipos satisfactorios. Revisión visual de escritorio, tablet y móvil; teclado y movimiento reducido cubiertos. Tras la comprobación completa se ajustó únicamente el contraste del contador activo y se volvió a compilar. El bloque principal continúa cerca de 612 kB (192 kB gzip); rendimiento físico y auditoría completa de accesibilidad pendientes. Sin cambios de backend, llamadas reales de sponsors, correos, commit, push ni despliegue. Los E2E usaron datos sintéticos en Convex local.


## Segunda pasada y coexistencia con Gemini · 11 de septiembre de 2026

Búsqueda contraída tras explorar, resultados extraídos a MarketResultRow y resumen sin repetir la lista en la vista de estudio. Guardados se abre en diálogo; el estado de guardado distingue cambios pendientes y descarta respuestas tardías de otra sesión. Revisión de interacción delegada a Sol; integración en la tarea principal. Se preservaron los ajustes posteriores de Gemini en tarjetas, sombras, badges, tokens y comparación.

En esta segunda pasada sí se ejecutaron context y el detector de Impeccable; el detector devolvió una lista vacía, lo que no acredita ausencia de problemas visuales. No se migró el esquema de PRODUCT.md.

Sobre el estado combinado actual: build/tipos satisfactorios; 13 E2E de exploración/interacción y 4 de estudios satisfactorios. Los cuatro de estudios fallaron inicialmente con Convex local apagado y pasaron tras levantar el destino local. Cubren persistencia, conflicto de revisión, desconexión, demo, teclado, movimiento reducido y reflujo entre 320 y 1920 px. Se revisaron capturas de 1440 y 390 px. Un aviso ResizeObserver apareció en la prueba de selector, que pasó; no se acredita su resolución. El bundle principal ronda 614 kB (193 kB gzip). Las 94 pruebas unitarias corresponden a la pasada anterior, no se repitieron en esta.

Sin commit, push ni despliegue remoto. El CLI descargó una actualización del backend local para poder ejecutar las pruebas. No se cambiaron funciones Convex.

Auditoría final de Luna sobre capturas: sin hallazgos P0/P1 en exploración; comparación fuera de esta ronda. Se corrigió su único hallazgo P2, texto de acciones móvil de 11 a 12 px, conservando la composición de Gemini.


### 2026-09-16 · entrada de marca al workspace
Transición rosa con logo: caída de 64 px, rebote contenido (+5 / −3 px) y asentamiento en 680 ms; frase aparece desde 420 ms. Permanencia mínima de 1,7 s y salida de 220 ms tras montar el workspace. Movimiento reducido omite animaciones. Fallo de descarga ofrece reintento. Guía de marca sin enlace en producto y ruta limitada a desarrollo. Foco global borgoña conservando grosor y visibilidad.
Build y 7/8 E2E de landing/interacción pasan; fallo de View summary 1 reproducido también sobre HEAD limpio 9fb09a3 con las mismas fuentes. Sin relajar aserciones. Capturas de carga en escritorio y 390 px revisadas y descarga reanudada hasta workspace visible. Cambios locales verificados, sin despliegue ni llamadas reales de proveedores. Los cambios anteriores del checkout raíz español quedan fuera de esta entrega.

PR review fixes: covered workspace remains inert and hidden from assistive technology until the arrival screen finishes; all focus halos derive from the shared focus token. Build and six landing/arrival E2E pass, including keyboard isolation with and without reduced motion.
