# Comparación de insumos y proveedores, con impacto opcional en recetas

Plan de producto y hackatón · 7 de septiembre de 2026 · v1.1. Incorpora la decisión de producto de dar valor con insumos/proveedores antes de pedir recetas. La revisión adversarial y segunda lectura corresponden a v1.0; esta reformulación tiene revisión de coherencia del agente principal. Ver [historial de revisión](./REVISION_ADVERSARIAL.md).

Este documento define trabajo futuro. No hay aplicación implementada, piloto confirmado, integración ejecutada ni validación comercial. El nombre de producto está pendiente; no condiciona el desarrollo.

Para ejecutar el plan, seguir [las etapas de desarrollo](../desarrollo/ETAPAS.md). El estado de esas etapas se mantiene allí; las fechas de este documento son objetivos de planificación.

## 1. La apuesta

**Ayudar al encargado de un restaurante a comparar insumos y proveedores para decidir su próxima compra, usando los documentos que ya recibe. Si incorpora recetas, mostrar también el impacto en sus platos.**

Promesa inicial: «Pasa tus cotizaciones o listas de precios y dinos cuánto necesitas. Te mostramos qué ofrece cada proveedor y cuánto tendrías que pagar».

**Entrada progresiva:** primero comparar ofertas; luego, con compras registradas, detectar cambios frente a lo pagado antes; finalmente, con recetas confirmadas, calcular impacto por plato. Cada etapa entrega valor por separado. Crear una receta nunca es requisito para comparar, pedir cotización, registrar una decisión o volver a usar el producto.

La unidad de valor es una decisión documentada: detectar un cambio, verificarlo, comparar alternativas y registrar qué decidió el encargado. No es conversar con un bot, abrir un dashboard ni recibir alertas de cualquier fluctuación.

Dos objetivos, un mismo flujo:

| Perspectiva | Resultado buscado | Evidencia necesaria |
| --- | --- | --- |
| Restaurante | Comparar una compra entre proveedores con poco trabajo adicional; añadir costeo de platos cuando tenga recetas | Documentos reales, comparación revisada por el encargado, segundo uso y disposición a pagar |
| Hackatón | Conectar documentos, referencia de mercado y cotizaciones en una decisión completa; impacto en recetas como extensión | Integraciones ejecutadas, demo pública reproducible y flujo completo aun con cero recetas |

La demo demuestra funcionamiento. Un piloto demuestra utilidad local. Ninguno, por sí solo, demuestra demanda global ni retención. **Piloto pendiente: aún no hay restaurante disponible.** Construir y concursar no depende de conseguirlo; afirmar preparación comercial sí requiere validar después el uso real.

## 2. Cliente inicial y expansión

**Cliente inicial propuesto:** restaurante independiente de un local en Lima, compras frecuentes y una persona responsable que pueda confirmar insumo, presentación y cantidad requerida. Puede trabajar con papel, Excel, fotos y WhatsApp; no necesita POS ni recetas documentadas. Una carta repetible es requisito solo para habilitar la etapa de costeo por plato.

El dueño o administrador paga; el encargado de compras usa la herramienta. El chef interviene si se habilitan recetas o si una equivalencia exige validar calidad/rendimiento. En algunos restaurantes será la misma persona.

Priorizar acceso real sobre una cocina elegida por estética. Una cocina criolla con platos repetibles puede servir; una cevichería exige controlar especie, presentación y rendimiento del pescado. No elegir pescado como primera categoría de equivalencias automáticas.

No encajan inicialmente: operaciones sin ninguna oferta, lista o precio de compra verificable, grandes cadenas que requieren integrar su ERP desde el primer día, y usuarios que solo quieren una calculadora puntual. No tener porciones estandarizadas impide costear platos, pero no impide comparar insumos equivalentes.

**Perú primero significa:** interfaz móvil en español, soles, unidades métricas, nombres locales y presentaciones por proveedor, fechas locales y captura de fotos/PDF/texto. No implica construir facturación SUNAT, contabilidad ni una plataforma para toda Latam.

**Global después, condicionado:** guardar moneda, zona horaria, unidad y procedencia como datos; evitar valores fijos desperdigados por el código. Una moneda por restaurante, sin conversión de divisas. No construir traducciones completas, países, motores tributarios o marketplaces ahora. Explorar otro mercado cuando varios locales sostengan el uso durante varias semanas y paguen; primero replicar en el mismo segmento.

## 3. Diferenciación que todavía hay que demostrar

El costeo de recetas, lectura de facturas y alertas de precios ya existen. MarketMan anuncia esas funciones [S3, S14]; Fudo ofrece en Perú recetas, costos, compras y control de mermas [S13]. PUNKU se enfoca en pastelería y es una referencia adyacente [S4]. No usar «primero en Perú» ni «sin competencia».

Hipótesis de entrada: resolver un caso pequeño sin migrar la operación, transformar documentos cotidianos en costos verificables y conectar cada cambio con una compra concreta. La comparación comercial debe incluir el Excel actual del encargado, además de otros SaaS.

