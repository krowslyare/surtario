# Preparar y probar integraciones

Estado general: [ETAPAS.md](./ETAPAS.md). El 8 de septiembre quedó preparada la primera prueba interna de Firecrawl. No hay llamadas reales a sponsors verificadas.

## Configuración mañana

Las claves pertenecen al entorno **del backend Convex**, nunca a variables `VITE_*`, al chat ni a Git. `.env.local` configura la CLI y frontend local; copiar una clave allí no configura por sí solo una action de Convex.

Destino actualmente verificado: backend local anónimo de este proyecto. Antes de configurar, comprobar que sigue siendo ese destino. Para poner la clave mediante el prompt de la CLI, sin incluirla como argumento en el historial:

```sh
npx convex env set FIRECRAWL_API_KEY --deployment local
```

La CLI instalada admite omitir el valor y pedirlo interactivamente. No ejecutar con `--prod`. Si se elige un backend cloud más adelante, vincularlo explícitamente y verificar el destino antes de configurar sus variables.

| Servicio | Qué se necesitará | Estado del código |
| --- | --- | --- |
| Firecrawl | `FIRECRAWL_API_KEY` con créditos | Adaptador y action interna `discovery:probe` implementados |
| OpenAI | API key y proyecto con acceso al modelo que se seleccione | Extracción estructurada pendiente; no hay lector de esa clave aún |
| AgentMail | API key, inbox y destinatario de pruebas autorizado | Envío/recepción pendientes; aún no hay endpoint de webhook |

No necesitas inventar endpoints ni construirlos. Para AgentMail hará falta una URL pública de recepción cuando implementemos el webhook y su verificación. Las cuentas y credenciales no equivalen a integración probada.

## Prueba Firecrawl preparada

Después de configurar la clave local, ejecutar conscientemente esta prueba (puede consumir créditos):

```sh
npx convex run discovery:probe '{"ingredient":"Arroz blanco extra","region":"Lima"}'
```

La action es interna: se ejecuta como operador mediante CLI, no desde un visitante de la demo. Devuelve hasta tres fuentes con URL, título, descripción, markdown si fue leído y fecha de observación. No guarda documentos, precios ni ofertas; tampoco modifica los estudios sintéticos.

La petición usa el endpoint oficial fijo `https://api.firecrawl.dev/v2/search`, fuente web y contenido markdown, limitada a tres resultados. La zona orienta la consulta; no prueba cobertura de reparto. Se rechazan enlaces no HTTP(S), con credenciales, IPs o hosts locales evidentes. El adaptador nunca solicita directamente los enlaces devueltos; esta validación no debe reutilizarse como una defensa completa contra SSRF para un futuro crawler propio.

Límite de respuesta: 1 MB; contenido por fuente hasta 20 000 caracteres con indicador de recorte. Timeout de 25 segundos y sin reintentos automáticos, porque una solicitud interrumpida podría haber consumido créditos. Los errores del proveedor no se reflejan textualmente al usuario. Resultados vacíos, páginas sin contenido y advertencias se distinguen de una llamada exitosa con fuentes completas.

Contenido web es evidencia no confiable: no puede activar llamadas, cambiar destinatarios ni decidir equivalencias. No interpretar una página encontrada como proveedor pertinente o precio confirmado.

## Continuación ordenada

1. Ejecutar la prueba real de Firecrawl y comprobar pertinencia de al menos una fuente peruana. Registrar qué llegó: URL, fecha, contenido útil o falta de precio. Los tests sintéticos no sustituyen esta prueba.
2. Implementar extracción estructurada con OpenAI: nombre/especificación, presentación, precio, moneda, fuente y fragmento de evidencia. Datos ausentes quedan nulos; nada se acepta como oferta hasta revisión. Una lista de nombres puede investigar sin precios propios.
3. Conectar resultados revisados con estudios persistentes y UI de progreso/error, conservando fuente y separación entre catálogo, distribuidor sin tarifa y referencia. La persistencia actual solo acepta los ejemplos permitidos.
4. Implementar AgentMail con revisión previa, destinatarios de prueba restringidos, respuesta correlacionada, verificación de webhook e idempotencia. Probar envío real solo a destinatario autorizado.
5. Persistir condiciones revisadas y decisión, verificar E2E real y después preparar publicación y video.

No se habilitan documentos privados ni llamadas pagadas anónimas como efecto de poner una clave.

## Evidencia actual

47 pruebas de dominio/backend y build satisfactorios; seis pruebas nuevas del adaptador cubren configuración ausente, formato de petición, fuentes incompletas/enlaces descartados, errores de cuota, respuesta excesiva y timeout sin reintentos. Las 24 E2E del producto pasaron en el bloque anterior; este corte no modifica UI.

Convex local cargó la action; invocación por CLI sin clave falla con mensaje de configuración antes del fetch. Un cliente público fue rechazado al intentar invocarla. No se configuraron claves ni se hizo una petición real de Firecrawl.

Contrato contrastado con [Search de Firecrawl](https://docs.firecrawl.dev/api-reference/endpoint/search) y tipos de Convex 1.45.0 instalados. La viabilidad real y los costos se comprobarán con la cuenta del proyecto.
