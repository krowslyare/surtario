# Preparación del agente

Verificado el 7 de septiembre de 2026 en Codex Desktop para macOS, con shell zsh y soporte de skills locales en `.agents/skills/`.

## Estado

- Plugin global `convex@convex-codex-plugin` 1.10.0 instalado y habilitado. Marketplace oficial `get-convex/convex-codex-plugin` verificado mediante el listado de Codex.
- Archivos del plugin inspeccionados: skills y configuración de los servidores `convex` y `convex-plugin`. Las herramientas todavía no están disponibles en la sesión de instalación: **reinicio y comprobación posterior pendientes**. MCP configurado no significa MCP activo.
- Skills locales `frontend-design` y `convex-hackathon-skill` copiados, leídos y con origen y licencias conservados. El registro se inició siguiendo directamente el skill, sin afirmar que el alias `/hackathon` ya fue cargado.
- `hackathon.md` adaptado al formato oficial. Hosting seleccionado: Convex static hosting (`convex.site`), sin desplegar.
- No existe todavía `package.json` con Convex ni una aplicación Convex. Se omiten por ahora los AI files del proyecto y el componente Static Hosting.
- No se instalaron dependencias de aplicación, iniciaron servidores, registraron cuentas, configuraron secretos ni ejecutaron APIs del producto.

## Continuar después del reinicio

1. Reiniciar Codex y volver a abrir este proyecto.
2. Confirmar que el plugin Convex y los dos skills locales aparezcan disponibles. Comprobar las herramientas MCP mediante su listado o un diagnóstico de lectura cuando haya proyecto; no consultar datos de producción.
3. Registrar el resultado real aquí y en `hackathon.md`. Si falta autenticación o carga de MCP, identificar el paso concreto; no reinstalar otra integración en paralelo.
4. Comenzar `PRIMERA_ENTREGA.md`. Una vez creado el proyecto Convex, seguir las instrucciones oficiales para sus AI files. El componente de hosting se configura durante la construcción, no durante este setup.

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
