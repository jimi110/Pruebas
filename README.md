# StarLuge

Juego espacial en HTML. Se abre `index.html` (en GitHub Pages o con un servidor local; no con `file://` por los `.json`).

## Estructura

```
index.html                  HTML + estilos; carga los scripts en orden
regions.json                registro ligero de regiones
region-expansion-01..04.json  datos de cada región de expansión
js/
  core/        arranque, mundo, interfaz, guardado, combate, actualización, dibujado, bucle, multijugador
  systems/     naves aliadas, misiones, eventos, motor de misiones, (diálogos pendiente)
  expansions/  cargador de regiones (regions.js) y eventos de expansión (events.js)
assets/        ships/ models/ audio/  (vacías de momento)
```

**El orden de los `<script>` en `index.html` importa**: todos comparten el mismo ámbito global y el
código viene de un único script que se partió por secciones sin reordenarlo. `js/core/main.js`
(arranca el bucle) debe ir siempre el último de los del juego, antes de `regions.js`.

## Nebulosa Zafiro (región 01) — novedades

- **Jirón Lapislázuli**: campo con `"move":1` en `region-expansion-01.json`; sus asteroides derivan, rebotan en el borde de la zona y entre sí, y golpean la nave. El anfitrión simula y envía posiciones al invitado (`mv` en `mpDiff`).
- **Minerales nuevos**: Lapislázuli (`lz`) y Zafiro (`za`), en `MIN` (ui.js) y en las tablas de mena de los dos campos.
- **Base Zafiro** (`sty:"zf"`, `guards:4`): modelo propio en `zfBase()` (render.js); sus guardias huyen al verte.
- **Balizas** (`poi` con `kind:"gear"|"laser"`): se recogen al acercarse; guardan el plano en `QX.bp` (por jugador).
- **MEJORAS** de Base Zafiro: tren de aterrizaje (30 lapislázuli + 50 zafiro + 250 chatarra) y rayo francotirador, solo si tienes el plano.
- **Misiones**: capítulo 5 (`c5.x`), secundarias `zs1..zs4` (solo tras llegar a la nebulosa) y encargos `zcl/zmt/zinv/zkl` (solo mientras estás en la nebulosa). Tras completar un encargo, el siguiente tarda 1–2 min (`QZ.jw`). Encargos y secundarias también funcionan en multijugador.
