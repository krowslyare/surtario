# Ensayo del recorrido y pendientes del video

Verificación del 8 de septiembre de 2026 UTC. Se ensayó el recorrido implementado con Playwright contra la app y Convex locales. No se grabó ni editó un video; los tiempos siguientes son un guion objetivo, no una duración medida de narración.

## Ensayo reproducible

Con Vite y Convex locales configurados según README:

```sh
npm run test:demo
```

El test usa una sesión nueva, exclusivamente ejemplos sintéticos y conexiones WebSocket limitadas a localhost. Los pasos aparecen identificados en el reporte de Playwright. La ejecución automática pasó; su duración de ejecución no mide cuánto tardaría una persona en explicar el producto.

| Tiempo objetivo | Recorrido actual | Evidencia y límite |
| --- | --- | --- |
| 0:00–0:20 | Explorar arroz en Lima, sin documentos ni cantidad | Filtro local explícito; aún no descubre proveedores reales |
| 0:20–0:45 | Revisar fuente, dos catálogos y un distribuidor sin precio | Fuentes y contacto ficticios, identificados como ejemplo |
| 0:45–1:05 | Seleccionar, guardar y recuperar tras recargar | Persistencia real en Convex local; se conserva evidencia |
| 1:05–1:25 | Abrir contacto y preparar consulta | Borrador editable, sin envío; no demuestra AgentMail |
| 1:25–2:10 | Confirmar equivalencia, indicar 10 kg, completar condiciones de ejemplo | Totales inicialmente pendientes. Fallback manual explícito: mínimo 1, flete A S/15 y B S/0, impuestos incluidos y entrega confirmada |
| 2:10–2:35 | Explicar S/95 frente a S/50; cambiar a 20 kg | S/175 frente a S/100. Se preserva el precio original; no se registra una compra |
| 2:35–2:40 | Volver al estudio y explicar continuidad | Selección conservada; comparación y borrador de consulta aún transitorios |

La prueba completa incluye fuente antes y después de edición, contacto sin precio, recuperación y cálculos. El E2E independiente de persistencia comprueba actualización entre dos pestañas, aislamiento y conflicto. No montar un video que presente estos fixtures o ediciones manuales como scraping, OCR o una respuesta recibida.

## Qué falta para el guion de concurso

La revisión de las [reglas oficiales](https://www.convex.dev/hackathons/all-gas) y [Luma](https://luma.com/convex-allgas-hackathon) confirma: uso real de sponsors, repo público, URL pública admitida y video menor de tres minutos. Los criterios mencionan explícitamente que OpenAI, Firecrawl y AgentMail deben ejecutar trabajo dentro del producto. Este repo continúa privado y la app local; push no equivale a publicación de la demo.

1. **Descubrimiento con Firecrawl:** obtener precios, presentaciones, contactos y fuentes reales con resultados parciales. No inventar cobertura, disponibilidad o entrega.
2. **Extracción con OpenAI:** convertir contenido/documento en datos estructurados, con revisión humana y pendientes. Empezar con un formato sintético verificable, sin construir todos los formatos de archivo.
3. **Cotización con AgentMail:** solicitud revisada, destinatario de prueba restringido, respuesta vinculada al estudio, idempotencia y revisión antes de usar el precio. El texto para WhatsApp permanece como alternativa.
4. **Continuidad de compra y decisión:** conservar las condiciones revisadas y la decisión; hoy solo el estudio queda persistido. Elegir no registra compra realizada.
5. **Demo pública:** controles de abuso y sesiones, manejo de fallos, hosting, verificación de URL y revisión de contenido antes de hacer público el repo. Después grabar, revisar el video y completar materiales/entrega autorizados.

No hacen falta recetas, ERP, pricing ni nuevas pantallas decorativas para cerrar ese guion. Prioridad: completar el flujo ya acordado. APIs siguen aplazadas por decisión del usuario; ninguna prueba sintética resuelve esa dependencia.

Para negocio, falta observar utilidad y segundo uso con restaurantes, canales reales y costo de servir. Antes de aceptar documentos privados se mantiene la etapa de piloto con autenticación, aislamiento, recuperación y tratamiento de datos. El acabado visual y un E2E verde no acreditan validación comercial.
