# restaurant-procurement

Nombre de trabajo. Producto para comparar insumos y proveedores a partir de cotizaciones, listas y comprobantes. Primero ayuda a decidir una compra; después permite seguir precios y, opcionalmente, calcular el impacto en recetas.

**Estado:** repositorio local preparado para comenzar desarrollo. Todavía no hay aplicación, dependencias instaladas, integraciones ejecutadas ni despliegue. No hay restaurante piloto disponible. El caso inicial será sintético y estará identificado como tal.

## Por dónde empezar

1. Leer las [etapas de desarrollo y su estado](docs/desarrollo/ETAPAS.md).
2. Ejecutar la [primera entrega](docs/desarrollo/PRIMERA_ENTREGA.md), sin saltar a implementar todos los módulos.
3. Consultar el [plan de producto](docs/producto/PLAN_PRODUCTO.md) para decisiones y límites, y la [revisión adversarial](docs/producto/REVISION_ADVERSARIAL.md) para sus motivos.
4. Aplicar la [guía de UI/UX](docs/diseno/UI_UX.md) y sus tokens de referencia al construir las pantallas.

Las instrucciones para trabajar en este repositorio están en [AGENTS.md](AGENTS.md). El registro factual de avance para el concurso está en [hackathon.md](hackathon.md).

## Recorrido que vamos a construir

Documento de proveedor → revisión de insumo y presentación → cantidad requerida → comparación de ofertas → solicitud de alternativa → respuesta → decisión.

El recorrido debe funcionar **sin recetas y sin compras históricas**. Registrar compras habilita seguimiento de precios. Vincular recetas habilita impacto por plato. Las ofertas, compras realizadas y referencias de mercado se mantienen separadas.

## Organización actual

```text
convexhackaton/                  # Esta carpeta ya es la raíz Git
├── README.md                    # Entrada al proyecto
├── AGENTS.md                    # Reglas para desarrollar
├── hackathon.md                 # Registro de trabajo realmente realizado
├── .agents/skills/              # Skills de diseño y registro del concurso
├── .gitignore
└── docs/
    ├── producto/
    │   ├── PLAN_PRODUCTO.md
    │   └── REVISION_ADVERSARIAL.md
    ├── diseno/
    │   ├── UI_UX.md             # Colores, tipografía y reglas de interfaz
    │   └── tokens.css          # Valores de referencia; aún no hay UI
    └── desarrollo/
        ├── ETAPAS.md            # Única tabla de estado de las etapas
        └── PRIMERA_ENTREGA.md   # Instrucciones concretas para comenzar
```

Al ejecutar la primera entrega se crearán `src/` para la interfaz, `convex/` para backend y `fixtures/` para casos sintéticos. No se crean carpetas vacías ni servicios separados de antemano. Propuesta técnica: React, TypeScript, Vite y Convex; verificar herramientas y versiones al instalar.

## Dos resultados distintos

- **Hackatón:** demo pública con datos sintéticos, integraciones reales, flujo completo y entrega verificable. Requisitos y guion en la sección 11 del plan.
- **Producto comercial:** validar después con documentos y uso real de un restaurante. La primera comparación no exige recetas; privacidad, soporte y recuperación se verifican antes de admitir datos del cliente.

No hay comandos de instalación o ejecución todavía: se documentarán cuando exista una aplicación y hayan sido probados. Remoto: [krowslyare/restaurant-procurement](https://github.com/krowslyare/restaurant-procurement). Durante esta preparación mantiene visibilidad privada; la entrega del concurso requerirá hacerlo público. No hay aplicación desplegada.


## Herramientas del agente

- [Frontend Design de Anthropic](.agents/skills/frontend-design/SKILL.md): usar junto con la guía UI/UX existente; branding comercial aplazado.
- [Skill del concurso](.agents/skills/convex-hackathon-skill/SKILL.md): `/hackathon` actualiza el registro. Si el comando no está disponible, leer y seguir el skill directamente.
- Plugin global oficial Convex instalado durante la preparación. Requiere reiniciar Codex y verificar sus herramientas en una nueva sesión. No se redistribuye dentro del repositorio.
- Hosting elegido: `convex.site`. Instalar el componente oficial cuando exista la aplicación Convex.

Estado verificable y pasos para otro colaborador: [setup del agente](docs/desarrollo/SETUP_AGENTE.md). Los skills copiados conservan licencias y revisión de origen en sus carpetas; esas licencias corresponden a dichos archivos, no establecen una licencia para el resto del proyecto.
