# Primera entrega: base y comparación de compra

Este es el punto de entrada cuando se autorice comenzar a desarrollar. Por ahora solo se preparó el repositorio.

## Resultado esperado

Abrir una interfaz local, seleccionar un caso sintético, indicar cuánto se quiere comprar y ver una comparación correcta entre dos proveedores. Ninguna receta, compra histórica o integración de POS es necesaria.

El objetivo es validar las reglas antes de que una extracción automática pueda introducir errores difíciles de distinguir del cálculo.

## Secuencia de trabajo

1. Revisar `AGENTS.md`, estado de Git y herramientas disponibles. Conservar cambios ajenos.
2. Elegir el gestor disponible del proyecto y generar un solo lockfile. Preparar React + TypeScript + Vite; añadir Convex siguiendo documentación vigente. Revisar `SETUP_AGENTE.md`: verificar que el plugin Convex y los skills ya instalados carguen tras reiniciar; no duplicar instalaciones. Cuando exista el proyecto Convex, ejecutar `npx convex ai-files status` y, si corresponde, `npx convex ai-files install`, revisar los cambios y leer las guías generadas antes de trabajar en backend. No instalar plugins o crear cuentas por adivinación.
3. Crear `src/`, `convex/` según el scaffold y `fixtures/` con datos exclusivamente sintéticos. Usar un módulo de cálculo pequeño compartible con backend, no una arquitectura de servicios.
4. Implementar caso base y límites de conversión aplicando el [estándar de UI/UX](../diseno/UI_UX.md). Trasladar los tokens a estilos de la app y construir solo texto, botones, campos y comparación necesarios. La interfaz distingue datos válidos de pendientes; no contiene un «ganador» predeterminado.
5. Ejecutar pruebas de reglas y comprobaciones de build/tipos proporcionadas por el scaffold. Revisar la comparación en ancho móvil.
6. Registrar comandos reproducibles en README y evidencia en la etapa 1. Iniciar inmediatamente los spikes de etapa 2; no expandir UI sin comprobar las dependencias externas.

Si falta una cuenta o credencial, crear solo configuración de ejemplo sin secretos y explicar exactamente qué conexión sigue pendiente. La falta de API no impide calcular localmente; tampoco autoriza a presentar mocks como servicios funcionando.

## Caso sintético de referencia

Mismo ingrediente, calidad y unidad confirmadas. Todos los importes de este ejemplo usan la misma base tributaria. La entrega cumple la fecha requerida en ambas ofertas.

| Dato | Proveedor A | Proveedor B |
| --- | --- | --- |
| Presentación | Saco de 18 kg | Venta por kg, incrementos de 1 kg |
| Precio de mercancía | S/80 por saco | S/5 por kg |
| Entrega | S/15 por pedido | Incluida |
| Cantidad necesaria | 10 kg | 10 kg |
| Cantidad que se compra | 18 kg | 10 kg |
| Precio por kg, sin flete | S/4.44 mostrado; conservar precisión interna | S/5.00 |
| Desembolso | S/95.00 | S/50.00 |
| Excedente | 8 kg | 0 kg |

Salida correcta: A tiene menor precio de ingrediente por kg; B requiere S/45 menos de desembolso para esta necesidad y no deja excedente. No afirmar que A pierde 8 kg, que B ahorra S/45 de costo consumido, ni que un proveedor es mejor para todas las cantidades.

Segunda comprobación: con necesidad de 18 kg, A exige S/95 y B S/90; con 20 kg, A exige dos sacos, S/175 y deja 16 kg, mientras B exige S/100. Estos ejemplos impiden calcular paquetes fraccionarios o cobrar entrega por saco accidentalmente.

## Entradas mínimas

Ingrediente/especificación, proveedor, fecha y procedencia; contenido y unidad de presentación; importe/moneda; mínimos e incrementos; entrega y condiciones conocidas. La cantidad necesaria pertenece al caso de compra, no a una receta.

Preservar precio original y normalizado. Separar importe de mercancía de cargos del pedido. Importes faltantes, unidades incompatibles y bases tributarias no comparables no se rellenan con cero.

## Pruebas necesarias

- Caso base de 10 kg y cambios a 18/20 kg, con valores esperados independientes del cálculo implementado.
- Caja sin peso: comparación por kg pendiente; no inferir contenido.
- Cantidad cero/negativa y empaque inválido: rechazar con explicación.
- Mínimo de compra mayor a necesidad: respetarlo y mostrar excedente.
- Una sola oferta: mostrar lo conocido y pedir alternativa, sin inventar comparación.
- Condición de entrega o tributo desconocida: precio parcial identificado, sin presentar total completo.
- Diferente moneda/especificación: no mezclar ni hacer conversión implícita.
- El módulo y la pantalla funcionan sin `recipeId` y sin última compra.

Los casos de correo duplicado, documento viejo y acceso entre sesiones pertenecen a las etapas donde exista ese comportamiento, no a tests vacíos en esta entrega.

## Qué no construir aquí

OCR completo, cotización enviada a terceros, recetas, múltiples locales, facturación, suscripciones, catálogo global, exploración de logo/nombre definitivo o una interfaz de chat general. Sí se aplica el estándar visual ya definido. Las pruebas externas de la etapa 2 son el siguiente paso inmediato, no una excusa para ampliar esta entrega.
