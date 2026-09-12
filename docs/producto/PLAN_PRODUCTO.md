# Inteligencia de mercado de insumos y proveedores para restaurantes

Plan de producto y hackatón · 7 de septiembre de 2026 · v1.2. La exploración de mercado es una entrada autónoma. Datos propios, intención de compra y recetas son enriquecimientos opcionales. Esta versión corrige la restricción a documentos y proveedores ya conocidos de v1.1. Ver [historial de revisión](./REVISION_ADVERSARIAL.md).

Este documento define el producto objetivo, no acredita funciones terminadas. El código existente y su evidencia se registran en [ETAPAS.md](../desarrollo/ETAPAS.md). Ya existen exploración sintética, estudios persistentes en Convex local y comparación manual; búsqueda web y proveedores reales aún no están conectados.

**Dirección activa · 12 de septiembre de 2026:** la experiencia predeterminada es en inglés y parte del ejemplo sintético `Rice` en `Portland, OR, US`, con USD y lb. El producto conserva los fixtures de Perú, PEN y unidades métricas como un segundo contexto compatible. Cada estudio pertenece a un solo contexto de ingrediente, zona, moneda y unidad; no se mezclan mercados. Este cambio de dirección sustituye el anterior valor predeterminado Perú/español, pero no convierte Surtario en un motor general multi-país ni habilita conversión de divisas, impuestos o proveedores en vivo. Ver [US_MARKET.md](../desarrollo/US_MARKET.md) para el contrato y sus límites de verificación.

## 1. La apuesta

**Ayudar a restaurantes a conocer el mercado de sus insumos: descubrir distribuidores, entender precios y condiciones y, cuando lo necesiten, contrastarlos con su operación o preparar una compra.**

Promesa: «Explora precios y proveedores de los insumos que usas o quieres incorporar. Compara fuentes, conserva alternativas y cotiza cuando lo necesites».

Tres entradas complementarias, ninguna exige las otras:

1. **Estudiar el mercado:** insumo o categoría y zona de interés. Descubrir precios publicados, distribuidores y contactos verificables. No exigir stock, documentos propios, cantidad ni intención de compra.
2. **Contrastar con mi operación:** incorporar opcionalmente insumos, cotizaciones o comprobantes por documento o carga manual. Sin un precio pagado comparable no se calcula diferencia frente a compras propias. Una lista de insumos no demuestra existencia actual de stock; no construir inventario perpetuo.
3. **Preparar una compra:** desde resultados seleccionados, confirmar equivalencia y añadir cantidad, entrega y condiciones para comparar desembolso y pedir cotización. Solo este paso requiere cantidad. Recetas quedan como una extensión posterior independiente.

El estudio ya entrega valor si permite reconocer alternativas relevantes y recuperar sus fuentes y contactos. Cotizar, decidir o comprar son continuaciones opcionales. El valor recurrente comercial a validar es conservar estudios, actualizar resultados, contrastar cambios y cerrar consultas sin repetir la investigación; no asumir que una búsqueda aislada justifica una suscripción.

| Perspectiva | Resultado buscado | Evidencia necesaria |
| --- | --- | --- |
| Negocio | Investigación útil en el mercado elegido, con proveedores relevantes, fuentes trazables y una razón para volver | Estudios reales comparados con el proceso actual; utilidad y vigencia de contactos; segundo uso y disposición a pagar. La demo de EE. UU. y la hipótesis de piloto en Perú se validan por separado |
| Hackatón | Exploración autónoma → comparación trazable → cotización y respuesta vinculadas, usando las integraciones de verdad | Convex persistente/reactivo, búsqueda y extracción web reales, OpenAI con revisión y AgentMail en buzones de prueba; demo reproducible |

Un prototipo con fixtures prueba interacción y reglas. No demuestra cobertura del mercado, búsquedas en vivo, adopción, ahorro o demanda. Aún no hay restaurante piloto; esto no bloquea desarrollar, pero sí afirmar preparación comercial.

## 2. Cliente inicial y expansión

**Hipótesis comercial anterior, aún por validar:** restaurante independiente de un local en Lima, compras frecuentes y una persona responsable que investiga insumos y proveedores y puede confirmar equivalencias cuando prepara una compra. Puede trabajar con papel, Excel, fotos y WhatsApp; no necesita POS ni recetas documentadas. Una carta repetible es requisito solo para habilitar la etapa de costeo por plato. La experiencia predeterminada de producto ahora usa el escenario de EE. UU.; eso no acredita un cliente inicial en ninguno de los dos mercados.

El dueño o administrador paga; el encargado de compras usa la herramienta. El chef interviene si se habilitan recetas o si una equivalencia exige validar calidad/rendimiento. En algunos restaurantes será la misma persona.

Priorizar acceso real sobre una cocina elegida por estética. Una cocina criolla con platos repetibles puede servir; una cevichería exige controlar especie, presentación y rendimiento del pescado. No elegir pescado como primera categoría de equivalencias automáticas.

Explorar sin documentos ni precios propios sí encaja. Quedan fuera inicialmente grandes cadenas que requieren integrar su ERP desde el primer día y servicios de inventario o compra automática. No tener porciones estandarizadas impide costear platos, pero no impide comparar insumos equivalentes.