Frente a un chat generalista, demostrar en el mismo caso: equivalencias de presentaciones conservadas, fuente de cada cifra, revisión de ambigüedades, recepción posterior de una cotización vinculada a la misma compra y comparación actualizada sin repetir toda la carga. Con recetas, añadir propagación del costo a platos relacionados. Si el usuario resuelve igual de fácil su trabajo con un chat y una hoja, la diferencia no está probada. Probar esa comparación con los mismos documentos; no asumir que otros productos exigen migrar toda la operación sin verificar su onboarding.

## 4. Datos: tres precios que nunca se mezclan

| Tipo | Qué significa | Qué permite |
| --- | --- | --- |
| Compra confirmada | Precio documentado de una compra del restaurante | Base de costo estimado usando la última compra válida de cada insumo |
| Oferta del proveedor | Precio condicionado a presentación, cantidad, vigencia y entrega | Escenario de próxima compra; confirmar extracción no la convierte en compra |
| Referencia de mercado | Observación pública de un producto, mercado y fecha | Tendencia o motivo para consultar; no prueba sobreprecio ni disponibilidad |

Mostrar siempre qué base se usa. «Costo estimado con últimas compras» no equivale al costo contable de lo consumido: no tenemos lotes ni inventario. Una factura antigua cargada hoy no reemplaza una compra más reciente. Guardar fecha del hecho y fecha de carga por separado.

**Requisitos por resultado:** dos ofertas comparables permiten contrastar precios por unidad; añadir cantidad requerida permite calcular desembolso y excedente. Una sola oferta permite preparar la compra y solicitar alternativas, pero no afirmar qué proveedor conviene más. Una compra histórica comparable habilita «subió frente a tu última compra». Ninguna de estas salidas necesita receta. La referencia web es contexto opcional, no un segundo proveedor.

El usuario puede confirmar una compra inicialmente desde un registro manual, con fecha, proveedor y procedencia marcada; una lista o cotización nunca pasa sola a compra. «Confirmar datos» valida la extracción; «Registrar compra realizada» es un acto distinto y explícito. Si faltan datos, mostrar «pendiente» o «costo parcial»; un ingrediente desconocido nunca cuesta cero.

Para cada precio: ingrediente y especificación, proveedor o mercado, cantidad del empaque, unidad, importe y moneda, fecha, impuestos incluidos/excluidos/desconocidos, entrega, origen y línea o página de respaldo. No convertir atados/cajas/unidades a kilos sin peso confirmado. No convertir volumen a masa sin equivalencia específica validada.

Guardar el vínculo aprobado «artículo del proveedor → ingrediente → presentación». Un cambio de empaque, descripción material o condición abre revisión de nuevo. «Limón» no basta para inferir calidad equivalente; tampoco «pescado» para inferir especie.

### Cálculo mínimo de compra y extensión a recetas

La aritmética corre en funciones deterministas, no en texto generado por IA. Cantidades base en gramos/mililitros/unidades; importes con precisión definida y redondeo solo al presentar totales.

En la entrada sin recetas: precio por unidad comprada = importe de mercancía / contenido total confirmado. Para cantidad necesaria `Q` y empaque de contenido `E`: paquetes = redondear hacia arriba `Q/E`, aumentando hasta cumplir el mínimo y múltiplo de compra declarado por el proveedor; excedente = paquetes × `E` − `Q`; desembolso = importe de esos paquetes + cargos de pedido conocidos. Si existe un mínimo monetario u otra condición que no podemos resolver, marcar oferta pendiente en vez de suponer que aplica. El ejemplo completo está en la sección 9. Comparar producto con la misma especificación no requiere estimar merma culinaria. Si las presentaciones difieren en rendimiento útil, no declarar equivalencia sin validarlo.

Para cantidad neta `q` y rendimiento técnico `y` entre 0 y 1: cantidad comprada necesaria = `q / y`. Costo de ingrediente = cantidad comprada × precio comparable por unidad. Si la receta registra peso bruto, no aplicar merma otra vez. Rendimiento de limpieza y rendimiento de un lote son conceptos separados; nunca duplicarlos.

Ejemplo sintético, con todos los precios sobre la misma base tributaria: un plato necesita 0.18 kg netos de un insumo, rendimiento 75%, precio de compra S/20/kg. Necesita 0.24 kg brutos: costo S/4.80. Con S/25/kg el costo pasa a S/6.00: sube S/1.20. Si los demás ingredientes cuestan S/5.20, el plato pasa de S/10.00 a S/11.20. Con precio de venta comparable de S/30, el porcentaje disponible después de ingredientes pasa de 66.67% a 62.67%, una caída de 4 puntos porcentuales. No es utilidad neta.

Primera pantalla: insumo, ofertas por proveedor, precio por unidad, presentación, desembolso para la cantidad requerida y condiciones pendientes. El cambio frente a una compra previa aparece solo si existe esa compra comparable. En la etapa opcional de recetas, mostrar costo por porción y cambio en soles. El indicador porcentual se llama «margen estimado sobre ingredientes», explica lo que excluye y solo aparece si venta y compra tienen una base consistente. No hacer conversiones tributarias automáticas ni fijar una tasa para todos los restaurantes. Si la base es desconocida, pedir confirmación y no presentar un porcentaje engañoso.

