# Preparación del agente

Verificado el 7 de septiembre de 2026 en Codex Desktop para macOS, con shell zsh y soporte de skills locales en `.agents/skills/`.

## Estado

- Plugin global `convex@convex-codex-plugin` 1.10.0 instalado y habilitado. Marketplace oficial `get-convex/convex-codex-plugin` verificado mediante el listado de Codex.
- Plugin y skills locales disponibles en la sesión de implementación. El MCP es invocable; su `status` devolvió autorización pendiente incluso con backend local. No se afirma acceso MCP al despliegue.
- Backend anónimo local creado por `npx convex dev`, sin cuenta, en puerto 3210. Consultas reales verificadas por HTTP con `npm run test:backend`; comparación calculada en navegador. La entrega posterior añadió estudios persistentes y consultas reactivas con sesiones de demo; evidencia en `PERSISTENCIA_ESTUDIOS.md`.
- `npx convex ai-files install` añadió su sección administrada conservando AGENTS, guías generadas, CLAUDE y skills de proyecto. `npx convex ai-files status` confirmó los archivos vigentes.
- `frontend-design` aplicado a UI; skill del concurso aplicado al registro. Hosting seleccionado `convex.site`, componente y publicación aún pendientes.
- No hay APIs de OpenAI, Firecrawl ni AgentMail configuradas ni probadas. No se crearon cuentas ni se registraron claves de esos servicios.

## Siguiente conexión

La conexión a un proyecto cloud y las credenciales de sponsors se configuran al comenzar sus pruebas de integración. No reutilizar credenciales o despliegues de otro proyecto. Mantener `.env.local` y `.convex/` fuera de Git. Antes de trabajar contra cloud, comprobar destino y autenticación; la prueba local no acredita una integración pública ni webhook.

## Reproducir en otro equipo con Codex

Los skills locales viajan con Git; el plugin global no. Consultar primero las [instrucciones oficiales vigentes](https://www.convex.dev/agent-setup.md). Inspeccionar marketplaces y plugins antes de instalar para preservar la configuración existente:

```sh
codex plugin marketplace list --json
codex plugin list --json
```

Solo si faltan:

```sh
codex plugin marketplace add get-convex/convex-codex-plugin
codex plugin add convex@convex-codex-plugin
```

Verificar origen, instalación, habilitación y carga efectiva. Reiniciar si no aparece en la sesión. El plugin ya incluye skills y MCP; no duplicarlos con el fallback manual.

Fuentes: [setup Convex](https://www.convex.dev/agent-setup.md), [skill del concurso](https://github.com/get-convex/convex-hackathon-skill), [frontend-design de Anthropic](https://github.com/anthropics/skills/tree/main/skills/frontend-design).