**Dirección de entrega actual:** interfaz móvil en inglés, USD y unidades de masa de EE. UU. para el ejemplo predeterminado. Los fixtures de Perú siguen disponibles en español, PEN y unidades métricas para preservar ese recorrido y su evidencia. Moneda, zona, unidad y procedencia son datos explícitos; una comparación no cruza esos contextos.

**Límite del alcance:** soportar dos recorridos conocidos dentro del mismo producto no implica traducciones completas, cobertura de países, conversión de divisas, motores tributarios, facturación SUNAT ni un marketplace. Cada oferta conserva sus impuestos, flete, disponibilidad y cobertura como datos confirmados o pendientes; nunca se infieren a partir del idioma o la ubicación.

## 3. Diferenciación que todavía hay que demostrar

El costeo de recetas, lectura de facturas y alertas de precios ya existen. MarketMan anuncia esas funciones [S3, S14]; Fudo ofrece en Perú recetas, costos, compras y control de mermas [S13]. PUNKU se enfoca en pastelería y es una referencia adyacente [S4]. No usar «primero en Perú» ni «sin competencia».

Hipótesis de entrada: resolver un caso pequeño sin migrar la operación, conservar una investigación trazable de precios y proveedores y enriquecerla con documentos o compras cuando existan. La comparación comercial debe incluir el Excel actual del encargado, además de otros SaaS.

Frente a un chat generalista, demostrar en el mismo caso: equivalencias de presentaciones conservadas, fuente de cada cifra, revisión de ambigüedades, recepción posterior de una cotización vinculada a la misma compra y comparación actualizada sin repetir toda la carga. Con recetas, añadir propagación del costo a platos relacionados. Si el usuario resuelve igual de fácil su trabajo con un chat y una hoja, la diferencia no está probada. Probar esa comparación con los mismos documentos; no asumir que otros productos exigen migrar toda la operación sin verificar su onboarding.

## 4. Datos: tres precios que nunca se mezclan

| Tipo | Qué significa | Qué permite |
| --- | --- | --- |
| Compra confirmada | Precio documentado de una compra del restaurante | Base de costo estimado usando la última compra válida de cada insumo |
| Oferta del proveedor | Precio condicionado a presentación, cantidad, vigencia y entrega | Escenario de próxima compra; confirmar extracción no la convierte en compra |
| Referencia de mercado | Observación pública de un producto, mercado y fecha | Tendencia o motivo para consultar; no prueba sobreprecio ni disponibilidad |

Mostrar siempre qué base se usa. «Costo estimado con últimas compras» no equivale al costo contable de lo consumido: no tenemos lotes ni inventario. Una factura antigua cargada hoy no reemplaza una compra más reciente. Guardar fecha del hecho y fecha de carga por separado.

**Requisitos por resultado:** explorar distribuidores y contactos no requiere precio ni cantidad; dos precios de catálogo equivalentes permiten contrastar precio publicado por unidad, sin presentarlo como cotización confirmada; dos ofertas comparables permiten contrastar precios por unidad; añadir cantidad requerida permite calcular desembolso y excedente. Una sola oferta permite preparar la compra y solicitar alternativas, pero no afirmar qué proveedor conviene más. Una compra histórica comparable habilita «subió frente a tu última compra». Ninguna de estas salidas necesita receta. Un boletín o índice de mercado es contexto, no un proveedor. Un catálogo atribuible a un distribuidor puede aportar una observación de precio, pero no confirma stock, flete ni vigencia de una cotización.

El usuario puede confirmar una compra inicialmente desde un registro manual, con fecha, proveedor y procedencia marcada; una lista o cotización nunca pasa sola a compra. «Confirmar datos» valida la extracción; «Registrar compra realizada» es un acto distinto y explícito. Si faltan datos, mostrar «pendiente» o «costo parcial»; un ingrediente desconocido nunca cuesta cero.

Para cada precio: ingrediente y especificación, proveedor o mercado, cantidad del empaque, unidad, importe y moneda, fecha, impuestos incluidos/excluidos/desconocidos, entrega, origen y línea o página de respaldo. No convertir atados/cajas/unidades a kilos sin peso confirmado. No convertir volumen a masa sin equivalencia específica validada.

Guardar el vínculo aprobado «artículo del proveedor → ingrediente → presentación». Un cambio de empaque, descripción material o condición abre revisión de nuevo. «Limón» no basta para inferir calidad equivalente; tampoco «pescado» para inferir especie.

### Cálculo mínimo de compra y extensión a recetas

La aritmética corre en funciones deterministas, no en texto generado por IA. Las cantidades se normalizan dentro de dimensiones compatibles: kg, g, lb y oz para masa; L y ml para volumen; `unit` para conteo. Las conversiones de masa usan constantes exactas y los importes conservan precisión interna, con redondeo solo al presentar totales.

En la entrada sin recetas: precio por unidad comprada = importe de mercancía / contenido total confirmado. Para cantidad necesaria `Q` y empaque de contenido `E`: paquetes = redondear hacia arriba `Q/E`, aumentando hasta cumplir el mínimo y múltiplo de compra declarado por el proveedor; excedente = paquetes × `E` − `Q`; desembolso = importe de esos paquetes + cargos de pedido conocidos. Si existe un mínimo monetario u otra condición que no podemos resolver, marcar oferta pendiente en vez de suponer que aplica. El ejemplo completo está en la sección 9. Comparar producto con la misma especificación no requiere estimar merma culinaria. Si las presentaciones difieren en rendimiento útil, no declarar equivalencia sin validarlo.