Sin unidades vendidas no hay impacto mensual ni ranking de pérdida total. Sin mano de obra, desperdicio real y demás gastos no hay rentabilidad del negocio. Un escenario por cantidad planificada no se etiqueta como ahorro realizado.

## 5. Recorrido del usuario

1. **Primera comparación, sin recetas:** cargar foto, PDF o texto de ofertas/listas disponibles. La IA extrae insumo, proveedor, presentación, fecha y precio; el encargado confirma campos necesarios. Con una oferta se puede preparar solicitud de alternativas. No pedir carta, gramajes, precio de venta ni historial para empezar.
2. **Necesidad de compra:** indicar un ingrediente/especificación, cantidad y entrega requerida. Con dos ofertas comparables, mostrar precio por unidad, desembolso y excedente. Con condiciones faltantes, pedir aclaración; no declarar ganador.
3. **Completar alternativas:** seleccionar proveedores conocidos y revisar la solicitud antes de enviarla por correo o copiarla para WhatsApp. Una referencia web fechada puede fundamentar la consulta. La recepción de una nueva respuesta actualiza la misma comparación.
4. **Decisión:** «Mantengo proveedor», «Pedir aclaración», «Elegí esta oferta» o «Sin acción», con razón opcional. Elegir oferta no registra compra. Este paso ya completa el primer resultado del producto.
5. **Seguimiento de insumos:** si se adjunta comprobante o registra una compra realizada, conservar precio y fecha para comparar con futuras ofertas/compras. Informar subidas solo contra una base comparable. El historial crece con el uso; no exigir carga retrospectiva completa.
6. **Impacto en platos, opcional:** vincular una o varias recetas a los insumos existentes; confirmar cantidades y rendimiento con el chef. Una foto de la carta no proporciona la receta. Desde entonces, mostrar costo por porción e impacto de ofertas como escenarios. Las recetas incompletas no bloquean ninguna función de compras.

En la primera etapa, «pendiente» se refiere a una condición de compra que falta. No mostrar un tablero de platos vacío ni exigir configurar recetas para cerrar el onboarding. La invitación «Ver qué platos afecta» aparece como extensión después de obtener valor con la comparación.

### WhatsApp y correo

El dueño puede copiar texto o cargar una foto/documento que recibió por WhatsApp. Para pedir cotización allí, el producto prepara un texto que el dueño copia y envía; después carga la respuesta. Eso es un paso manual explícito, no una integración de WhatsApp ni acceso a sus chats.

AgentMail es un canal adicional real para proveedores que sí usan correo. Un correo reenviado por el encargado debe conservar proveedor original y procedencia, sin confundir al remitente del reenvío con el vendedor. No obligar a cambiar de canal para comparar compras.

Si ningún proveedor del piloto responde por correo, el piloto comercial puede seguir por carga manual; el caso de AgentMail para la hackatón se demuestra con buzones de prueba identificados. No presentarlo como adopción real de proveedores.

## 6. Alcance cerrado

| Construir para la hackatón | Para habilitar un piloto con datos privados | Fuera de esta versión |
| --- | --- | --- |
| Comparación de insumos con cero recetas; de una a tres recetas como extensión si el núcleo está listo | Ofertas propias y condiciones confirmadas; recetas solo para activar impacto por plato | Inventario perpetuo, FIFO, contabilidad y POS |
| Foto/PDF/texto → extracción → revisión → precio | Carga privada con aislamiento por restaurante | WhatsApp Business integrado y lectura de chats |
| Diferencias por unidad y desembolso con evidencia; por porción solo con receta | Un administrador autenticado para el primer piloto; colaborador opcional, sin permiso de envío | Compras, pagos o cambios de carta automáticos |
| Una fuente web y pocos ingredientes comparables | Fechas, cobertura y fuente desactualizada visibles | Todos los mercados, todas las especies y todos los países |
| Una solicitud, dos ofertas y comparación | Proveedores reales elegidos por el restaurante | Marketplace de proveedores o búsqueda masiva de contactos |
| Registro de decisión y escenario de compra | Exportación básica de datos, retirada de documentos y recuperación verificada | Predicción de demanda, ventas inferidas, chat abierto y consejos culinarios libres |
| Demo pública con datos sintéticos y correo restringido | Soporte del piloto y límites de uso definidos | Audio, app nativa, suscripción autoservicio y multi-local |

La segunda columna es un requisito para aceptar datos privados, no una obligación de completar antes del concurso si seguimos sin piloto. Para la demo basta una sesión aislada por visitante y administración del equipo, con autorización en servidor; no construir invitaciones y roles comerciales todavía. Aislar sesiones y restringir correo sí es parte del mínimo público. El modelo conserva `restaurantId` para no rehacer los límites al incorporar un cliente.

