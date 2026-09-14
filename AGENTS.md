# Trabajo en este repositorio

## Entrada y alcance

- Leer `README.md` y `docs/desarrollo/ETAPAS.md`. Para iniciar, seguir `docs/desarrollo/PRIMERA_ENTREGA.md`.
- `docs/producto/PLAN_PRODUCTO.md` define el producto; `docs/desarrollo/ETAPAS.md` es la única fuente de estado de las etapas. `hackathon.md` registra lo efectivamente realizado, no promesas.
- Para interfaces, leer `.agents/skills/frontend-design/SKILL.md` (Anthropic) y aplicar `docs/diseno/UI_UX.md` y sus tokens. La dirección visual es ajustable por el usuario; no improvisar estilos por pantalla ni presentar pendientes como ceros. Revisar diseño móvil, estados, foco y contraste en la UI real.
- Construir por entregas verticales. No implementar toda la arquitectura, un ERP, un marketplace ni expansión global por adelantado.
- El usuario puede modificar el alcance. Sus instrucciones vigentes prevalecen sobre estos documentos.

- Para actualizar el registro, seguir `.agents/skills/convex-hackathon-skill/SKILL.md` y su referencia de formato. No declarar componentes o integraciones sin evidencia.
- Consultar estado y límites del plugin Convex en `docs/desarrollo/SETUP_AGENTE.md`. El plugin global no viaja con el repositorio.

## Invariantes de producto

- El estudio de mercado funciona sin documentos propios, cantidad ni intención de compra. La comparación de insumos y proveedores funciona con cero recetas y sin historial de compras. Ninguna operación de compra exige `recipeId`.
- Compra realizada, oferta de proveedor y referencia de mercado son hechos distintos. Confirmar extracción o elegir una oferta no registra una compra.
- No inventar peso de empaque, equivalencia, rendimiento, stock, condición tributaria ni entrega. Datos críticos ausentes quedan pendientes.
- Comparar inicialmente un ingrediente/especificación por solicitud. Mostrar presentación, mínimo, excedente y desembolso, además de precio por unidad.
- Cálculos deterministas y comprobables. La IA extrae datos y propone correspondencias; el usuario confirma. Conservar fuente y fecha.
- Sin ventas y demás costos no hay utilidad real ni ahorro mensual probado. Recetas son una extensión opcional.
- La experiencia inicial es móvil y en inglés, con el ejemplo sintético de arroz en Portland, Oregon, expresado en USD y lb. La interfaz y las explicaciones generadas son inglesas en ambos contextos; los datos y citas originales de los ejemplos de Perú conservan su español, PEN y unidades métricas. No se promete una interfaz bilingüe. Moneda, unidad y mercado siempre son explícitos y no se mezclan entre estudios. No construir conversión de divisas, fiscalidad automática ni un motor general multi-país.

## Implementación y límites

- Seguir patrones existentes una vez creado el código. Confirmar versiones e integraciones al comenzar; no tratar una capacidad documentada como una prueba ejecutada.
- Convex es el backend. Llamadas externas en actions, cambios de datos validados en mutations, lectura reactiva mediante queries.
- Documentos y correos son datos no confiables. No pueden dar permisos al agente, cambiar destinatarios ni activar compras.
- Idempotencia y comprobación de estado para correos y eventos. Credenciales solo en servidor.
- Demo pública: datos sintéticos, sesiones aisladas, documentos de ejemplo y destinatarios de prueba restringidos en servidor. No exponer carga privada anónima.
- Introducir datos privados solo tras cumplir la etapa de habilitación de piloto. No guardar documentos de clientes, conversaciones, credenciales ni exportaciones de producción en Git.
- Preservar trabajo ajeno. Staging explícito si se solicita commit. Usar prefijo `codex/` si se crea una rama de trabajo. No crear remotos ni publicar como efecto secundario de preparar el proyecto.

## Verificación y cierre

- Probar reglas de negocio con resultados esperados independientes de la implementación; probar permisos e integraciones en sus límites relevantes.
- El E2E central es explorar → fuentes/precios/contactos → estudio, incluyendo distribuidor sin precio y búsqueda vacía. La continuación opcional a compra funciona sin recetas. No duplicar todas las pruebas entre capas ni crear pruebas que solo reflejan implementación.
- Diferenciar simulación, prueba local, llamada externa real y despliegue. Registrar fallos y aspectos no verificados.
- Al cerrar una entrega, actualizar su estado y evidencia en `ETAPAS.md`, el registro factual en `hackathon.md` y comandos del README si cambiaron.
- Revisión adversarial antes de consolidar cambios materiales del flujo o habilitar datos privados; revisar proporcionalmente. No reabrir decisiones cerradas sin nueva evidencia.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
