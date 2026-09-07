# Etapas de desarrollo

Esta tabla es la fuente de estado del proyecto. Marcar una etapa completada solo con evidencia de su criterio de salida. El calendario del plan es orientativo; ante retrasos aplicar sus recortes, sin afirmar resultados no ejecutados.

## Estado

| Etapa | Resultado | Estado | Evidencia actual |
| --- | --- | --- | --- |
| 0 | Repositorio organizado y plan ejecutable | Completada | README, guía, plan, revisión y primera entrega locales |
| 1 | Base de desarrollo y caso de compra calculable | Pendiente | Ningún código ni dependencia instalada |
| 2 | Viabilidad de integraciones externas | Pendiente | Solo documentación consultada |
| 3 | Primera comparación útil en la aplicación | Pendiente | — |
| 4 | Solicitud, respuesta y decisión conectadas | Pendiente | — |
| 5 | Demo pública aislada y robusta | Pendiente | — |
| 6 | Impacto opcional en recetas | Pendiente, recortable | No condiciona etapas 3–5 ni entrega |
| 7 | Materiales y entrega del concurso | Pendiente | Requisitos documentados; nada publicado |
| P | Habilitación y validación de piloto privado | Pendiente, vía comercial independiente | No hay restaurante disponible |

Preparación del agente: skills locales y plugin Convex instalados; reinicio y disponibilidad MCP pendientes de verificar. Ver [SETUP_AGENTE.md](./SETUP_AGENTE.md). Esto no completa la etapa 1.

Próximo trabajo: [Primera entrega](./PRIMERA_ENTREGA.md). Las etapas 1 y 2 deben resolverse al inicio antes de invertir en diseño completo. Si falta una credencial, completar el trabajo local y registrar el bloqueo específico; no inventar una integración exitosa.

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

## 3 · Documento a comparación

Objetivo: primer resultado completo para el encargado, sin recetas ni historial.

Trabajo: cargar documento, revisar extracción, confirmar equivalencia/presentación, indicar cantidad requerida y comparar dos ofertas. Mostrar precio por unidad, paquetes, excedente, entrega y desembolso. Conservar evidencia y fecha. Registrar compras realizadas separadamente cuando el usuario lo indique.

Salida: recorrido con cero recetas y cero compras históricas; una oferta sola pide alternativa; un peso desconocido no se convierte; una oferta nueva no registra compra. Probar también documento antiguo y empaque cambiado.

Interfaz: Insumos y proveedores / Compras. Una vista de revisión y una comparación legibles en teléfono bastan.

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

Primer caso: un insumo, dos ofertas y una necesidad de compra. Registrar esfuerzo del usuario y de quien acompaña, correcciones, decisión útil y segundo uso. Probar precio con oferta concreta después de observar valor; no exigir recetas ni dar demanda por validada.

Salida comercial inicial: uso real y continuidad medidos, con resultados y rechazos documentados. Para venta más amplia, aplicar condiciones del plan; una demo funcional no significa preparación comercial general.

## Cómo cerrar cada etapa

En la fila correspondiente, registrar estado y enlace a evidencia breve: archivos, prueba/comando y resultado, entorno y limitaciones. En `hackathon.md`, añadir lo realizado ese día. No mantener otros checklists de estado duplicados ni abrir infraestructura de tareas antes de necesitarla.