Dos vistas principales de entrada: **Insumos y proveedores**, **Compras**. La captura se abre desde ambas. **Recetas** se habilita como extensión opcional y no domina la navegación inicial. Radar de mercado dentro del detalle del ingrediente; etiquetas de fecha y origen junto a cada cifra.

Semáforo opcional subordinado a cifras: umbrales configurados por restaurante, intervalos completos y estado gris para datos insuficientes. No usar el 20/80 ni un margen universal como ley del negocio.

## 7. Integraciones y arquitectura proporcional

Propuesta de implementación: React + TypeScript + Vite; Convex para datos, almacenamiento, queries, mutations y trabajo programado. Hosting `convex.site` mediante el componente oficial. Confirmar versiones y SDK al comenzar; este plan no certifica instalaciones ni credenciales.

| Componente | Trabajo y límite | Prueba del primer corte |
| --- | --- | --- |
| OpenAI | Extraer campos y evidencia a un esquema; describir cambios ya calculados. No inventar pesos, recetas ni resultados numéricos | Documento claro y documento ambiguo: el segundo pide el dato faltante |
| Firecrawl | Leer una fuente pública elegida y guardar una observación fechada | Extraer dos fechas comparables del mismo producto con vínculo a origen |
| AgentMail | Un buzón de prueba para demo; uno por restaurante al habilitar piloto. Entrada de adjuntos y salida de solicitudes aprobadas | Enviar a buzón de prueba y recibir respuesta vinculada a la solicitud |
| Convex | Persistir precios y solicitudes, incorporar respuestas a la comparación y sincronizar vistas; propagar a recetas cuando existan | Dos vistas autorizadas del mismo restaurante o sesión ven la nueva oferta; visitantes independientes no comparten datos |

Structured Outputs ayuda a fijar el formato, no garantiza que una extracción sea verdadera [S5]. Elegir el modelo que cumpla el pequeño corpus de documentos con costo/latencia medidos; no fijar por prestigio un modelo ni generar cada fila repetidamente.

Los componentes Firecrawl y AgentMail figuran en el catálogo oficial [S6–S7]. Probarlos temprano. Si no exponen una capacidad necesaria, usar el SDK desde una action; documentar el uso real de Convex, sin encajar componentes extra para decorar.

**Modelo mínimo de compras:** restaurantes/miembros; ingredientes y presentaciones aprobadas; documentos; observaciones de precio; solicitudes y ofertas; decisiones; trabajos de integración. **Extensión:** recetas y versiones, relacionadas con ingredientes ya existentes. Ninguna entidad de compra exige un `recipeId`. Incluir `restaurantId` en datos privados y resolver membresía en servidor. Catálogo público separado de equivalencias privadas; no compartir recetas ni precios negociados entre restaurantes.

Una preparación base puede tener ingredientes y rendimiento por lote; limitar a un nivel de uso dentro de un plato y bloquear ciclos. Es opcional para el concurso si podemos expresar el caso con ingredientes directos; se añade cuando una receta real lo necesite. Las recetas publicadas se versionan para explicar los costos anteriores. Guardar los IDs de versión y observaciones usados en cada comparación: cambiar el precio actual no reescribe una decisión anterior. Evitar un constructor universal de fórmulas.

**Flujo técnico:** mutation registra intención → action llama al proveedor → mutation guarda resultado validado → queries actualizan la interfaz. Llamadas externas no son transacciones de base de datos; el scheduler no convierte un correo en un efecto exactamente una vez [S8]. Una oferta validada actualiza la comparación de compra aunque no haya recetas. Al confirmar una compra válida, actualizar historial del insumo y, si existen recetas vinculadas, recalcularlas de forma consistente. Las ofertas alimentan escenarios independientes. No hace falta procesar una carta global ni diseñar colas distribuidas propias.

Documentos: `recibido → extrayendo → por_revisar → confirmado` o `error`. Solicitudes: `borrador → envío_pendiente → enviado → con_respuestas → cerrado`; `envío_incierto` requiere comprobar estado antes de reintentar. Un fallo no borra el documento ni el borrador.

Conservar IDs de evento/mensaje/documento y clave de envío estable. Deduplificar entrada, usar idempotencia de envío soportada por AgentMail [S9] y verificar soporte en SDK/componente. No reintentar ciegamente después de un timeout. Firmas de webhooks verificadas antes de procesar; el buzón resuelve el restaurante en servidor. En demo, el buzón compartido vincula cada respuesta a la solicitud y sesión originales mediante IDs persistidos, nunca por un `restaurantId` declarado en el correo. Respuestas sin correspondencia quedan pendientes de revisión, sin modificar escenarios.

Correo, PDF y web son datos no confiables: sus instrucciones no pueden modificar destinatarios, revelar recetas, ejecutar herramientas ni activar una compra. La IA de extracción no tiene permisos de envío. Secretos solo en servidor; archivos privados no expuestos por enlaces públicos permanentes.

## 8. Fuente de mercado y cuándo abandonarla

