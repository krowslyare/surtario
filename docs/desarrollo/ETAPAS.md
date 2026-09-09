# Etapas de desarrollo

Esta tabla es la fuente de estado del proyecto. Marcar una etapa completada solo con evidencia de su criterio de salida. El calendario del plan es orientativo; ante retrasos aplicar sus recortes, sin afirmar resultados no ejecutados.

## Estado

| Etapa | Resultado | Estado | Evidencia actual |
| --- | --- | --- | --- |
| 0 | Repositorio organizado y plan ejecutable | Completada | README, guía, plan, revisión y primera entrega locales |
| 1 | Base de desarrollo y caso de compra calculable | Completada localmente | UI manual, 27 tests, 7 pruebas de navegador y build; comandos en README |
| 2 | Viabilidad de integraciones externas | En curso | Lectura/escritura, recarga, sincronización entre pestañas y aislamiento probados en Convex local; Pruebas internas Firecrawl/OpenAI preparadas; llamadas reales de sponsors pendientes |
| 3 | Estudio de mercado y compra opcional | En curso | Estudios de ejemplo persistentes; listas manuales/XLSX/CSV revisables y fotos/PDF propios con transcripción local y lectura multimodal de ejemplos implementada; llamadas reales pendientes |
| 4 | Solicitud, respuesta y decisión conectadas | En curso | Comparaciones y elección sintéticas recuperables; borrador persistente desde comparación o estudio sin precio y recepción firmada implementados; correo real pendiente |
| 5 | Demo pública aislada y robusta | En preparación | CI de tests/build añadido; E2E locales y correo restringido probados. Hosting y verificación pública pendientes |
| 6 | Impacto opcional en recetas | Pendiente, recortable | No condiciona etapas 3–5 ni entrega |
| 7 | Materiales y entrega del concurso | Pendiente | Requisitos documentados; nada publicado |
| P | Habilitación y validación de piloto privado | Pendiente, vía comercial independiente | No hay restaurante disponible |

Preparación del agente: skills cargados, MCP invocable pero status requiere autenticación. Backend local probado por CLI y HTTP; AI files instalados. Ver [SETUP_AGENTE.md](./SETUP_AGENTE.md). La evidencia de persistencia proviene de las pruebas de aplicación, no del estado del MCP.

Bloque de persistencia completado localmente: selección y fuentes recuperables, biblioteca reactiva, aislamiento de sesión y control de revisiones. Ver [evidencia y límites](./PERSISTENCIA_ESTUDIOS.md). No habilita datos privados ni completa la demo pública.

Siguientes hitos: ejecutar descubrimiento/extracción contra proveedores reales y el recorrido de correo de prueba autorizado. El código de búsqueda, revisión persistente y cotizaciones está preparado; faltan pruebas con credenciales. OpenAI, Firecrawl y AgentMail siguen aplazados por decisión del usuario. Se puede preparar el código sin claves, pero etapas 2–4 no se completan sin ejecutar las integraciones. Ver [exploración](./EXPLORACION_MERCADO.md) y [primera comparación](./PRIMERA_ENTREGA.md).

Revisión visual aplicada: Manrope local y tokens índigo/lavanda; búsqueda protagonista, resultados compactos, precio normalizado destacado y acceso persistente al estudio. La portada ilustrada fue retirada. Ver [guía visual y evidencia](../diseno/UI_UX.md). No modifica el estado de integraciones ni habilita publicación.

Ensayo del guion actual completado en navegador: explorar → guardar/recuperar → consulta sin envío → compra opcional → totales comprobados. 36 pruebas de dominio/backend y 19 de navegador, build y smoke de cálculo local satisfactorios. [Guion y brechas de concurso](./ENSAYO_DEMO.md); video no grabado, integraciones y publicación pendientes.

## 1 · Base y caso de referencia

Objetivo: tener un proyecto ejecutable y un caso de compra cuyo resultado pueda comprobarse a mano.

Trabajo: revisar herramientas locales; preparar React/TypeScript/Vite y estructura Convex cuando haya acceso; crear datos sintéticos; implementar reglas puras de comparación y pruebas relevantes. Documentar comandos que realmente funcionen. Guardar un lockfile del gestor elegido.

