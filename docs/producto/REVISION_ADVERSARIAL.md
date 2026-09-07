# Revisión adversarial del plan

Fecha: 7 de septiembre de 2026. Documento revisado: [PLAN_PRODUCTO.md](./PLAN_PRODUCTO.md).

Alcance: la revisión por agentes y su cierre documentados abajo corresponden a v1.0. El plan actual es v1.1, ajustado después por indicación del usuario; ver el anexo final. No atribuir esa reformulación a una revisión independiente que no se ejecutó.

La revisión cuestiona el diseño propuesto; no certifica software, datos de proveedores ni demanda. Participaron un agente de contraste del mercado peruano y otro que revisó el borrador, además de la revisión e integración del agente principal.

## Conclusión

La propuesta permite construir una demo completa sin restaurante disponible. Su viabilidad comercial sigue como hipótesis. El trabajo previo más importante para el concurso es probar una fuente web pertinente y un correo de ida/vuelta; para vender, observar después cómo se mantienen recetas y compras reales.

No se sostiene que sea una categoría nueva: Fudo comercializa funciones relacionadas en Perú y MarketMan combina documentos, precios y recetas. La oportunidad propuesta es reducir el esfuerzo para un caso concreto y cerrar una decisión de compra sin migrar toda la operación. Esa diferencia debe medirse.

## Hallazgos y resolución en el plan

| Prioridad | Objeción | Cambio incorporado | Estado |
| --- | --- | --- | --- |
| P1 | La demo confundía revisar una lista con registrar una compra | Relato fijado en oferta nueva → escenario; última compra visible y preservada. Actos de confirmación distintos | Resuelto en diseño |
| P1 | El calendario dependía de acceso a un restaurante que no existe | Corpus sintético y buzones de prueba permiten construir; piloto comercial independiente | Resuelto en diseño |
| P1 | Roles y capacidad de piloto se construían antes del flujo útil | Cerrar primero el ciclo de sponsors; habilitación privada posterior si no hay cliente | Resuelto en diseño |
| P1 | El orden de recorte enumeraba funciones ya excluidas | Recortes reales: porcentaje/semáforo, preparación base, cantidad de platos y cobertura de mercado | Resuelto en diseño |
| P2 | Flete y cargos compartidos podían alterar arbitrariamente el costo de receta | Una solicitud por ingrediente; costo de receta sin flete rotulado y desembolso total separado | Resuelto en diseño |
| P2 | Firecrawl podía quedar como decoración o falso «precio verdadero» | Probar extracción y pertinencia por separado; usar referencia para fundamentar consulta, no como oferta comprable | Riesgo reducido; prueba pendiente |
| P2 | El canal correo podía forzar una conducta ajena al restaurante | Costeo funciona por captura móvil; correo adicional y demo de pruebas identificada | Riesgo reducido; canal comercial pendiente |
| P2 | Onboarding asistido y documentos limpios podían fabricar éxito | Registrar tiempo del usuario y acompañante, documentos excluidos, correcciones y segundo uso | Criterio definido; validación pendiente |
| P2 | Un saco barato por kilo podía presentarse como compra más conveniente | Mostrar paquetes, excedente, flete y desembolso; caso A S/95 con excedente vs B S/50 sin excedente | Resuelto en diseño |
| P2 | Demo pública podía aceptar datos privados o enviar correos arbitrarios | Documentos sintéticos incluidos, sesiones aisladas, destinatarios restringidos y límites en servidor | Requisito definido; implementación pendiente |

## Decisiones que se mantuvieron

- Separar compra, oferta y referencia; no inferir ventas, ganancia mensual ni ahorro realizado.
- Mantener procedencia, fechas, versiones, revisión de unidades y rendimiento.
- Usar cálculo determinista; la IA extrae y explica, no decide qué equivalencia es verdadera.
- Tratar mensajes y documentos como datos no confiables, con envíos aprobados e idempotencia.
- Empezar por español, soles y un local, conservando moneda/unidad/fecha en el modelo sin construir multi-país.
- Preparar una demo pública reproducible con código público cuando se autorice entregar; mantener fuera los datos privados.

Se eligió el relato de **oferta y escenario** sobre la alternativa de **compra ya realizada**, porque conecta directamente con la decisión pendiente que queremos demostrar. Las dos son válidas si los estados están bien separados.