MIDAGRI publica boletines de precios de Lima [S10]. Esto confirma existencia, no una API estable, licencia de redistribución, acceso exitoso por Firecrawl ni equivalencia con el proveedor del restaurante. La consulta automatizada de la página falló una vez durante esta planificación: prueba temprana obligatoria.

Primer experimento: una publicación, dos fechas, tres a cinco productos y una especificación comparable por producto. Guardar fecha de publicación, fecha de extracción, mercado, variedad, unidad y enlace. Respetar acceso y condiciones de uso; si no se puede republicar el documento, conservar solo lo permitido y enlace de origen.

Actualizar diariamente si la fuente lo permite. Reactividad significa mostrar el resultado cuando llega, no inventar un mercado en tiempo real. Un fallo conserva la última observación con su fecha y aviso de desactualización; no reutilizarla como precio de hoy.

Si falla la fuente, dedicar como máximo un día al segundo candidato: catálogo público de un distribuidor con precio y presentación explícitos. Cambia el rótulo a «precio de catálogo». Si tampoco hay una fuente útil y extraíble, no sustituir silenciosamente por datos inventados: se puede continuar el núcleo comercial, pero el objetivo de los cuatro sponsors queda incompleto; registrar el bloqueo y revisar la estrategia de concurso antes de invertir en presentación.

Para que Firecrawl aporte a la decisión, la interfaz explica qué justifica consultar: por ejemplo, la oferta del proveedor cambió mientras la referencia comparable tuvo otra evolución. Eso habilita «Consultar precio y condiciones», no «Tu proveedor te estafa». Si no hay equivalencia suficiente, mostrar solamente tendencia contextual y no calcular un supuesto sobreprecio. La comparación final siempre usa ofertas con condiciones, nunca un boletín como oferta comprable. Registrar dos resultados separados del spike: extracción técnica y pertinencia del dato para el caso elegido.

## 9. Comparación de compras sin ahorro ficticio

La solicitud contiene **un solo ingrediente y una especificación**, cantidad requerida, unidad, lugar y fecha de entrega. Restringir inicialmente a proveedores conocidos del negocio; en demo, dos proveedores ficticios. No construir compras con múltiples artículos ni asignación de gastos compartidos en este corte.

Para cada oferta calcular paquetes enteros necesarios, cantidad sobrante, importe de mercancía y total con entrega e impuestos conocidos. Mostrar desembolso y precio por unidad comprada. Costo por unidad útil solo si existe rendimiento confirmado; no exigirlo para comparar productos de la misma especificación. Un saco más barato por kilo puede costar más dinero y dejar excedente perecible.

**Regla cerrada del MVP:** el escenario de receta usa el precio del ingrediente por unidad bruta comprada y el rendimiento confirmado; excluye flete y lo declara. La comparativa de pedido muestra el flete por separado y el desembolso completo. No repartir flete ni descuentos generales entre recetas. Un descuento explícito del único artículo sí ajusta su importe. Si existe un cargo no clasificable, marcar comparación incompleta. El excedente se muestra como cantidad pendiente de uso; no se da por perdido, vendido ni ahorrado.

Caso de aceptación sintético: necesidad 10 kg; A ofrece saco de 18 kg a S/80 más S/15 de entrega; B ofrece 10 kg a S/5/kg con entrega incluida. A es S/4.44/kg de ingrediente, pero exige desembolsar S/95 y deja 8 kg; B exige S/50 sin excedente. El sistema no declara A ganador por kilo ni imputa S/95 como costo de consumir solo 10 kg. El encargado decide según uso previsto del excedente.

La calidad, plazo, crédito y mínimo de compra pueden invalidar la comparación. En el MVP se confirman manualmente. No recomendar sustitución de especie o ingrediente; tampoco cambiar receta, alérgenos, porciones o precio al cliente sin intervención del chef/encargado.

Nombres de resultados: «diferencia entre ofertas para esta compra», «impacto estimado por porción» y «decisión registrada». Solo hablar de ahorro realizado si hay compras comparables comprobadas y una base de comparación explicada; nunca extrapolarlo a todo el mes.

## 10. Validación comercial antes de ampliar

Muestra propuesta cuando se consiga acceso: tres entrevistas con dueño/encargado y un piloto operativo. No representan al mercado; sirven para descartar supuestos pronto. **Hoy no hay restaurante disponible: esta validación va en paralelo si aparece contacto o después del concurso. No bloquea construir.**

Mientras tanto, preparar un restaurante ficticio inicialmente sin recetas, pocos insumos y diez documentos sintéticos coherentes: lista nueva, ofertas, comprobantes históricos opcionales, duplicado y presentaciones ambiguas. Añadir de una a tres recetas al probar la extensión. Los importes y rendimientos son datos de prueba, no evidencia del mercado. Separar el resultado calculado manualmente de lo que extrae la IA para detectar errores; generar casos difíciles deliberados. Incorporar una fuente pública real y correo entre buzones de prueba para validar las integraciones. Este conjunto verifica software, no fidelidad al trabajo cotidiano de un restaurante.