Salida: interfaz local mínima, comparación de referencia correcta, errores de datos explícitos y documentación para ejecutarla. El backend puede quedar señalado como pendiente de vinculación si requiere una cuenta todavía no disponible; la etapa no se declara conectada a Convex sin prueba.

Aplicar la [guía de UI/UX](../diseno/UI_UX.md) desde esta etapa. No incluye OCR completo, exploración de nombre/logo definitivo, cuentas comerciales, recetas ni publicación.

## 2 · Pruebas tempranas de integraciones

Objetivo: comprobar las dependencias de mayor incertidumbre con el mismo caso de compra.

Trabajo y evidencia:

- Convex: escritura/lectura y actualización en dos vistas autorizadas del mismo caso. Registrar entorno real; no confundir estado React local con sincronización del backend.
- OpenAI: extraer un documento sintético claro y uno ambiguo; salida estructurada con origen y datos faltantes. No inventar contenido de empaque.
- Firecrawl: leer una fuente pública fechada con producto y unidad identificables. Registrar extracción y pertinencia por separado. Intentar el fallback acotado del plan si falla.
- AgentMail: solicitud a buzón de prueba y respuesta correlacionada mediante IDs. Usar destinos del equipo autorizados; no contactar restaurantes o proveedores reales.

Salida: resultados reales y limitaciones registrados. Un mock puede habilitar trabajo local, pero no cuenta como integración ejecutada. Si la fuente web no aporta al caso o no es extraíble, resolver esa decisión antes de pulir la demo.

## 3 · Mercado a estudio y compra opcional

Objetivo: un estudio útil sin recetas, documentos propios, cantidad ni historial.

Trabajo: explorar por insumo/categoría y zona; separar catálogo, distribuidor sin precio y referencia; revisar fuentes/fechas/contactos y conservar selección. Persistir estudios con aislamiento. Permitir enriquecer con documentos revisados cuando esté implementada extracción. Continuar a compra solo al confirmar equivalencia y añadir cantidad/condiciones.

Salida: estudio recuperable sin documentos ni cantidad; contacto sin precio conserva fuente sin asignar cero; búsqueda vacía no afirma ausencia de proveedores; categoría amplia no mezcla productos incompatibles. Al continuar a compra, mostrar paquetes, mínimo, excedente y desembolso sin inventar entrega o impuestos. Una oferta nueva no registra compra.

El prototipo actual guarda estudios sintéticos en Convex local. Las fuentes reales y documentos siguen pendientes; guardar un fixture no acredita descubrimiento web.

## 4 · Cotización a decisión

Objetivo: cerrar la interacción posterior, no terminar en una tabla de precios.

Trabajo: solicitud de un ingrediente a proveedores seleccionados; revisión previa al envío; respuesta vinculada a solicitud; comparación actualizada; decisión registrada. Texto copiable para WhatsApp con recepción manual de respuesta. Referencia web dentro del detalle del insumo.

Salida: flujo de los cuatro sponsors ejecutado; correo de prueba real; duplicados y timeout sin doble envío; respuesta sin correspondencia en revisión. Elegir oferta no compra ni cambia historial.

## 5 · Demo utilizable y aislada

Objetivo: permitir que un juez recorra el producto sin invitación ni acceso a datos privados.

Trabajo: sesiones independientes, documentos sintéticos incluidos, límites por sesión y globales, destinatarios restringidos en servidor, webhooks verificados, fallos/reintentos visibles y captura móvil revisada. Preparar hosting compatible con el concurso.

Entrada pública con «Probar ejemplo», sin planes de suscripción, checkout ni pago para explorar. Los precios de insumos sí forman parte de la comparación.

Salida: dos visitantes no interfieren; no se permite envío arbitrario ni acceso a archivos ajenos; fuente vieja lleva fecha; el E2E completo pasa. Verificar URL real después de publicar dentro del alcance autorizado. Si sigue local, registrar «preparado para desplegar», no «publicado».

## 6 · Recetas como extensión opcional

Se empieza solo con el ciclo de compras estable y tiempo disponible. No bloquea el resultado principal.

Trabajo: vincular de una a tres recetas a insumos existentes, cantidades y rendimiento confirmados; cálculo determinista por porción; mostrar compra base frente a escenario de oferta. Preparaciones base y porcentajes de margen se recortan primero.