Para cantidad neta `q` y rendimiento técnico `y` entre 0 y 1: cantidad comprada necesaria = `q / y`. Costo de ingrediente = cantidad comprada × precio comparable por unidad. Si la receta registra peso bruto, no aplicar merma otra vez. Rendimiento de limpieza y rendimiento de un lote son conceptos separados; nunca duplicarlos.

Ejemplo sintético, con todos los precios sobre la misma base tributaria: un plato necesita 0.18 kg netos de un insumo, rendimiento 75%, precio de compra S/20/kg. Necesita 0.24 kg brutos: costo S/4.80. Con S/25/kg el costo pasa a S/6.00: sube S/1.20. Si los demás ingredientes cuestan S/5.20, el plato pasa de S/10.00 a S/11.20. Con precio de venta comparable de S/30, el porcentaje disponible después de ingredientes pasa de 66.67% a 62.67%, una caída de 4 puntos porcentuales. No es utilidad neta.

Primera pantalla: búsqueda por insumo/categoría y zona, precios de catálogo y distribuidores con fuentes/contactos, sin exigir cantidad. Al continuar opcionalmente a compra: ofertas por proveedor, precio por unidad, presentación, desembolso para la cantidad requerida y condiciones pendientes. El cambio frente a una compra previa aparece solo si existe esa compra comparable. En la etapa opcional de recetas, mostrar costo por porción y cambio en soles. El indicador porcentual se llama «margen estimado sobre ingredientes», explica lo que excluye y solo aparece si venta y compra tienen una base consistente. No hacer conversiones tributarias automáticas ni fijar una tasa para todos los restaurantes. Si la base es desconocida, pedir confirmación y no presentar un porcentaje engañoso.

Sin unidades vendidas no hay impacto mensual ni ranking de pérdida total. Sin mano de obra, desperdicio real y demás gastos no hay rentabilidad del negocio. Un escenario por cantidad planificada no se etiqueta como ahorro realizado.

## 5. Recorrido del usuario

1. **Explorar:** buscar un insumo o categoría y zona. Las categorías amplias permiten descubrir distribuidores; los precios solo se comparan después de concretar producto/especificación.
2. **Entender resultados:** separar precio de catálogo, distribuidor sin precio y referencia general. Cada resultado conserva origen, fecha de observación, especificación, ubicación/área declarada y dato de contacto cuando esté respaldado por la fuente. Ubicación de un negocio no confirma entrega al restaurante.
3. **Revisar y conservar un estudio:** seleccionar opciones y consultar diferencias sin exigir cantidad. Un precio sin contenido de empaque no se convierte a kg. Contacto sin precio sigue siendo resultado útil; no se omite ni se le asigna cero. No inventar un rango de mercado con una muestra pequeña o heterogénea.
4. **Añadir contexto propio, opcional:** cargar lista, cotización o comprobante; revisar extracción y equivalencia antes de contrastarlo. Captura manual es alternativa, no el CTA principal.
5. **Continuar a compra, opcional:** confirmar equivalencias, añadir cantidad y condiciones y revisar desembolso. Catálogos mantienen los datos no confirmados pendientes; no se convierten solos en ofertas vigentes.
6. **Consultar y recibir cotización, opcional:** elegir un distribuidor descubierto o conocido, revisar destinatario y mensaje, enviar por canal autorizado o copiar para WhatsApp. La respuesta se vincula al estudio y a la solicitud correspondiente, se revisa y puede alimentar la comparación.
7. **Decisión y seguimiento:** registrar continuar investigando, pedir aclaración o elegir una oferta. Comprar y registrar una compra realizada son actos separados. Historial propio y recetas se añaden solo si existen datos confirmados.

Entrada principal: **Explorar mercado**. Vistas de continuidad: **Mis estudios** y **Preparar compra**. Ni una receta vacía ni la falta de stock/historial producen un bloqueo de exploración.

### WhatsApp y correo

El dueño puede copiar texto o cargar una foto/documento que recibió por WhatsApp. Para pedir cotización allí, el producto prepara un texto que el dueño copia y envía; después carga la respuesta. Eso es un paso manual explícito, no una integración de WhatsApp ni acceso a sus chats.

AgentMail es un canal adicional real para proveedores que sí usan correo. Un correo reenviado por el encargado debe conservar proveedor original y procedencia, sin confundir al remitente del reenvío con el vendedor. No obligar a cambiar de canal para comparar compras.

Si ningún proveedor del piloto responde por correo, el piloto comercial puede seguir por carga manual; el caso de AgentMail para la hackatón se demuestra con buzones de prueba identificados. No presentarlo como adopción real de proveedores.

## 6. Alcance cerrado