En la entrevista pedir hechos recientes: última compra que cambió de precio, cómo se enteraron, cómo decidieron, qué documentos quedaron y cuánto esfuerzo tomaría compartirlos. Observar una tarea real. Evitar «¿usarías una app con IA?».

Cuando haya contacto, empezar con dos ofertas comparables de un insumo y una compra por decidir. Si solo tiene un proveedor, preparar una solicitud de alternativa. Documentos históricos y recetas se incorporan después, si existen y aportan. Registrar tamaño real de la muestra sin exigir diez documentos para entrar. Para la extensión de platos, pedir confirmación de receta y rendimiento; no rellenar con un estándar gastronómico.

**Criterios de avance propuestos, no benchmarks de industria:**

| Pregunta | Umbral de decisión | Si falla |
| --- | --- | --- |
| ¿Se puede activar sin recetas? | Una comparación comprensible de un insumo, dos ofertas y cantidad requerida en hasta 15 minutos asistidos, sin receta ni compra histórica obligatoria | Identificar fricción de documentos/equivalencias antes de añadir funciones |
| ¿Capturar es tolerable? | Tras configurar equivalencias, mediana de hasta 2 minutos de trabajo del usuario por documento en los casos disponibles; medir también minutos del acompañante | Simplificar captura antes de sumar análisis; no ocultar trabajo del fundador |
| ¿El resultado es confiable? | Todos los cálculos confirmados coinciden con revisión manual; toda ambigüedad crítica del corpus bloquea confirmación | Bloquear piloto hasta corregir; no usar promedio de precisión para esconder un error material |
| ¿Sirve para actuar? | Un encargado valida un caso útil y vuelve con nuevos datos en dos ciclos de compra sin persecución diaria | Investigar frecuencia/valor; no justificarlo con satisfacción verbal |
| ¿Hay comprador? | Ofrecer continuidad concreta con alcance, precio y fecha; registrar aceptación o rechazo | No declarar SaaS validado ni invertir en ventas automatizadas |
| ¿Aporta la extensión de recetas? | Tras comparar compras, el encargado decide vincular al menos un plato y puede explicar una utilidad adicional | Mantener la entrada de compras; no forzar receta para considerar activo al cliente |

No esperar a una subida natural durante quince días: se puede reconstruir un caso histórico real y etiquetarlo cuando se disponga de él. Medir continuidad prospectiva aparte. Dos ciclos útiles son una señal inicial, no retención probada. Registrar documentos excluidos, motivo, correcciones y asistencia posterior; no seleccionar solo fotos limpias para afirmar precisión o facilidad.

**Monetización por validar:** no hay tarifa definida. Después de observar uso recurrente, evaluar una oferta por local y volumen acotado de documentos/solicitudes. No crear planes comerciales todavía. Registrar onboarding, soporte y costos antes de proponer un precio.

Costo de servir = APIs por documento + consultas web + correo + infraestructura asignada + minutos de soporte. Medir consumos reales y poner límites por restaurante/día, tamaño de archivo y páginas. No depender de créditos gratuitos para que el precio funcione. Sin datos no hay proyección de margen SaaS, ROI ni churn.

## 11. Demo y requisitos de hackatón

Reglas verificadas el 7/9/2026: app nueva desde el 25/8; backend Convex e integraciones de sponsors con trabajo real; integración Convex en el agente de desarrollo; registro Luma; repo público, `hackathon.md` raíz, URL `convex.site` o `chatgpt.site`, video menor de tres minutos, publicación social con etiquetas y entrega en VibeApps. Cierre: 22/9 a las 12:00 PT, 14:00 Lima. Equipo de hasta cuatro; confirmar elegibilidad de participantes. [S1–S2]

No hay pesos numéricos publicados: no inventar puntuaciones ni probabilidades de ganar. La utilidad, originalidad, profundidad de Convex, uso de sponsors, acceso al producto, video y actividad social son los frentes de evaluación.

**Presentación sin pricing del SaaS:** en las reglas oficiales revisadas no se encontró requisito de mostrar tarifas, implementar cobros o tener clientes pagos, ni prohibición explícita de mostrar tarifas. Decisión de producto para esta entrega: sin sección de planes, checkout ni pago para recorrer la demo. CTA «Probar ejemplo». Los precios de insumos y cotizaciones sí se muestran porque son el contenido central. Mantener colores, tipografía y calidad de interfaz; aplazar branding hasta la versión comercial, sin anunciar una oferta comercial no validada. Esta decisión no afirma que el producto será gratuito para siempre.

**Guion objetivo de 2:40:**

