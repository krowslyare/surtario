# Búsqueda web y revisión conectadas

Entrega independiente sobre el guardado de comparaciones. Conecta la búsqueda Firecrawl y la extracción OpenAI con la pantalla; no incorpora correo ni cargas de archivos privados.

## Recorrido

1. Indicar insumo/categoría y zona. La búsqueda de ejemplos continúa disponible por separado.
2. «Search suppliers» consulta Firecrawl y conserva hasta 30 fuentes en el recorrido en inglés con URL, fecha, descripción y texto disponible. Encontrar una página no confirma que sea un proveedor pertinente ni que entregue en la zona.
3. Abrir la fuente para investigar catálogo o contacto. Si falta texto o precio, no se representa como cero ni se inventa un dato comercial.
4. Con `SEARCH_AUTO_REVIEW_ENABLED=true`, el clic de búsqueda prepara hasta tres fuentes de producto de dominios distintos; la UI avisa antes de ejecutarlo. Se prioriza evidencia explícita de moneda. También se puede solicitar extracción de otra fuente concreta. OpenAI propone campos y citas literales del texto ya guardado; no navega enlaces ni recibe instrucciones operativas de la página.
5. Revisar y corregir la propuesta. Las ofertas revisadas se pueden reunir tras confirmar equivalencia; cantidad, impuestos, entrega y mínimo siguen pendientes hasta confirmarlos.
6. Continuar a comparación. Elegir no compra ni envía mensajes.

## Configuración prevista

Solo en el backend: `FIRECRAWL_API_KEY`, `OPENAI_API_KEY`, `OPENAI_EXTRACTION_MODEL` y habilitación explícita `LIVE_RESEARCH_ENABLED=true`. No usar prefijo `VITE_` para claves. El indicador de disponibilidad expone únicamente si los pasos están habilitados, nunca valores secretos.

Sin configuración, la interfaz explica la indisponibilidad; no presenta fixtures como resultados web ni ejecuta llamadas de pago. Configurar las claves no constituye evidencia de integración: hay que probar el recorrido contra los proveedores y registrar el resultado.

## Límites de esta entrega

Las búsquedas almacenan fuentes públicas por sesión de navegador. La capacidad anónima no sustituye cuentas ni habilita documentos privados. Correcciones y selección permanecen en la pestaña hasta guardar la comparación. El [contrato de revisión web guardada](./REVISION_WEB_GUARDADA.md) permite conservarlas vinculadas a las fuentes y propuestas originales.

Sin revisión automática habilitada, búsqueda y extracción son acciones explícitas separadas. La búsqueda no envía correos ni decide compras. La lectura de productos enlazados por catálogos está acotada al mismo sitio y al presupuesto de lecturas. Las páginas se tratan como texto no confiable, con evidencia literal y confirmación humana.

Verificación histórica de la entrega inicial (estado actual en ETAPAS.md): 65 pruebas de dominio/backend, 33 de navegador y build satisfactorios. El caso positivo usa respuestas simuladas de proveedores y un transporte de prueba de UI; no demuestra pertinencia ni exactitud de fuentes externas reales. La API local de estado devuelve ambas capacidades deshabilitadas. Revisión visual móvil y pruebas de reflujo existentes satisfactorias.

Revisión adversarial independiente: se corrigieron la explicación de extracciones interrumpidas, el riesgo de repetir una llamada de modelo tras un guardado incierto y la precedencia de un resultado completo sobre una suscripción atrasada. Las llamadas externas con credenciales y la publicación siguen pendientes.

Límites de consumo: 10 búsquedas por sesión y 500 globales durante la vida de esta demo, espera de 30 segundos por sesión y hasta dos intentos de extracción por fuente. Crear otra sesión no evita el límite global. Las reservas y comprobaciones son atómicas; solicitudes duplicadas conservan el resultado o el estado en curso. Fuentes sin texto no habilitan extracción. Un resultado de modelo cuyo guardado es incierto queda sin reintento hasta revisión del operador. No hay recuperación automática ni expiración de reservas interrumpidas.

La búsqueda rápida en inglés usa tres consultas de hasta 20 resultados cada una y hasta 30 lecturas, con dos concurrentes. Las fuentes leídas aparecen progresivamente mediante Convex. El guardado del estudio conserva las ofertas revisadas; reabrir la búsqueda conserva fuentes y propuestas, sin volver a llamar a los proveedores. La aceptación local real de septiembre de 2026 se registra en ETAPAS.md y hackathon.md; no implica publicación cloud de estos cambios.

La presentación inicial muestra hasta 12 fuentes y permite desplegar el resto sin repetir la búsqueda. Los límites de descubrimiento y de IA son independientes: ampliar la cobertura no aumenta los tres análisis automáticos por búsqueda. El número encontrado depende de pertinencia, duplicados y disponibilidad; 30 es un techo, no una promesa de 30 proveedores.
