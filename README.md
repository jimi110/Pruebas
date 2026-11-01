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

## Zona N3 · Sistema Ilyria y planetas (región 05)

- **Región** `region-05` (`region-expansion-05.json`, círculo de r=125 000 u, encima de la Nebulosa Zafiro, sin guardia: `"guard": false` en `regions.json`). Su planeta **Ilyria** (r=70 000 u) ocupa la mayor parte.
- **Planetas**: se declaran en la clave `"planets"` del JSON de la región (`id, n, type, x, y, r, seed, desc, grav, temp, atm, day, comp`). La lógica vive en `js/systems/planets.js` (objeto global `PLN`).
- **Tipos de planeta** (registro): `PLN.addType('id',{...})` — ya hay `terran`, `desert`, `ice` y `gas` (este último no es aterrizable). Cada tipo define su textura (`albedo`), atmósfera, nubes y suelo (`ground.pal/pick/deco`). Para un tipo nuevo basta copiar uno.
- **Flujo**: acercarse (el zoom se aleja solo y se permite alejar hasta ×0,03) → clic derecho (o pulsación larga) = escaneo de 6 s → menú *Información / Orbitar / Atracar*. Atracar exige el tren de aterrizaje (`T.gear`) y no se puede en gigantes gaseosos. Las escoltas no bajan.
- **Superficie** (estado `planet`): mapa de 160×160 casillas generado por semilla, animación de descenso/despegue, mapa del planeta bloqueado que se revela al explorar (se guarda en `pl` dentro del guardado). Controles: WASD/clic, `E` despegar, `M` mapa.
- **Meteoritos**: evento visual raro cerca de planetas con atmósfera.

### Novedades (planeta, anillo, superficie, almacén)
- **Detalle del planeta ilimitado**: al acercarte, la superficie se recalcula por *losas* a la resolución de pantalla (ruido procedural, no una imagen fija). La atmósfera es vectorial (arcos), así que el limbo se ve nítido a cualquier zoom.
- **Anillo**: `ring` dentro del planeta en el JSON (`in, out, ry, tilt, gapAt, gap, count, tier, ore`). Mitad trasera decorativa por detrás del disco; mitad delantera = asteroides reales (minables y con colisión).
- **Minerales nuevos** `il` Ilirita y `se` Selenita (minería nv.3), en el anillo y los escombros de Ilyria.
- **Mapa**: un planeta sin escanear sale como «?» (sin imagen, nombre ni tipo); se desbloquea por jugador al escanearlo.
- **Superficie**: estilo isla 2D (agua → arena → verdes), 256×256 casillas, generada con la semilla de la partida (la misma cada vez que bajas). `F` recoge rocas y plantas; van a la nave (`QX.bag`).
- **Almacén** (`js/systems/items.js`): cuadrícula limpia, filtro, clic derecho (información, guardar, recoger, fundir, vender, triturar). Objetos nuevos: `ITM.add(id,{n,kind,col,ico,val,rar,desc,found,use})`.