- 0:00–0:20: «Necesito comprar 10 kg de este insumo». Cero recetas cargadas; abrir una lista recibida.
- 0:20–0:50: revisar presentación/precio extraídos y mostrar costo por unidad y desembolso. Una referencia web real y fechada aporta contexto para consultar.
- 0:50–1:20: revisar y enviar solicitud por AgentMail; una respuesta del proveedor de prueba atraviesa la integración real y se incorpora a la comparación.
- 1:20–1:55: comparar dos ofertas; mostrar por qué precio por kilo, mínimo y flete llevan a decisiones distintas. Registrar elección sin simular compra efectuada. El producto ya entregó valor.
- 1:55–2:20: si la extensión está implementada, abrir «Impacto en platos» y vincular una receta de ejemplo confirmada; mostrar escenario por porción. Si no, demostrar una nueva lista que actualiza la comparación conservando equivalencias, con origen visible.
- 2:20–2:40: mostrar estado sincronizado y procedencia. Cierre con observación del piloto solo si existe evidencia y permiso para usarla.

No depender de que un proveedor real conteste durante la grabación. Identificar datos sintéticos, caso histórico y buzones de prueba. Enlace público debe permitir explorar ejemplo sin invitación: selección de documentos de prueba incluidos, no subida anónima de archivos personales. Las acciones reales tienen destinatarios restringidos en servidor y límites por sesión y globales. Carga libre de archivos solo para el equipo autenticado mientras no esté habilitado el piloto privado. Una reproducción guardada puede ser respaldo explícito, pero no sustituye demostrar las integraciones ejecutadas.

**Privacidad y concurso:** el código entregado será público. Revisar los archivos antes de cambiar la visibilidad del repositorio; excluir conversaciones, secretos y documentación privada de clientes. Usar datos sintéticos en repo y demo; conservar bases y documentos del restaurante en un entorno privado separado. La preparación actual mantiene el repositorio privado. Contactar proveedores, registrar cuentas y publicar la demo son acciones separadas del setup.

## 12. Calendario y orden de corte

Estimación a partir del 7/9 para una persona principal de desarrollo, sin depender de acceso a restaurante. No presupone dedicación confirmada de un equipo: son fechas objetivo, no garantía de horas disponibles. Si no hay tiempo suficiente, recortar antes de repartir más tareas.

| Fecha | Entregable | Criterio para continuar |
| --- | --- | --- |
| 7–8 sep | Caso sintético con resultado esperado, spike de fuente web y correo ida/vuelta | Fuente, comparabilidad y canal de prueba funcionan; si fallan, revisar dependencia |
| 9–10 sep | Insumos/proveedores, documento con revisión y comparación por cantidad; despliegue temprano | Dos ofertas comparables dan resultados correctos con cero recetas y cero compras previas |
| 11–12 sep | Fuente web, solicitud, dos respuestas y decisión en una sesión controlada | Primer flujo completo con los cuatro sponsors; sin esperar el diseño final |
| 13–14 sep | Captura móvil, aislamiento de sesiones públicas y restricciones de demo | Dos visitantes no interfieren; no se puede enviar a destinatarios arbitrarios |
| 15–16 sep | Pruebas y UX; extensión de una a tres recetas solo si flujo principal está estable. Piloto si aparece acceso | Compras ya funciona sin recetas; extensión verifica impacto sin cambiar ese recorrido |
| 17–18 sep | Correcciones críticas, límites, errores y demo pública aislada | Integraciones repetibles, datos protegidos y pruebas esenciales verdes |
| 19–20 sep | Video, README, build log, revisión del material público | Candidato de entrega cerrado; sin nuevas funciones |
| 21 sep | Revisión de URL/repo/links y entrega anticipada una vez autorizada | Confirmación de recepción en plataforma |
| 22 sep | Reserva para incidencias antes de las 14:00 Lima | Sin depender de este día para terminar el producto |

Si hay retraso, recortar: 1) porcentajes y semáforo; 2) preparaciones base; 3) extensión completa de recetas; 4) de varios insumos monitoreados a uno comparable; 5) historial visual extenso, conservando evidencia de la decisión actual. El ciclo de compras y los cuatro sponsors no dependen de recetas. Roles comerciales, exportación y recuperación del piloto se posponen mientras no se acepten datos privados. Nunca cortar procedencia, separación compra/oferta/mercado, revisión humana, aislamiento de demo ni integraciones que se afirman ejecutadas.

### Backlog mínimo ejecutable

| Orden | Unidad de trabajo | Se acepta cuando |
| --- | --- | --- |
| T1 | Conjunto sintético y reglas de compra | Resultado manual para ofertas, paquetes, excedente, flete y casos límite; cero recetas |
| T2 | Prueba de integraciones | Una lectura web válida y un correo ida/vuelta dejan evidencia con fecha e IDs |
| T3 | Insumos, proveedores, carga y revisión | Un documento puede corregirse, confirmarse y alimentar una comparación sin receta ni compra histórica |
| T4 | Comparación y registro de compra | Cantidad requerida produce desembolso; confirmar oferta no registra compra; documento viejo no revierte historial |
| T5 | Solicitud y comparativa | Dos ofertas responden a la misma necesidad; mínimos/flete y datos faltantes se muestran; elegir no compra |
| T6 | Demo pública | Sesión aislada, datos ficticios, envío restringido, errores visibles y recorrido completo accesible |
| T6b, opcional | Recetas e impacto por porción | Vincular receta aprovecha precios existentes; receta incompleta no bloquea compras; escenario no altera compra |
| T7 | Entrega | Pruebas esenciales pasan, video <3 minutos y todos los enlaces/requisitos están revisados |