Salida: impacto correcto y trazable, sin duplicar merma ni confundir escenario con compra. Receta incompleta no afecta compras. Si se omite, el guion alternativo demuestra seguimiento de nuevas ofertas.

## 7 · Entrega de hackatón

Trabajo: revisar requisitos oficiales vigentes antes de entregar; actualizar registro factual, README y enlaces; grabar recorrido menor de tres minutos; revisar contenido a publicar; preparar publicación social y envío a la plataforma del concurso.

Salida: repo público y URL admitida accesibles, video reproducible, registro consistente con lo construido, publicación y recepción de entrega verificadas cuando estén autorizadas y ejecutadas. No marcar entrega completa por tener solo borradores.

Los documentos privados y conversaciones no forman parte del material público. Las reglas verificadas durante planificación, fuentes, fechas y guion están en la sección 11 del plan.

## P · Piloto privado y venta inicial

Esta vía se activa cuando haya contacto; no condiciona la demo sintética.

Antes de documentos reales: usuario administrador autenticado, aislamiento entre restaurantes y demo, archivos restringidos, exportación/borrado y recuperación probados, explicación de tratamiento de datos y soporte definido.

Primer caso: una pregunta de mercado de un insumo y zona. Registrar alternativas pertinentes, utilidad de fuentes/contactos, esfuerzo del usuario y acompañante, y segundo uso del estudio. Medir por separado la continuación opcional a compra con dos ofertas y una cantidad. Probar precio con oferta concreta después de observar valor; no exigir recetas ni dar demanda por validada.

Salida comercial inicial: uso real y continuidad medidos, con resultados y rechazos documentados. Para venta más amplia, aplicar condiciones del plan; una demo funcional no significa preparación comercial general.

## Cómo cerrar cada etapa

En la fila correspondiente, registrar estado y enlace a evidencia breve: archivos, prueba/comando y resultado, entorno y limitaciones. En `hackathon.md`, añadir lo realizado ese día. No mantener otros checklists de estado duplicados ni abrir infraestructura de tareas antes de necesitarla.

## Entrada de listas · evidencia local

Entrada manual, XLSX/CSV con elección de hoja/columna y revisión de nombres implementados. Fotos/PDF conservan origen y permiten transcripción manual; OCR pendiente. Archivo/lista transitorios en navegador, sin uploads ni ofertas creadas automáticamente. 41 pruebas de dominio/backend, 24 E2E y build satisfactorios. [Alcance, límites y evidencia](./ENTRADA_INSUMOS.md). Etapas 2–4 continúan abiertas hasta ejecutar las integraciones reales.

## Preparación de Firecrawl · evidencia local

Action interna y adaptador de búsqueda acotada implementados. 47 tests y build satisfactorios; action cargada en Convex local, bloqueada sin clave y no invocable por cliente público. Sin petición real ni conexión a la UI/persistencia. [Configuración y secuencia de integraciones](./INTEGRACIONES.md). La etapa 2 sigue abierta.

## Extracción y revisión · entrega independiente

Prueba interna OpenAI con dos textos sintéticos y revisión UI de propuesta/evidencia/corrección implementadas por separado. Componente Agent registrado localmente; sin llamada de modelo verificada ni OCR. Revisión permite pasar a comparación conservando originales y pendientes. 53 tests, 26 E2E y build satisfactorios; [evidencia y límites](./EXTRACCION_REVISION.md). No completa etapas 2–4.

PRs por entrega: extracción/revisión se revisa contra la rama base del PR 1; condiciones/decisión y correo irán en cortes posteriores. Ningún PR se fusiona por el solo hecho de tener pruebas locales correctas.

## Condiciones y elección · entrega independiente

Comparaciones de arroz/catálogos sintéticos recuperables con cantidad, condiciones, evidencia original y opción elegida. Elegir no registra compra. Fuente histórica conservada al retirar ofertas; revisión adversarial encontró y verificó esa corrección. Aislamiento por sesión, conflictos de revisión, límites y decisiones incompletas probados. [Contrato y límites](./PERSISTENCIA_COMPARACIONES.md). APIs externas y despliegue siguen pendientes; esta entrega no completa la etapa 4.

