# Brainacho: concepto del motor

> **Estado: CONCEPTO EN DESARROLLO.** Nada se programa en este repo hasta que el concepto convenza (ver sección 6).
> Origen: el cerebro de la isla de **IslandFear** (`isla_cerebro_diseno.md`, `scripts/island_brain.gd`, `scripts/isla.gd`).

---

## 1. La idea en una línea

**Brainacho es un plugin para Godot que le da mente al mundo.** El escenario (una isla, una casa embrujada, una nave, un bosque) observa al jugador, siente, recuerda entre partidas y decide el ritmo del juego.

## 2. Por qué es distinto

- Los plugins de IA que ya existen para Godot, como LimboAI o Beehave, son árboles de comportamiento para **personajes**.
- Brainacho trata **al mundo como personaje**. Es un AI Director al estilo Left 4 Dead, con:
  - emociones y personalidad,
  - memoria persistente entre partidas y vidas,
  - ritmo de tensión (picos y silencios intencionales),
  - un cuerpo que mueve el gráfico, el audio y la jugabilidad sin escribir código.
- **Pendiente:** confirmar con una búsqueda de mercado que no existe algo así empaquetado para Godot.

## 3. Arquitectura: mente, nervios y cuerpo

```
SENSORES          MENTE                         NERVIOS              CUERPO
eventos del  ──►  emociones + memoria      ──►  curvas emoción  ──►  luz, niebla, shaders,
juego             director de tensión           → parámetros         audio, clima, vegetación,
                  decisión por utilidad                              recursos, acciones
```

### Las 4 piezas del producto

1. **Mente:** emociones, memoria, director de tensión y decisión por utilidad con curvas y novedad. Todo con Resources editables en el inspector.
2. **Sensores:** el juego avisa lo que pasa con una sola llamada, por ejemplo `Brainacho.evento("talar", posicion, 0.8)`. El plugin no necesita conocer el juego.
3. **Acciones:** cada desarrollador crea las suyas como Resources (`.tres`) y conecta una señal. **El plugin decide cuándo; el juego decide cómo.**
4. **Cuerpo:** un nodo con curvas que mueve niebla, luz, parámetros globales de shader y audio a partir del estado de la mente.

## 4. Qué es del motor y qué es del juego

Hoy el cerebro está "casado" con IslandFear: `IslandBrain` conoce `Castaway`, la cueva, los cangrejos, `IslandTerrain` y las frases en español, y el autoload `Isla` mezcla emociones con la mochila, el tesoro, las tumbas y Eva. Para venderlo hay que separar:

| Va en Brainacho (genérico) | Queda en IslandFear (el juego) |
|---|---|
| Emociones, decaimiento, personalidad base | Cueva, cangrejos, templo, Eva |
| Memoria: contadores, mapa de calor, guardado | Mochila, tesoro, tumbas |
| Director de tensión (CALMA, ACUMULACIÓN, PICO, RETIRADA, CONVIVENCIA) | Las 18 acciones concretas |
| Decisión por utilidad con curvas, novedad | Frases y voz de la isla |
| Vínculo por etapas, ciclo de vidas | Período de estudio de 2–3 días (como preset) |
| Cuerpo: curvas de emoción a parámetros | Mar, faro, shaders propios |
| Panel de debug y log de decisiones | |

## 5. Orden de trabajo

1. Terminar el **Director de tensión** y el **cuerpo** (`IslaCuerpo`) dentro de IslandFear, para probarlos donde ya hay un juego vivo.
   - Prompt listo: `IslandFear/docs/ZIVA_PASO2_DIRECTOR_TENSION.md`.
   - Enchufes ya preparados y sin usar: `EcoMap.set_mood()` y `LookDirector.set_modificador()`.
2. Extraer el núcleo a `addons/brainacho/` en este repo y hacer que IslandFear lo use.
3. Hacer dos demos chicas de otro género.
4. Recién ahí: documentación, nombre final, precio y tienda.

## 6. Criterio de "el concepto me convence"

El concepto está listo cuando se cumplen **los cuatro**:

1. **IslandFear funciona sobre Brainacho** sin perder nada de lo que hace hoy.
2. **Dos demos de otro género** (por ejemplo, una casa embrujada en 2D y una nave a la deriva) usan el plugin **sin tocar su núcleo**.
3. **Integrarlo en un proyecto vacío lleva menos de una hora**, siguiendo solo la documentación.
4. En cada demo se cumplen los criterios de "esto se siente vivo" del documento de diseño:
   - al menos un pico y un silencio claramente distintos en 10 minutos,
   - la isla no repite la misma acción dos veces seguidas sin motivo,
   - el jugador identifica causa y efecto,
   - hay momentos donde no pasa nada y se siente intencional.

Si una demo obliga a modificar el núcleo, el concepto todavía no está listo, y eso también es información valiosa.

## 7. Venta (a definir)

- Tiendas posibles: Godot Asset Store o itch.io.
- Modelo posible: núcleo gratis y versión Pro paga, con demos, presets de personalidad y herramientas de debug avanzadas.

## 8. Cuidado legal

- IslandFear usa música y assets con licencia de terceros (`Music License Agreement.pdf`, `Licencias game`). **Nada de eso puede ir en el plugin ni en sus demos.**
- Las demos se hacen con assets propios o con licencia que permita redistribuir.

## 9. Preguntas abiertas

- ¿Nombre final: Brainacho u otro?
- ¿Solo GDScript, o también C#?
- ¿Licencia del núcleo gratis (MIT u otra)?
- ¿Qué géneros eligen las dos demos?