| Construir para la hackatón | Para habilitar un piloto con datos privados | Fuera de esta versión |
| --- | --- | --- |
| Estudio de mercado autónomo; comparación con datos propios y compra opcionales; recetas después del núcleo | Ofertas propias y condiciones confirmadas; recetas solo para activar impacto por plato | Inventario perpetuo, FIFO, contabilidad y POS |
| Foto/PDF/texto → extracción → revisión → precio | Carga privada con aislamiento por restaurante | WhatsApp Business integrado y lectura de chats |
| Diferencias por unidad y desembolso con evidencia; por porción solo con receta | Un administrador autenticado para el primer piloto; colaborador opcional, sin permiso de envío | Compras, pagos o cambios de carta automáticos |
| Búsqueda acotada de fuentes de distribuidores y precios; una categoría y zona demostrables | Fechas, cobertura y fuente desactualizada visibles | Todos los mercados, todas las especies y todos los países |
| Una solicitud, dos ofertas y comparación | Proveedores descubiertos revisados por el restaurante | Marketplace transaccional, envíos masivos o scraping indiscriminado de contactos |
| Registro de decisión y escenario de compra | Exportación básica de datos, retirada de documentos y recuperación verificada | Predicción de demanda, ventas inferidas, chat abierto y consejos culinarios libres |
| Demo pública con datos sintéticos y correo restringido | Soporte del piloto y límites de uso definidos | Audio, app nativa, suscripción autoservicio y multi-local |

La segunda columna es un requisito para aceptar datos privados, no una obligación de completar antes del concurso si seguimos sin piloto. Para la demo basta una sesión aislada por visitante y administración del equipo, con autorización en servidor; no construir invitaciones y roles comerciales todavía. Aislar sesiones y restringir correo sí es parte del mínimo público. El modelo conserva `restaurantId` para no rehacer los límites al incorporar un cliente.

La exploración de mercado tiene acceso directo. Mis estudios conserva resultados y fuentes; Preparar compra reutiliza la comparación existente. Captura de documentos y recetas son extensiones opcionales, no requisitos de onboarding.

Semáforo opcional subordinado a cifras: umbrales configurados por restaurante, intervalos completos y estado gris para datos insuficientes. No usar el 20/80 ni un margen universal como ley del negocio.

## 7. Integraciones y arquitectura proporcional

Propuesta de implementación: React + TypeScript + Vite; Convex para datos, almacenamiento, queries, mutations y trabajo programado. Hosting `convex.site` mediante el componente oficial. Confirmar versiones y SDK al comenzar; este plan no certifica instalaciones ni credenciales.

| Componente | Trabajo y límite | Prueba del primer corte |
| --- | --- | --- |
| OpenAI | Extraer campos y evidencia a un esquema; describir cambios ya calculados. No inventar pesos, recetas ni resultados numéricos | Documento claro y documento ambiguo: el segundo pide el dato faltante |
| Firecrawl | Buscar y extraer fuentes públicas de distribuidores, productos, precios y contactos; conservar evidencia | Una búsqueda acotada obtiene resultados relevantes con y sin precio; origen y fecha verificables; falla/vacío sin inventar resultados |
| AgentMail | Un buzón de prueba para demo; uno por restaurante al habilitar piloto. Entrada de adjuntos y salida de solicitudes aprobadas | Enviar a buzón de prueba y recibir respuesta vinculada a la solicitud |
| Convex | Persistir estudios, fuentes y solicitudes; incorporar respuestas y sincronizar vistas autorizadas | Dos vistas autorizadas del mismo restaurante o sesión ven la nueva oferta; visitantes independientes no comparten datos |

Structured Outputs ayuda a fijar el formato, no garantiza que una extracción sea verdadera [S5]. Elegir el modelo que cumpla el pequeño corpus de documentos con costo/latencia medidos; no fijar por prestigio un modelo ni generar cada fila repetidamente.

Los componentes Firecrawl y AgentMail figuran en el catálogo oficial [S6–S7]. Probarlos temprano. Si no exponen una capacidad necesaria, usar el SDK desde una action; documentar el uso real de Convex, sin encajar componentes extra para decorar.

**Modelo progresivo:** estudios y resultados de mercado con fuentes; contexto propio y compras después: restaurantes/miembros; ingredientes y presentaciones aprobadas; documentos; observaciones de precio; solicitudes y ofertas; decisiones; trabajos de integración. **Extensión:** recetas y versiones, relacionadas con ingredientes ya existentes. Ninguna entidad de compra exige un `recipeId`. Incluir `restaurantId` en datos privados y resolver membresía en servidor. Catálogo público separado de equivalencias privadas; no compartir recetas ni precios negociados entre restaurantes.

Una preparación base puede tener ingredientes y rendimiento por lote; limitar a un nivel de uso dentro de un plato y bloquear ciclos. Es opcional para el concurso si podemos expresar el caso con ingredientes directos; se añade cuando una receta real lo necesite. Las recetas publicadas se versionan para explicar los costos anteriores. Guardar los IDs de versión y observaciones usados en cada comparación: cambiar el precio actual no reescribe una decisión anterior. Evitar un constructor universal de fórmulas.

**Flujo técnico:** mutation registra intención → action llama al proveedor → mutation guarda resultado validado → queries actualizan la interfaz. Llamadas externas no son transacciones de base de datos; el scheduler no convierte un correo en un efecto exactamente una vez [S8]. Una oferta validada actualiza la comparación de compra aunque no haya recetas. Al confirmar una compra válida, actualizar historial del insumo y, si existen recetas vinculadas, recalcularlas de forma consistente. Las ofertas alimentan escenarios independientes. No hace falta procesar una carta global ni diseñar colas distribuidas propias.

Documentos: `recibido → extrayendo → por_revisar → confirmado` o `error`. Solicitudes: `borrador → envío_pendiente → enviado → con_respuestas → cerrado`; `envío_incierto` requiere comprobar estado antes de reintentar. Un fallo no borra el documento ni el borrador.

