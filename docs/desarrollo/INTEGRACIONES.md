# Preparar y probar integraciones

Estado general: [ETAPAS.md](./ETAPAS.md). El 8 de septiembre quedó preparada la primera prueba interna de Firecrawl. No hay llamadas reales a sponsors verificadas.

## Configuración de credenciales

Las claves pertenecen al entorno **del backend Convex**, nunca a variables `VITE_*`, al chat ni a Git. `.env.local` configura la CLI y frontend local; copiar una clave allí no configura por sí solo una action de Convex.

Destino actualmente verificado: backend local anónimo de este proyecto. Antes de configurar, comprobar que sigue siendo ese destino. Para poner la clave mediante el prompt de la CLI, sin incluirla como argumento en el historial:

```sh
npx convex env set FIRECRAWL_API_KEY --deployment local
```

La CLI instalada admite omitir el valor y pedirlo interactivamente. No ejecutar con `--prod`. Si se elige un backend cloud más adelante, vincularlo explícitamente y verificar el destino antes de configurar sus variables.

| Servicio | Qué se necesitará | Estado del código |
| --- | --- | --- |
| Firecrawl | `FIRECRAWL_API_KEY` con créditos | Adaptador y action interna `discovery:probe` implementados |
| OpenAI | API key y proyecto con acceso al modelo que se seleccione | Prueba interna de texto sintético con `OPENAI_API_KEY` y `OPENAI_EXTRACTION_MODEL`; llamada real pendiente |
| AgentMail | API key, inbox y destinatario de pruebas autorizado | Borrador, envío restringido y webhook firmado implementados; ida y vuelta real pendiente |

No necesitas inventar endpoints ni construirlos. Para AgentMail hará falta una URL pública de recepción para registrar el endpoint `/agentmail/webhook` ya implementado. Las cuentas y credenciales no equivalen a integración probada.

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

Extracción/revisión: ver [entrega independiente y pruebas](./EXTRACCION_REVISION.md). La UI de revisión usa fixture; la action OpenAI se prueba por separado antes de conectarla a entradas reales.

## Actualización: recorrido de investigación web

La búsqueda y extracción ya tienen conexión a UI y almacenamiento de fuentes/propuestas, protegidos por `LIVE_RESEARCH_ENABLED` además de las claves. Los probes anteriores siguen internos e independientes. Consulta [búsqueda web](./BUSQUEDA_WEB.md) para el contrato actual y sus pruebas. La conexión implementada no equivale a una llamada externa ejecutada; resta validar con credenciales. Las revisiones web y cotizaciones ya están implementadas; ver el recorrido vigente al final.


## Recorrido vigente después del PR 6

Los apartados de evidencia anteriores corresponden a entregas históricas. El código actual conecta búsqueda → extracción → revisión → comparación guardada → solicitud revisada → recepción de texto. Las fuentes web revisadas y la elección ya son recuperables. Ningún sponsor externo se ha probado todavía con credenciales reales.

Orden de habilitación y prueba:

1. Configurar Firecrawl y OpenAI, seleccionar el modelo y habilitar `LIVE_RESEARCH_ENABLED`. Ejecutar una búsqueda concreta, comprobar fuente/fecha y revisar la extracción antes de guardar. Ver [búsqueda web](BUSQUEDA_WEB.md).
2. Recuperar la comparación tras recargar y comprobar que propuesta original, correcciones y condiciones siguen distinguiéndose. Ver [revisión guardada](REVISION_WEB_GUARDADA.md).
3. Configurar AgentMail con un destinatario de prueba autorizado. Revisar el borrador antes de enviar. La recepción requiere URL pública registrada y secreto de firma. Ver [AgentMail](AGENTMAIL.md).
4. Responder desde el buzón autorizado, comprobar vínculo y duplicados, revisar condiciones y guardar una decisión. Conservar el resultado real, incluidos fallos, antes de declarar completa la integración.

No poner claves en GitHub Actions: el workflow de verificación usa tests en memoria y proveedores simulados. La configuración local debe mantener deshabilitados los servicios hasta que se decida ejecutar las pruebas reales.