No implementar todo el modelo de datos antes de T3; construir el flujo vertical y añadir las entidades conforme se usan. La habilitación del piloto privado es un hito posterior separado si no hay contacto durante este plazo.

## 13. Verificación proporcional y condición de piloto

Pruebas de negocio obligatorias: recorrido completo con cero recetas y sin compras previas; conversión caja→kg; empaque sin peso bloqueado; una oferta no inventa alternativa; precio por unidad sin cantidad requerida no inventa desembolso; documento antiguo fuera de orden; oferta que no registra compra; empaque cambiado que invalida equivalencia; base tributaria desconocida; mínimos y transporte que cambian la comparación. Si se implementan recetas: merma neto/bruto sin doble aplicación, receta por lote, precio faltante y receta incompleta que no bloquea compras.

Pruebas de integración/seguridad: evento duplicado no duplica documento; doble clic y timeout no duplican correo; webhook no válido rechazado; visitante de otra sesión no accede a datos ni archivos; documento con instrucciones maliciosas no controla herramientas; demo pública no permite correo arbitrario. Al habilitar piloto, probar aislamiento entre restaurantes y respecto a demo; si se añade rol colaborador, probar que no puede enviar.

Un E2E representativo con cero recetas cubre carga→confirmación→comparación→solicitud→respuesta→decisión. Si existe la extensión, una prueba adicional cubre vínculo de receta e impacto. Un smoke test real por proveedor externo acredita ejecución; mocks para fallos reproducibles. No repetir todas las reglas en tres niveles.

Antes de datos privados: autenticación y permisos comprobados, secretos fuera del cliente, archivos restringidos, exportación y borrado probados, recuperación de un conjunto de prueba y guía breve de soporte. Elegir mecanismo de auth soportado tras un spike; no introducir una versión alpha solo por aparecer en los recursos del concurso [S11].

«Listo para piloto acompañado» no significa «listo para cualquier restaurante en producción». Antes de venta general: varios ciclos de uso, costos de soporte/API medidos, condiciones de servicio y tratamiento de datos resueltos para la operación real, y procedimientos de recuperación y salida validados. No se afirma cumplimiento legal por tener este documento.

## 14. Decisiones y pendientes

Decidido para planificar: un local, español/PEN, entrada por insumos/proveedores con cero recetas, datos confirmados, móvil web, correo más captura manual de WhatsApp, una fuente web y decisiones humanas. Recetas como extensión progresiva de una a tres para el concurso si hay tiempo; sin contabilidad ni expansión global inmediata. No excluir clientes ni medir activación por tener recetas.

Pendiente técnico antes de cerrar alcance de concurso: fuente extraíble y comparable, correo ida/vuelta, cuentas/API y tiempo disponible de desarrollo. Pendiente comercial: contacto, corpus real, canal de proveedores y disposición a pagar. Pendiente antes de publicar: revisión del contenido concreto que se hará público. La ausencia actual de restaurante ya está contemplada y no impide construir la demo.

## Fuentes

Consultadas o identificadas el 7/9/2026. Fuentes comerciales describen oferta, no demuestran adopción, eficacia ni ausencia de competidores. Las capacidades documentadas no equivalen a integraciones probadas.

- [S1 · Convex All Gas, reglas y evaluación](https://www.convex.dev/hackathons/all-gas)
- [S2 · Luma, requisitos y equipo](https://luma.com/convex-allgas-hackathon)
- [S3 · MarketMan, plataforma y funciones](https://www.marketman.com/platform)
- [S4 · PUNKU, costeo para gastronomía](https://www.punku.net.pe/)
- [S5 · OpenAI, salidas estructuradas](https://developers.openai.com/api/docs/guides/structured-outputs)
- [S6 · Componente Firecrawl](https://www.convex.dev/components/firecrawl/firecrawl-convex)
- [S7 · Componente AgentMail](https://www.convex.dev/components/agentmail/convex)
- [S8 · Convex, funciones programadas](https://docs.convex.dev/scheduling/scheduled-functions)
- [S9 · AgentMail, evitar envíos duplicados](https://docs.agentmail.to/knowledge-base/preventing-duplicate-sends)
- [S10 · MIDAGRI, boletines diarios](https://www.gob.pe/institucion/midagri/informes-publicaciones/1211-boletin-de-precios-diarios-de-alimentos)
- [S11 · Convex, autenticación](https://docs.convex.dev/auth/overview)
- [S12 · Firecrawl, extracción de documentos](https://docs.firecrawl.dev/features/document-parsing)
- [S13 · Fudo, oferta de producto en Perú](https://fu.do/es-pe/precios/)
- [S14 · MarketMan, captura y procesamiento de facturas](https://www.marketman.com/platform/marketman-accounts-payable-automation)