Conservar IDs de evento/mensaje/documento y clave de envío estable. Deduplificar entrada, usar idempotencia de envío soportada por AgentMail [S9] y verificar soporte en SDK/componente. No reintentar ciegamente después de un timeout. Firmas de webhooks verificadas antes de procesar; el buzón resuelve el restaurante en servidor. En demo, el buzón compartido vincula cada respuesta a la solicitud y sesión originales mediante IDs persistidos, nunca por un `restaurantId` declarado en el correo. Respuestas sin correspondencia quedan pendientes de revisión, sin modificar escenarios.

Correo, PDF y web son datos no confiables: sus instrucciones no pueden modificar destinatarios, revelar recetas, ejecutar herramientas ni activar una compra. La IA de extracción no tiene permisos de envío. Secretos solo en servidor; archivos privados no expuestos por enlaces públicos permanentes.

## 8. Descubrimiento, fuentes y límites de cobertura

La búsqueda descubre páginas públicas de distribuidores y catálogos pertinentes a un insumo/categoría y zona. Empezar con una categoría estrecha (por ejemplo, abarrotes secos) y Lima; limitar búsquedas, páginas y resultados por estudio. No prometer rastrear todo Perú ni disponer de precios en tiempo real.

Resultados distintos:

- **Precio de catálogo:** producto, marca/calidad explícita, presentación, importe/moneda, condiciones, fuente y fecha de observación. Precio publicado no confirma stock, entrega ni cotización vigente. Desconocidos quedan pendientes.
- **Distribuidor sin precio:** identidad comercial, productos declarados, ubicación/cobertura declarada y contactos comerciales que consten en la fuente. No inferir correo por dominio ni fabricar teléfonos. Una coincidencia de búsqueda no es una recomendación validada.
- **Referencia de mercado:** boletines como MIDAGRI, índices u otra referencia general, con mercado/variedad/unidad y fecha propios. Nunca convertirla en un proveedor comprable ni promediarla con cotizaciones sin equivalencia.

La IA propone estructura y correspondencias; la revisión humana confirma equivalencia. Evidencia verificable de cada dato importante: URL y fragmento/página, fecha de fuente si aparece y fecha de extracción. Extraer dos fechas solo si existen; no fabricar una serie histórica a partir de una lectura.

Prueba temprana: consulta acotada que devuelva al menos un precio atribuible y un distribuidor sin precio con contacto respaldado, midiendo relevancia y extracción por separado. Si fallan fuentes, probar otro catálogo pertinente; nunca sustituir una búsqueda real por fixtures sin avisar. Una falla debe conservar resultados anteriores con fecha o mostrar que no se obtuvieron resultados.

APIs aplazadas durante la construcción actual: se puede construir el recorrido con fixtures explícitos, pero el hito técnico de búsqueda sigue pendiente. Sin conexión real no se afirma uso del sponsor ni cierre de la demo del concurso.

## 9. Comparación de compras sin ahorro ficticio

La solicitud contiene **un solo ingrediente y una especificación**, cantidad requerida, unidad, lugar y fecha de entrega. Puede originarse en un estudio de mercado, un proveedor conocido o una oferta cargada. Confirmar la equivalencia y condiciones de distribuidores descubiertos antes de comparar. En fixtures, proveedores ficticios identificados. No construir compras con múltiples artículos ni asignación de gastos compartidos en este corte.

Para cada oferta calcular paquetes enteros necesarios, cantidad sobrante, importe de mercancía y total con entrega e impuestos conocidos. Mostrar desembolso y precio por unidad comprada. Costo por unidad útil solo si existe rendimiento confirmado; no exigirlo para comparar productos de la misma especificación. Un saco más barato por kilo puede costar más dinero y dejar excedente perecible.

**Regla cerrada del MVP:** el escenario de receta usa el precio del ingrediente por unidad bruta comprada y el rendimiento confirmado; excluye flete y lo declara. La comparativa de pedido muestra el flete por separado y el desembolso completo. No repartir flete ni descuentos generales entre recetas. Un descuento explícito del único artículo sí ajusta su importe. Si existe un cargo no clasificable, marcar comparación incompleta. El excedente se muestra como cantidad pendiente de uso; no se da por perdido, vendido ni ahorrado.

Caso de aceptación sintético: necesidad 10 kg; A ofrece saco de 18 kg a S/80 más S/15 de entrega; B ofrece 10 kg a S/5/kg con entrega incluida. A es S/4.44/kg de ingrediente, pero exige desembolsar S/95 y deja 8 kg; B exige S/50 sin excedente. El sistema no declara A ganador por kilo ni imputa S/95 como costo de consumir solo 10 kg. El encargado decide según uso previsto del excedente.

La calidad, plazo, crédito y mínimo de compra pueden invalidar la comparación. En el MVP se confirman manualmente. No recomendar sustitución de especie o ingrediente; tampoco cambiar receta, alérgenos, porciones o precio al cliente sin intervención del chef/encargado.

Nombres de resultados: «diferencia entre ofertas para esta compra», «impacto estimado por porción» y «decisión registrada». Solo hablar de ahorro realizado si hay compras comparables comprobadas y una base de comparación explicada; nunca extrapolarlo a todo el mes.

