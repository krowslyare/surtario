# Hackathon log

- **Project:** restaurant-procurement
- **Event:** Convex All Gas Hackathon
- **What it does:** Compara ofertas manuales por presentación, cantidad y desembolso, con datos pendientes explícitos y sin exigir recetas.
- **Live app:** not deployed
- **Repo:** private
- **Frontend:** Convex static hosting
- **Convex deployment:** not deployed
- **Components:** none
- **Convex features:** queries (local, sin persistencia)
- **Auth:** none
- **AI models:** none
- **Started:** 2026-09-07T18:47:16Z
- **Last updated:** 2026-09-07T22:05:27Z

## Log

### 2026-09-07 - working tree
Se prepararon el plan, revisión adversarial, etapas y primera entrega (`docs/`). La revisión independiente corresponde al plan v1.0; la entrada por insumos y proveedores de v1.1 tuvo revisión de coherencia local. Recetas quedan como extensión opcional.
Se definieron UI/UX y tokens, se comprobaron contrastes y ejemplos aritméticos del plan. No hay pantallas ni pruebas de aplicación. Demo prevista con datos sintéticos; validación con restaurante pendiente.
Se contrastaron requisitos y documentación de integraciones; fuentes en el plan. La demo se plantea sin tarifas del SaaS ni paywall. Branding comercial aplazado, conservando colores, tipografía y reglas funcionales.

### 2026-09-07 - b8a2071 · preparación del entorno
Se copiaron los skills oficiales de diseño y registro en `.agents/skills/`, con licencias y revisiones de origen. Se adaptó este archivo al formato del concurso leyendo directamente el skill; el alias aún no se verificó en una sesión nueva.
Plugin global oficial Convex 1.10.0 instalado y habilitado, con skills y configuración MCP inspeccionados. Herramientas no disponibles en la sesión actual: reinicio y comprobación de carga pendientes (`docs/desarrollo/SETUP_AGENTE.md`).
Se conectó el remoto privado y se revisaron los documentos para excluir contexto personal. Hosting seleccionado: `convex.site`, sin aplicación ni componente de hosting configurados. El primer commit registra esta base documental; Started usa su fecha UTC. El registro inicial anterior al commit se basó en evidencia local.
No se ejecutaron APIs del producto, contactaron proveedores ni desplegó o envió la aplicación al concurso. Próximo hito: verificar la carga de herramientas y comenzar la primera entrega.


### 2026-09-07 - working tree · primera comparación
Implementada UI React/Vite en español: necesidad editable, hasta cuatro ofertas manuales, origen, estados incompletos y resumen móvil. Cálculos compartidos en `src/domain/procurement.ts`, ejemplo sintético en `fixtures/`; no se guardan compras ni datos entre recargas.
Revisión adversarial con subagente Sol: corregidos parser de mínimos, precisión de importes y referencia de diferencias. Pruebas de navegador llevaron a corregir foco y nombres accesibles. Tokens trasladados a `src/styles/tokens.css`.
Instalados AI files del proyecto y creado backend Convex local sin cuenta. `convex/comparison.ts` expone consultas validadas de ejemplo y cálculo; no usa tablas ni servicios externos. Verificados resultados por HTTP local; MCP invocable, pero status aún solicita autenticación.
Pasaron 27 pruebas de dominio/entrada, 7 de navegador, build/tipos y prueba de consultas locales para 10/18/20 kg, dato faltante y límite de ofertas. Revisión visual de escritorio y móvil; sin validación con restaurantes ni auditoría completa de accesibilidad.
Persistencia, sincronización entre vistas, extracción, correo y hosting pendientes. No hay despliegue cloud ni entrega al concurso de esta implementación.

Preparación para Git: formato consistente en código y pruebas, licencias de skills administrados conservadas en `third_party/`, configuración de desarrollo separada en el commit `bad7b76`. Se repitieron las 27 pruebas de dominio/entrada y build/tipos después del formato, con resultado satisfactorio.