## Riesgos que una revisión no puede cerrar

1. **Acceso y pertinencia del precio web.** Los boletines existen; no se ha ejecutado Firecrawl ni verificado cobertura del caso. El primer spike tiene un candidato y un fallback acotado.
2. **Mantenimiento de datos.** No hay restaurante disponible. Los casos sintéticos prueban reglas, no voluntad del encargado de seguir cargando compras.
3. **Diferenciación y pago.** Competencia confirmada; ahorro de esfuerzo y disposición a pagar son hipótesis de prueba, no resultados.
4. **Tiempo de ejecución.** Calendario de quince días es una estimación de alcance. No hay horas de equipo ni credenciales verificadas.
5. **Ganabilidad.** Un flujo coherente mejora la propuesta, pero no hay base para asignarle probabilidad de ganar.

## Verificación de este trabajo

Se contrastaron reglas oficiales, documentación de integraciones y oferta comercial relevante. Se revisaron coherencia de estados, alcance, aritmética ilustrativa, canales, criterios de validación y publicación. No se ejecutaron APIs del producto ni se contactó a restaurantes o proveedores. No se instaló, publicó ni desplegó nada.

Revisión final de cierre completada sobre v0.2: el revisor confirmó resueltos los P1 y no encontró contradicciones materiales para comenzar implementación. Sus dos precisiones finales se incorporaron en v1.0: sincronización solo entre vistas autorizadas de la misma sesión/restaurante, y primer piloto con un administrador; colaborador y sus pruebas solo cuando ese rol se implemente.

Resultado: plan coherente para iniciar T1–T2. No quedan hallazgos de diseño bloqueantes abiertos de esta revisión; permanecen las pruebas técnicas y comerciales explícitas del apartado anterior.

## Anexo v1.1: valor antes de cargar recetas

El usuario propuso comparar insumos y proveedores primero, dejando platos como consecuencia cuando existan recetas. Se incorporó esa entrada progresiva en promesa, cliente, recorrido, modelo de datos, activación, alcance, demo, calendario y pruebas.

- Una comparación requiere ofertas y especificaciones comparables; cantidad requerida para calcular desembolso. No requiere receta, venta ni compra histórica.
- La compra histórica habilita comparación contra lo pagado antes, sin bloquear la primera comparación entre ofertas.
- Las recetas habilitan impacto por porción; su ausencia o incompletitud nunca bloquea compras.
- Los cuatro sponsors tienen trabajo en el flujo de insumos. La extensión de platos se implementa después, si hay tiempo, sin dejar el producto incompleto cuando se recorta.
- La activación comercial mide una comparación útil; la disposición a pagar por compras sola continúa pendiente. El precio de prueba ya no depende de número de platos.

Verificación del agente principal: se recorrieron las dependencias del plan y se añadió aceptación explícita de un flujo completo con cero recetas y sin historial. No hubo nueva revisión por agentes ni pruebas de una aplicación en este cambio documental.

## Aclaración posterior: pricing del SaaS

Tras la observación del usuario se revisaron de nuevo las reglas oficiales. No se encontró requisito de tarifas, cobros o clientes pagos. Se definió demo sin pricing ni paywall y se retiró la cifra de precio no validada como hipótesis activa del plan. No hay una tarifa vigente. La validación comercial futura permanece pendiente. Los precios de insumos y ofertas siguen siendo parte del producto.


## Implementación de etapa 1 · 7 de septiembre de 2026

Revisión independiente con un subagente Sol sobre módulo de cálculo, parser y UI. Hallazgos corregidos: parser de entero generaba una expresión regular inválida al guardar; importes y conteos podían superar enteros seguros; diferencia entre tres o cuatro ofertas omitía indicar su referencia. Se añadieron comprobaciones y la comparación nombra la oferta de mayor desembolso cuando hay más de dos.

La verificación de navegador detectó además el retorno de foco y etiquetas accesibles de campos/selectores; corregidos manteniendo las aserciones. Evidencia final: tests de dominio/entrada, navegador y consultas de Convex local en README. Esta revisión no cubre autenticación, persistencia, OCR ni servicios externos, aún sin implementar.