## 10. Validación comercial antes de ampliar

Muestra propuesta cuando se consiga acceso: tres entrevistas con dueño/encargado y un piloto operativo. No representan al mercado; sirven para descartar supuestos pronto. **Hoy no hay restaurante disponible: esta validación va en paralelo si aparece contacto o después del concurso. No bloquea construir.**

Mientras tanto, preparar un restaurante ficticio inicialmente sin recetas, pocos insumos y diez documentos sintéticos coherentes: lista nueva, ofertas, comprobantes históricos opcionales, duplicado y presentaciones ambiguas. Añadir de una a tres recetas al probar la extensión. Los importes y rendimientos son datos de prueba, no evidencia del mercado. Separar el resultado calculado manualmente de lo que extrae la IA para detectar errores; generar casos difíciles deliberados. Incorporar una fuente pública real y correo entre buzones de prueba para validar las integraciones. Este conjunto verifica software, no fidelidad al trabajo cotidiano de un restaurante.

En la entrevista pedir hechos recientes: última compra que cambió de precio, cómo se enteraron, cómo decidieron, qué documentos quedaron y cuánto esfuerzo tomaría compartirlos. Observar una tarea real. Evitar «¿usarías una app con IA?».

Cuando haya contacto, empezar con una pregunta de mercado real: qué insumo investigar, en qué zona y qué alternativa o información le falta. Revisar fuentes, precios y contactos pertinentes sin exigir documentos, cantidad ni compra. Si quiere preparar una compra, continuar con dos ofertas comparables; si solo tiene un proveedor, preparar una solicitud de alternativa. Documentos históricos y recetas se incorporan después, si existen y aportan. Registrar tamaño real de la muestra sin exigir diez documentos para entrar. Para la extensión de platos, pedir confirmación de receta y rendimiento; no rellenar con un estándar gastronómico.

**Criterios de avance propuestos, no benchmarks de industria:**

| Pregunta | Umbral de decisión | Si falla |
| --- | --- | --- |
| ¿Se puede activar con una investigación? | En hasta 15 minutos asistidos, encuentra y conserva alternativas pertinentes con fuente o contacto verificable, sin documentos ni cantidad; explica qué información le resulta útil | Revisar cobertura y pertinencia antes de añadir funciones |
| ¿Capturar contexto opcional es tolerable? | Tras configurar equivalencias, mediana de hasta 2 minutos de trabajo del usuario por documento en los casos disponibles; medir también minutos del acompañante | Simplificar captura antes de sumar análisis; no ocultar trabajo del fundador |
| ¿El resultado es confiable? | Todos los cálculos confirmados coinciden con revisión manual; toda ambigüedad crítica del corpus bloquea confirmación | Bloquear piloto hasta corregir; no usar promedio de precisión para esconder un error material |
| ¿Sirve para actuar? | Un encargado recupera un estudio útil y vuelve a investigar o actualizar alternativas por iniciativa propia; medir por separado si continúa a una compra | Investigar frecuencia/valor; no justificarlo con satisfacción verbal |
| ¿Hay comprador? | Ofrecer continuidad concreta con alcance, precio y fecha; registrar aceptación o rechazo | No declarar SaaS validado ni invertir en ventas automatizadas |
| ¿Aporta la extensión de recetas? | Tras comparar compras, el encargado decide vincular al menos un plato y puede explicar una utilidad adicional | Mantener la entrada de compras; no forzar receta para considerar activo al cliente |

No esperar a una subida natural durante quince días: se puede reconstruir un caso histórico real y etiquetarlo cuando se disponga de él. Medir continuidad prospectiva aparte. Un segundo uso útil es una señal inicial, no retención probada. Registrar documentos excluidos, motivo, correcciones y asistencia posterior; no seleccionar solo fotos limpias para afirmar precisión o facilidad.

**Monetización por validar:** no hay tarifa definida. Después de observar uso recurrente, evaluar una oferta por local y volumen acotado de documentos/solicitudes. No crear planes comerciales todavía. Registrar onboarding, soporte y costos antes de proponer un precio.

Costo de servir = APIs por documento + consultas web + correo + infraestructura asignada + minutos de soporte. Medir consumos reales y poner límites por restaurante/día, tamaño de archivo y páginas. No depender de créditos gratuitos para que el precio funcione. Sin datos no hay proyección de margen SaaS, ROI ni churn.

## 11. Demo y requisitos de hackatón

Reglas verificadas el 7/9/2026: app nueva desde el 25/8; backend Convex e integraciones de sponsors con trabajo real; integración Convex en el agente de desarrollo; registro Luma; repo público, `hackathon.md` raíz, URL `convex.site` o `chatgpt.site`, video menor de tres minutos, publicación social con etiquetas y entrega en VibeApps. Cierre: 22/9 a las 12:00 PT, 14:00 Lima. Equipo de hasta cuatro; confirmar elegibilidad de participantes. [S1–S2]

No hay pesos numéricos publicados: no inventar puntuaciones ni probabilidades de ganar. La utilidad, originalidad, profundidad de Convex, uso de sponsors, acceso al producto, video y actividad social son los frentes de evaluación.

