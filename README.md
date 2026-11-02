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

### Aterrizaje por zonas y multijugador en planetas
- **Zona de aterrizaje**: el punto donde posa la nave depende del ángulo por el que baja (`L.za`, se guarda en el guardado junto a `pad`). Cae a `ZR` (=35 % del lado del mapa) del centro, en la dirección de esa zona, y busca tierra firme cerca (`genSurface(p,zn)`). La animación de descenso hace zoom a ese mismo punto del planeta, muestra el suelo real de la zona (que se desliza hasta el punto de aterrizaje), tiene nubosidad/bruma propias de la zona y el HUD indica la zona (norte, sureste…).
- **Suelo por bandas**: la textura de la superficie se pinta empezando por la banda del aterrizaje (no de arriba abajo), así la zona se ve completa durante el descenso aunque el dispositivo sea lento.
- **Multijugador** (`PLN.mpInfo/mpIn/mpSc/mpScan` + `mp-sync/multiplayer.js`): el paquete `st` lleva `pl` (planeta, fase bajando/superficie/subiendo, progreso, nave posada, explorador, casillas recogidas) y `psc` (planetas escaneados).
  - Desde el espacio, quien aterriza se ve encogerse con brillo de reentrada y desaparecer; al despegar crece de nuevo.
  - Dos naves en el mismo planeta: la segunda esquiva a la primera (`SEP` = 9 casillas) además de depender de su zona. Nadie atraviesa las naves de los demás.
  - En la superficie se ven los exploradores de los otros (con nombre), sus naves posadas, bajando o subiendo, y aparecen en el mapa del planeta. Las rocas/plantas recogidas por uno desaparecen para todos.
  - Lo que un jugador escanea queda escaneado para toda la sala.
- **Minimapa**: `PLN.drawMini` pinta los planetas (textura, atmósfera, anillo) y `PLN.miniTxt` el nombre y la altitud del más cercano.

### Centinela Zafiro, francotiradores y Corazón de Zafiro
- **Balance**: el rayo de los snipers enemigos hace x3 (60 × dificultad). El rayo francotirador del jugador hace 240 de daño (naves pequeñas de un tiro, grandes de un par).
- **Ataques de láser del jefe** (`lzLaunch` en events.js; cada 5–6,5 s, 3–4,5 s en furia): estrella (rayos desde el centro hacia todas partes), muro (fila de rayos paralelos con hueco), francotirador (rayos apuntados a ti), barrido giratorio y abanico escalonado. Antes sale la línea roja de aviso. Se suman a abanico, torpedo y escoltas, que se mantienen.
- **Muerte**: ya no se vuelve inmune ni huye. Al llegar a 0 de vida se pone rojo, se sacude y explota por partes (≈4 s) y luego implosiona. Deja la chatarra y el **Corazón de Zafiro** en el suelo (marca en el minimapa); se recoge acercándose, como la chatarra.
- **Objeto legendario** (`corazon_zafiro` en items.js): va a la mochila y se puede guardar en el almacén de la base; es único: no se vende ni se tritura. El antiguo contador `sp.zf` se migra solo al almacén.
- **Multijugador**: la sala sincroniza los láseres (cada cliente daña su nave) y el objeto del suelo; cada jugador puede recoger el suyo. Versión de eventos 6: anfitrión e invitados deben tener la misma.

### Campos de la Zona Zafiro
- **Campo Zafiro** y **Jirón Lapislázuli** son ~3 veces más grandes en superficie (9000×6000 y 11500×3200), con densidad algo mayor y asteroides ×1,6 más grandes. Todo se controla desde `region-expansion-01.json`: `rx/ry/count` y los nuevos `size` (tamaño de los asteroides del campo) y `dmgMul` (multiplicador del daño por choque).
- Chocar contra un asteroide de esos campos hace el doble de daño que en Alfa (`dm` del asteroide en `update.js`). Subida `v` de la región en `regions.json` para que se recargue.

### Rendimiento, niebla y mapa
- **Niebla de exploración fuera**: el mundo ya no se oscurece en lo no explorado (`fog` en `drawWorld` solo si `!MAPALL`), así la Zona N3 y las demás se ven enteras desde el principio.
- **Rendimiento con el zoom alejado**: con zoom < 0,15 solo se dibujan los asteroides a menos de 2 500 u de la nave (1 500 u con zoom < 0,05; `AST_NEAR` en render.js); `drawAst` baja de detalle según el tamaño en pantalla (no dibuja o usa formas planas); la atmósfera usa menos anillos cuando se ve pequeña; la textura base se escala con calidad media.
- **Aros**: se rellenan como franjas exactas; la pasada trasera dibuja el anillo entero sin costuras y la delantera solo repinta lo que tapa al planeta (recortada al disco).
- **Mapa grande**: el planeta usa las mismas losas de detalle que el mundo (`mapPlanet`), así no se pixela al hacer zoom.
- **Menú flotante** (`#ctx`, p. ej. al pulsar un mineral del inventario): se cierra al pulsar fuera.

### Novedades (planeta, anillo, superficie, almacén)
- **Detalle del planeta ilimitado**: al acercarte, la superficie se recalcula por *losas* a la resolución de pantalla (ruido procedural, no una imagen fija). La atmósfera es vectorial (arcos), así que el limbo se ve nítido a cualquier zoom.
- **Anillo**: `ring` dentro del planeta en el JSON (`in, out, ry, tilt, gapAt, gap, count, tier, ore`). Mitad trasera decorativa por detrás del disco; mitad delantera = asteroides reales (minables y con colisión).
- **Minerales nuevos** `il` Ilirita y `se` Selenita (minería nv.3), en el anillo y los escombros de Ilyria.
- **Mapa**: un planeta sin escanear sale como «?» (sin imagen, nombre ni tipo); se desbloquea por jugador al escanearlo.
- **Superficie**: estilo isla 2D (agua → arena → verdes), 256×256 casillas, generada con la semilla de la partida (la misma cada vez que bajas). `F` recoge rocas y plantas; van a la nave (`QX.bag`).
- **Almacén** (`js/systems/items.js`): cuadrícula limpia, filtro, clic derecho (información, guardar, recoger, fundir, vender, triturar). Objetos nuevos: `ITM.add(id,{n,kind,col,ico,val,rar,desc,found,use})`.
