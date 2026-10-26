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