**Presentación sin pricing del SaaS:** en las reglas oficiales revisadas no se encontró requisito de mostrar tarifas, implementar cobros o tener clientes pagos, ni prohibición explícita de mostrar tarifas. Decisión de producto para esta entrega: sin sección de planes, checkout ni pago para recorrer la demo. CTA «Probar ejemplo». Los precios de insumos y cotizaciones sí se muestran porque son el contenido central. Mantener colores, tipografía y calidad de interfaz. El 10 de septiembre de 2026 el usuario amplió el alcance para incluir identidad y activos; después de la investigación preliminar eligió Surtario, documentado en `docs/diseno/MARCA.md`; esto no anuncia una oferta comercial validada. Esta decisión no afirma que el producto será gratuito para siempre.

**Guion objetivo de 2:40:**

- 0:00–0:20: «Quiero conocer el mercado de este insumo en Lima». Explorar sin cantidad, inventario ni documentos propios.
- 0:20–0:50: mostrar búsqueda/extracción real con precios publicados y un distribuidor sin precio pero con contacto verificable. Revisar fuente y presentación; el estudio ya tiene valor sin comprar.
- 0:50–1:20: continuar opcionalmente a cotizar: elegir destinatario de prueba, revisar y enviar solicitud por AgentMail; una respuesta del proveedor de prueba atraviesa la integración real y se incorpora a la comparación.
- 1:20–1:55: añadir cantidad y comparar dos ofertas revisadas; mostrar por qué precio por kilo, mínimo y flete llevan a decisiones distintas. Registrar elección sin simular compra efectuada. El producto ya entregó valor.
- 1:55–2:20: si la extensión está implementada, abrir «Impacto en platos» y vincular una receta de ejemplo confirmada; mostrar escenario por porción. Si no, demostrar una nueva lista que actualiza la comparación conservando equivalencias, con origen visible.
- 2:20–2:40: mostrar estado sincronizado y procedencia. Cierre con observación del piloto solo si existe evidencia y permiso para usarla.

No depender de que un proveedor real conteste durante la grabación. Identificar datos sintéticos, caso histórico y buzones de prueba. Enlace público debe permitir explorar ejemplo sin invitación: selección de documentos de prueba incluidos, no subida anónima de archivos personales. Las acciones reales tienen destinatarios restringidos en servidor y límites por sesión y globales. Carga libre de archivos solo para el equipo autenticado mientras no esté habilitado el piloto privado. Una reproducción guardada puede ser respaldo explícito, pero no sustituye demostrar las integraciones ejecutadas.

**Privacidad y concurso:** el código entregado será público. Revisar los archivos antes de cambiar la visibilidad del repositorio; excluir conversaciones, secretos y documentación privada de clientes. Usar datos sintéticos en repo y demo; conservar bases y documentos del restaurante en un entorno privado separado. La preparación actual mantiene el repositorio privado. Contactar proveedores, registrar cuentas y publicar la demo son acciones separadas del setup.

## 12. Calendario y orden de corte

Estimación a partir del 7/9 para una persona principal de desarrollo, sin depender de acceso a restaurante. No presupone dedicación confirmada de un equipo: son fechas objetivo, no garantía de horas disponibles. Si no hay tiempo suficiente, recortar antes de repartir más tareas.

| Fecha | Entregable | Criterio para continuar |
| --- | --- | --- |
| 7–8 sep | Caso calculable y exploración autónoma con ejemplos identificados | Investigar sin cantidad/documentos; conservar desconocidos al pasar a compra |
| 9–10 sep | Persistencia de estudios y sesiones aisladas; conectar APIs cuando se configuren | Recuperar estudio sin mezclar sesiones; documentar por separado cada integración real |
| 11–12 sep | Fuente web, solicitud, dos respuestas y decisión en una sesión controlada | Primer flujo completo con los cuatro sponsors; sin esperar el diseño final |
| 13–14 sep | Captura móvil, aislamiento de sesiones públicas y restricciones de demo | Dos visitantes no interfieren; no se puede enviar a destinatarios arbitrarios |
| 15–16 sep | Pruebas y UX; extensión de una a tres recetas solo si flujo principal está estable. Piloto si aparece acceso | Compras ya funciona sin recetas; extensión verifica impacto sin cambiar ese recorrido |
| 17–18 sep | Correcciones críticas, límites, errores y demo pública aislada | Integraciones repetibles, datos protegidos y pruebas esenciales verdes |
| 19–20 sep | Video, README, build log, revisión del material público | Candidato de entrega cerrado; sin nuevas funciones |
| 21 sep | Revisión de URL/repo/links y entrega anticipada una vez autorizada | Confirmación de recepción en plataforma |
| 22 sep | Reserva para incidencias antes de las 14:00 Lima | Sin depender de este día para terminar el producto |

Las APIs están aplazadas por decisión del usuario. Orden vigente: exploración con ejemplos → persistencia y sesiones → integraciones reales → recorrido público. Las fechas no presuponen que ya hay claves disponibles; el concurso seguirá incompleto sin pruebas de sponsors.

Si hay retraso, recortar: 1) porcentajes y semáforo; 2) preparaciones base; 3) extensión completa de recetas; 4) de varios insumos monitoreados a uno comparable; 5) historial visual extenso, conservando evidencia de la decisión actual. El ciclo de compras y los cuatro sponsors no dependen de recetas. Roles comerciales, exportación y recuperación del piloto se posponen mientras no se acepten datos privados. Nunca cortar procedencia, separación compra/oferta/mercado, revisión humana, aislamiento de demo ni integraciones que se afirman ejecutadas.