Verificación de este corte: 58 pruebas de dominio/backend; 30 E2E completos y una regresión adicional de confirmación tardía (31 casos en total), build y query local de la nueva tabla correctos. Revisión visual de comparación en 390/1280 px y pruebas de reflujo existentes satisfactorias.

## Búsqueda web conectada · entrega independiente

Implementado recorrido Firecrawl → fuentes persistentes → extracción explícita OpenAI → revisión y comparación. Habilitación y credenciales ausentes en local: llamadas reales y pertinencia pendientes. 65 pruebas de dominio/backend, 33 E2E y build; caso positivo con proveedores/transporte simulados, separado de consultas locales reales. Revisión adversarial corregida y límites de consumo probados. [Contrato y evidencia](./BUSQUEDA_WEB.md). No completa etapas 2–4; AgentMail y persistencia de correcciones web siguen pendientes.

## Revisión web guardada · entrega independiente

Correcciones confirmadas, condiciones y elección de fuentes web recuperables mediante referencias a investigaciones de la misma sesión. Evidencia y propuesta originales reconstruidas por servidor; sin documentos privados. 68 pruebas de dominio/backend, 34 E2E y build satisfactorios; recorrido de revisión/guardado/recarga ejecutado en Convex local con fuente sintética. [Contrato](./REVISION_WEB_GUARDADA.md). Llamadas de sponsors y AgentMail siguen pendientes.

Lectura de PNG/PDF sintéticos preparada con revisión visual y clasificación documental. Resultados del modelo, correcciones confirmadas, condiciones y elección persistentes; recuperación documental probada en Convex local. Ver [alcance y evidencia](LECTURA_DOCUMENTOS.md). No completa la extracción real ni habilita archivos privados.


Revisión del PR 1: corregidos valores supuestos de unidad/mínimo y resumen entre ofertas compatibles. 47 tests, build y 8 E2E de comparación pasan en el checkout aislado del PR; integraciones externas y entrega pública siguen pendientes.

Segunda ronda del PR 1: diálogo conserva entradas al pulsar dentro; procedencia manual fechada según calendario local. 47 tests, build y 9 E2E de comparación aprobados; no modifica el estado de las etapas externas.

PR 2 review preparation: integrated the reviewed PR 1 fixes from main; 53 tests, build, and 11 comparison/extraction E2E tests passed locally. External integration stages remain open.

PR 3 local review: integrated main and cleared stale save notices when restoring a new draft. Independent Sol 5.6 review adjudicated by Astra; 58 tests and build passed, plus five persistence UI checks against the existing local backend. External integrations remain unverified.

PR 4 local review: integrated main, 65 tests/build and 35 E2E checks passed. Sol 5.6 review adjudicated by Astra found no material blocker. Provider behavior remains simulated; stages 2–4 still require real integration evidence.

PR 5 local review: integrated main; Sol 5.6 review adjudicated by Astra found no material findings. 68 tests/build passed; 35 E2E passed initially and the web-persistence case passed with temporary local CLI configuration adjustment. External provider validation remains pending.


## PR 6 · local review
Reviewed main integrated. Fixed signed long replies returning a persistent server error by retaining bounded text with a visible truncation notice. Validation: 78 domain/backend tests, build and six focused browser checks passed; browser persistence used the existing local backend with later code. Mail transport remained simulated. External integration stages remain open.


PR 8 local review: Integrated reviewed main into synthetic image/PDF extraction. Corrected comparison labels that misrepresented documents as public web pages. The PNG preview represents the same PDF content, verified against the fixture. Human review and server-owned file limits remain enforced. 85 tests/build and 2 focused browser checks passed. Real provider verification and deployment remain pending.


PR 9 local review: Integrated reviewed document extraction into persisted document comparisons. Sol review and parent adjudication found no additional material issues. The browser seed command temporarily used the original local checkout configuration; that test-only adjustment was removed. 88 tests/build and 1 focused browser checks passed. Real provider verification and deployment remain pending.


PR 10 local review: Integrated reviewed main into catalog requests from saved studies. Sol review and parent adjudication found no material issues in ownership, origin-bound retries, fixed test recipients or explicit send approval. 89 tests/build and 2 focused browser checks passed. Real provider verification and deployment remain pending.
