# Grabación en vivo · Surtario

Guion preparado el 20 de septiembre de 2026. Objetivo de montaje: **2:40–2:50**, siempre menos de tres minutos. No es un video grabado ni una duración final medida. Narración propuesta en inglés, igual que la interfaz. La [aceptación hosted](HOSTED_ACCEPTANCE.md) ya ejercitó Firecrawl, OpenAI API, AgentMail y Convex; no hace falta repetir pruebas de carga antes de grabar.

## Historia

Investigar un ingrediente, conservar evidencia útil, preguntar lo que falta y calcular el pedido con condiciones revisadas. El producto debe funcionar durante la toma. Se inicia una búsqueda nueva; los resultados guardados solo sirven para continuidad, no para hacer pasar una simulación por una búsqueda en vivo.

## Preparación de la toma

1. Comprobar que el PR de cierre esté publicado si se quiere mostrar el acceso nuevo a las fuentes de todas las rondas. Usar el hosting de desarrollo autorizado y una ventana de escritorio de 1920 × 1080 al 100%.
2. Tener abierto el buzón de prueba configurado, sin otras conversaciones o credenciales en pantalla. No escribir a contactos encontrados en internet. La persona que responda usará ese buzón, con términos explícitamente de prueba.
3. Grabar toda la sesión original. Acelerar las esperas con una indicación visible como **“Search accelerated”**; mantener el mismo estudio/caso. No ocultar fallos ni reemplazar resultados por los del ensayo anterior.
4. Preparar la pregunta y los términos de abajo como texto de trabajo. No precargar resultados ni afirmar precios antes de que aparezcan. Si la web cambia, mostrar lo que realmente devuelve.
5. Evitar abrir herramientas de desarrollo, configuración de proveedores o claves durante la captura. Mantener las fuentes, fechas y condiciones pendientes visibles cuando importan.

## Secuencia y narración

| Tiempo objetivo | Acción en pantalla | Narración propuesta |
| --- | --- | --- |
| 0:00–0:15 | Landing → explorar. Ingrediente: `long grain white rice`; zona: `Portland, OR, US`. Iniciar una búsqueda nueva. | “Surtario helps a kitchen research suppliers before it commits to a purchase. Start with one ingredient and a delivery area. No recipe, purchase history or order quantity is required.” |
| 0:15–0:35 | Mantener progreso, fuentes y finalización visibles. Acelerar la espera explícitamente. | “Firecrawl searches public pages while Convex keeps the research visible as it runs. These are candidate sources. Finding a price does not confirm delivery or make two products equivalent.” |
| 0:35–1:00 | Revisar un precio con su fuente/fecha; guardar la oferta. Conservar también un candidato sin precio. | “OpenAI extracts proposed details with evidence. I can check and correct them before saving. This supplier has a published pack price; this other candidate still needs a quote. Both belong in my study.” |
| 1:00–1:20 | Desde el estudio, abrir Research a question, crear la pregunta de abajo e investigar. Mostrar hallazgos de todas las rondas y una fuente priorizada. Acelerar esta espera también. | “When the first search leaves gaps, I can research a specific question. Surtario keeps the rounds together and gives me a path back to each source. Premium and organic products stay distinct.” |
| 1:20–1:45 | Preparar consulta de un candidato, revisar sugerencia y destinatario de prueba, aprobar una vez. Mostrar Messages; responder desde el buzón controlado. | “I review the inquiry before AgentMail sends it. This recording uses a controlled test inbox to demonstrate the live mail connection. The reply appears here through Convex, without refreshing.” |
| 1:45–2:15 | Revisar respuesta, pedir campos propuestos una vez, confirmar/corregir. Cantidad 60 lb y términos de abajo. | “A reply is evidence, not an automatic price update. After reviewing these test terms, sixty pounds requires three twenty-five-pound bags. That is seventy-five pounds received, fifteen left in inventory, and sixty-six dollars including delivery.” |
| 2:15–2:35 | Solicitar asesor una vez; mostrar condición pendiente y por qué selección sigue bloqueada. | “The advisor can inspect the evidence and calculate scenarios. It still cannot confirm a delivery date that the supplier never gave us. That missing condition stays visible and blocks the choice.” |
| 2:35–2:50 | Guardar comparación, recargar y recuperar. Cierre en el mismo caso. | “I can save the work and return to its sources, messages and calculation. Surtario keeps the evidence close, and the decision stays mine.” |

Los tiempos son presupuesto editorial. Conservar pausas legibles en revisión, respuesta y cálculo; comprimir esperas, no los momentos de decisión. Si el montaje supera tres minutos, recortar la escena de investigación avanzada antes de volver ilegible el flujo principal.

## Pregunta para investigación avanzada

> Find published package prices for standard long grain white rice from independent suppliers. Keep premium, organic and regenerative products distinct; leave delivery and taxes unconfirmed unless explicitly stated.

El ensayo tardó 210.288 segundos en seis rondas y encontró 21 fuentes únicas, 15 interpretadas y siete dominios con precios. Es evidencia de una ejecución, no un resultado que deba prometer la toma nueva.

## Respuesta controlada para la escena de correo

Enviar solo como respuesta al mensaje de prueba recién recibido; no a un proveedor real:

> SYNTHETIC INTEGRATION TEST ONLY — not an offer from the web supplier.
>
> Supplier: Surtario Hosted Test Supplier.
> Product: long grain white rice, standard white rice.
> Package: 25 lb bag. Price: USD 20.00 per bag.
> Minimum order: 2 bags.
> Delivery: USD 6.00 per order to Portland, Oregon.
> Goods and delivery prices include all taxes.
> Delivery timing remains unconfirmed.
> No purchase has been placed.

Revisar y guardar antes de calcular. No marcar la entrega como confirmada, ni usar estos términos para afirmar ahorro real. La conexión de correo es real; los términos comerciales son de prueba. El asesor y las extracciones usan Luna API con razonamiento bajo.

## Cierre de entrega

Reproducir el archivo exportado completo: menos de 180 segundos, texto legible, audio entendible y continuidad del mismo trabajo. Publicar solo tras revisar el resultado. Enlaces y textos listos en [SUBMISSION](../entrega/SUBMISSION.md). La grabación y publicación siguen pendientes; los antiguos tiempos de ensayo CLI de PR #35 no describen este recorrido.