### Backlog mínimo ejecutable

| Orden | Unidad de trabajo | Se acepta cuando |
| --- | --- | --- |
| T1 | Conjunto sintético y reglas de compra | Resultado manual para ofertas, paquetes, excedente, flete y casos límite; cero recetas |
| T3 | Explorar mercado y conservar estudio | Precios y distribuidores con contacto sin precio, fuentes trazables; cero documentos propios y sin cantidad requerida |
| T2, tras persistencia | Prueba de integraciones | Una lectura web válida y un correo ida/vuelta dejan evidencia con fecha e IDs |
| T3b | Contexto propio opcional | Documento revisado enriquece estudio sin bloquear exploración |
| T4 | Comparación y registro de compra | Cantidad requerida produce desembolso; confirmar oferta no registra compra; documento viejo no revierte historial |
| T5 | Solicitud y comparativa | Dos ofertas responden a la misma necesidad; mínimos/flete y datos faltantes se muestran; elegir no compra |
| T6 | Demo pública | Sesión aislada, datos ficticios, envío restringido, errores visibles y recorrido completo accesible |
| T6b, opcional | Recetas e impacto por porción | Vincular receta aprovecha precios existentes; receta incompleta no bloquea compras; escenario no altera compra |
| T7 | Entrega | Pruebas esenciales pasan, video <3 minutos y todos los enlaces/requisitos están revisados |

No implementar todo el modelo de datos antes de T3; construir el flujo vertical y añadir las entidades conforme se usan. La habilitación del piloto privado es un hito posterior separado si no hay contacto durante este plazo.

## 13. Verificación proporcional y condición de piloto

Pruebas de negocio obligatorias: estudio de mercado sin documentos propios, cantidad ni intención de compra; distribuidor sin precio conserva contacto/fuente sin precio cero; categoría amplia no mezcla precios incompatibles; catálogo nunca inventa entrega ni se convierte solo en cotización; recorrido completo con cero recetas y sin compras previas; conversión caja→kg; empaque sin peso bloqueado; una oferta no inventa alternativa; precio por unidad sin cantidad requerida no inventa desembolso; documento antiguo fuera de orden; oferta que no registra compra; empaque cambiado que invalida equivalencia; base tributaria desconocida; mínimos y transporte que cambian la comparación. Si se implementan recetas: merma neto/bruto sin doble aplicación, receta por lote, precio faltante y receta incompleta que no bloquea compras.

Pruebas de integración/seguridad: evento duplicado no duplica documento; doble clic y timeout no duplican correo; webhook no válido rechazado; visitante de otra sesión no accede a datos ni archivos; documento con instrucciones maliciosas no controla herramientas; demo pública no permite correo arbitrario. Al habilitar piloto, probar aislamiento entre restaurantes y respecto a demo; si se añade rol colaborador, probar que no puede enviar.

Un E2E representativo cubre explorar→fuentes/precios/contactos→estudio. Una continuación opcional cubre equivalencias→cantidad→solicitud→respuesta→comparación→decisión; cargar documentos propios no es requisito de ninguno. Si existe la extensión, una prueba adicional cubre vínculo de receta e impacto. Un smoke test real por proveedor externo acredita ejecución; mocks para fallos reproducibles. No repetir todas las reglas en tres niveles.

Antes de datos privados: autenticación y permisos comprobados, secretos fuera del cliente, archivos restringidos, exportación y borrado probados, recuperación de un conjunto de prueba y guía breve de soporte. Elegir mecanismo de auth soportado tras un spike; no introducir una versión alpha solo por aparecer en los recursos del concurso [S11].

«Listo para piloto acompañado» no significa «listo para cualquier restaurante en producción». Antes de venta general: varios ciclos de uso, costos de soporte/API medidos, condiciones de servicio y tratamiento de datos resueltos para la operación real, y procedimientos de recuperación y salida validados. No se afirma cumplimiento legal por tener este documento.

## 14. Decisiones y pendientes

Decidido para planificar: un local, español/PEN, entrada autónoma por estudio de mercado, contexto propio/compra/recetas opcionales, datos confirmados, móvil web, correo más captura manual de WhatsApp, búsqueda acotada de fuentes de distribuidores y decisiones humanas. Recetas como extensión progresiva de una a tres para el concurso si hay tiempo; sin contabilidad ni expansión global inmediata. No excluir clientes ni medir activación por tener recetas.

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


## Scope update · purchasing decision support (September 9, 2026)

The hackathon decision flow includes an optional purchasing advisor after a comparison is reviewed. It considers stated cash priorities, budget, confirmed daily usage and stock, maximum coverage, and the current supplier. Deterministic scenarios provide order outlay and excess; a bounded Agent interpretation explains tradeoffs using the owned source snapshot. Negotiation drafts use comparable evidence and require human review before any external communication.

This addition does not infer financial history, demand, credit terms, market trends, quality or realized savings. Unknown conditions remain pending. An analysis retains its inputs and comparison revision so changed evidence cannot silently rewrite a prior verdict. Research still works without any purchasing context. See the [advisor contract](../desarrollo/ASESOR_COMPRAS.md) and the [provider verification procedure](../desarrollo/CREDENTIALS_AND_E2E.md); implementation status remains in ETAPAS.md.
