# Kumo: Más allá de la lluvia — brief de producción del tráiler

Tráiler de 60 s para el videojuego **Kumo: Más allá de la lluvia** (*kumo* = 雲, «nube»). El mundo encima de las nubes se llama Nubaria dentro de la historia. Lo cuenta un pueblo gris y un mundo encima de las nubes, con estética **inspirada en el cine de animación japonés clásico** (fondos pintados a mano en gouache y personajes en acetato). Todo se dibuja con código en un lienzo 2D, sin imágenes externas.

## 1. Dirección de arte

**REQUISITO Nº 1 DEL CLIENTE: «se tiene que parecer muchísimo» a su imagen de referencia** (un paisaje de anime pintado; una copia ampliada está en el scratchpad del coordinador, ver el prompt). `docs/estilo.png` es nuestra recreación aprobada con el motor y es el patrón de color, nubes, prado y acabado para TODOS los planos de día. Lo que la define:
- **Cielo turquesa** (`SKY_DAY`, `PAL.day` / `PAL.morning`): `#2585b1` arriba que aclara a `#a3d8e5` en el horizonte, con estelas blancas finas y rectas en diagonal (`paintStreaks`). Nada de azul marino ni violeta.
- **Cúmulos en torre** (`cumulusMass`): blanco casi puro en la luz, sombras **gris claro neutro** (`CLOUD_DAY`), luz de arriba a la izquierda (`light: [-0.5, -0.85, 0.3]`), silueta de coliflor con muchos lobulitos, interior limpio y base plana fundida. Varias nubes más pequeñas en los laterales.
- **Prado verde amarillento muy luminoso** (`paintMeadow` con `MEADOW_DAY`), cuajado de florecillas amarillas, blancas, celestes y melocotón. Flores grandes desenfocadas en primer término (`bokehFlowers`) y la esquina de primer término en sombra verde oscuro.
- Acabado digital pintado y limpio, saturado y luminoso, con pincelada suave (`painterly` con alfa baja). Nada de texturas pesadas.
- En los planos que no son de día (pueblo gris, tormenta, atardecer) se mantiene la MISMA mano: mismas nubes, el mismo acabado y la misma pincelada, cambiando solo la paleta.

**Fondos: pintura, no vector.**
- Gouache sobre papel: tonos que se funden con transiciones cortas, pincelada visible pero contenida y textura de papel (`applyPaper`).
- La luz manda. Luz cálida, **sombras frías y claras** (en las nubes, gris claro neutro como en la referencia; nunca negro) y perspectiva atmosférica: lo lejano es más claro, más azul y menos contrastado.
- Mucho detalle en capas: masas grandes, luego medianas y luego toques pequeños de luz. Nada de formas geométricas limpias, siluetas perfectas ni degradados de aerógrafo.
- Nubes: cúmulos de coliflor con cima blanca y sombras gris claro (`cumulusMass`, `cloudSeaMass`). Árboles: masas hojosas (`canopyMass`, `paintTree`). Hierba: miles de briznas (`paintMeadow`, `blade`). Roca: `paintRock`. Islas: `paintIsland`.
- Referencias de sensación (no copiar): cielos altísimos de verano, mar de nubes desde un avión, pueblos costeros europeos con postes de teléfono y cables combados, ruinas de piedra cubiertas de musgo.

**Personajes: acetato.**
- Línea fina marrón muy oscuro (`INK`), color plano y **una** sombra dura (`celShadow`). A veces un brillo en el pelo o los ojos.
- Caras sencillas y expresivas: ojos grandes ovalados con un brillo, nariz insinuada, boca pequeña y rubor con rayitas.
- Animación limitada: respiración, pelo y bufanda al viento, parpadeos. Nada de movimientos de muñeco 3D.

**Cámara y montaje.**
- Cámara multiplano: capas a distinta profundidad con paralaje (`place(g, cam, depth)`). Paneos y travellings lentos con easing suave.
- Solo los planos de vuelo son rápidos.
- Los rótulos están en la franja inferior (aprox. y = 600–720 del fotograma de 1920×800) en los instantes indicados. Deja esa zona sin acción importante mientras se ven.

**Luz y efectos.**
- Lo emisivo (ventanas, LEDs, sol, la llave) se pinta además en `f.glow` con `globalCompositeOperation = 'lighter'`; el postprocesado lo hace brillar.
- Ajustes por fotograma en `f.post`: `bloom`, `threshold`, `rays` (rayos de sol, con `sun = sunUV(px, py)`), `flash`/`flashColor` (fundido a blanco o color), `fade` (a negro), `exposure`, `sat`, `contrast`, `lift`, `gain`, `vignette`, `grain` y `zoom`/`zoomCenter` (desenfoque radial). Usa `Object.assign(f.post, PAL.x.post)` como base.

## 2. Contrato técnico

- Fotograma de trabajo: **1920×800** px (`W`, `H` de `engine/style.js`).
- Cada mundo es un módulo en `src/scenes/<mundo>.js` que exporta `async function build(env)` y devuelve `{ shots: { <plano>(f) { … } } }`.
  - `env = { W, H, paper }`.
  - `f = { T, lt, u, dur, g, glow, W, H, post, stage, paper }`. `T` es el tiempo global, `lt` el tiempo dentro del plano, `u = lt/dur` (0..1).
- `build` pinta una sola vez las capas caras (cielo, nubes, islas…) en lienzos con `painted(w, h, fn)` o las funciones de masas. Cada fotograma solo compone esas capas y dibuja lo animado (personajes, lluvia, cascadas, partículas).
- **Determinismo absoluto.** Nada de `Math.random`, `Date` ni `performance.now` para dibujar: usa `mulberry32(seed)` y el tiempo `t`. El mismo `T` debe dar siempre el mismo fotograma, porque el vídeo se renderiza fotograma a fotograma.
- **Rendimiento** (Chromium sin GPU):
  - `build` de un mundo: menos de unos 25 s.
  - Dibujar un fotograma: menos de unos 300 ms.
  - Nunca llames a `renderMass`/`cumulusMass` dentro de un fotograma.
  - Pinta las capas a la resolución a la que se verán (un poco más si la cámara se acerca).
- Comentarios en español, breves, con el estilo del código existente. Sin dependencias nuevas.

**Archivos compartidos: no los edites.**
- `engine/*`, `main.js`, `timeline.js`, `post.js`, `captions.js`, `index.html` y los de otros mundos.
- Si necesitas un pincel nuevo, créalo en tu propio módulo (o en `src/scenes/<mundo>/…`).
- Si encuentras un fallo en un archivo compartido, cuéntalo en tu informe final.
- `src/characters/girl.js` es del dibujante de personajes. Los demás solo lo importan y usan su API, que **no cambia**.

**Herramientas** (desde `trailer/`):
- `node tools/still.mjs 18.5 20 22` renderiza fotogramas sueltos en `out/stills/tXXX.XX.png`. Míralos con la herramienta de lectura de imágenes.
- `node tools/sheet.mjs reveal title` genera una hoja de contactos de esos planos en `out/sheet-….png`.
- `node tools/still.mjs --lab <nombre> 0 1 2` usa el laboratorio `src/lab/<nombre>.js` (exporta `build(env)` y devuelve `{ draw(f) }`). Sirve para probar piezas sueltas.
- `node tools/audio.mjs` renderiza la música en `out/score.wav` con niveles por compás y espectrograma en `out/score.png`.
- Los PNG van en `out/`, que está en `.gitignore`. Si varios agentes renderizan a la vez, usa `--out out/<tu-mundo>` en `still.mjs` para no pisaros.

## 3. Montaje (72 BPM, compás = 3,333 s)

| Plano | Tiempo (s) | Mundo | Contenido | Rótulo |
|---|---|---|---|---|
| town | 0 – 6,667 | town | Pueblo costero gris al anochecer bajo la lluvia, desde lo alto de la colina: tejados en cascada hasta un mar gris, faro en un cabo (haz girando), postes de teléfono con cables combados cruzando el plano, ventanas cálidas, nubes bajas pesadas. Travelling lento multiplano. Entra desde negro (`post.fade` 1→0 en ~2 s). | 1,3–5,9 «En un mundo gris…» |
| roof | 6,667 – 10 | town | La chica (chubasquero amarillo, capucha) sentada de espaldas en el caballete de su tejado, con el gato negro al lado. Mira arriba; la cámara sube de ella a las nubes, donde se abre un claro de luz dorada. | 7,3–9,85 «…ella todavía mira hacia arriba.» |
| goggles | 10 – 13,333 | goggles | Primer plano frontal con capucha, lluvia y luces del pueblo desenfocadas (bokeh pintado). Se baja las gafas (0,15–0,85 s), los LEDs se encienden uno a uno (1,0–2,5 s), las lentes brillan cian y le iluminan la cara. La cámara entra en la lente derecha y acaba en fogonazo cian-blanco (`flash` en los últimos 0,55 s, `flashColor` [0.75, 0.97, 1]). | — |
| tunnel | 13,333 – 16,667 | goggles | Desde el cian-blanco: sube a través de nubes grises que se aclaran, con estelas de luz pasando (líneas de datos) y partículas cuadradas luminosas (guiño digital). De gris a dorado y a blanco total al final (`flash` → 1). | — |
| reveal | 16,667 – 23,333 | nubaria | Sale del blanco (`flash` 1→0 en ~1,6 s). Nubaria: mar de nubes, torres de cúmulo, islas flotantes con cascadas y la isla principal con un **árbol gigantesco y antiguo**. Pájaros. Sol arriba a la derecha con rayos (`rays`). La cámara sube y avanza. | 19,0–23,0 «Hace años, alguien construyó un mundo encima de las nubes.» |
| cliff | 23,333 – 30 | meadow | La chica (exploradora, bufanda roja larguísima al viento) de pie de espaldas al borde de un acantilado de hierba alta. Mira el archipiélago y el gran árbol a lo lejos. Olas de viento en la hierba, pétalos y hojas volando. La cámara se acerca despacio. | 24,6–29,6 «Antes de irse, escondió tres llaves.» |
| shrine | 30 – 36,667 | meadow | Pequeño santuario de piedra en ruinas (columnas rotas, musgo, lianas) en un islote. En el centro flota una **llave dorada luminosa** que gira despacio, con un haz de luz y motas. Travelling lento hacia la llave. | 31,6–36,3 «Quien las encuentre… lo heredará todo.» |
| flyby | 36,667 – 40 | flight | El planeador pasa rozando la cámara de derecha a izquierda con la bufanda ondeando; barrido de cámara siguiéndolo; islas y nubes detrás con velocidad. | — |
| chase | 40 – 43,333 | flight | Detrás del planeador, zigzagueando entre islas y pasando junto a una cascada. Mucho paralaje. | — |
| whale | 43,333 – 46,667 | flight | Una **ballena del cielo** colosal y apacible emerge del mar de nubes junto al planeador diminuto. Islitas con árboles sobre su lomo, pájaros alrededor. Asombro. | — |
| airship | 46,667 – 50 | flight | El cielo se vuelve tormentoso. Desde nubes oscuras asoma la panza de un **dirigible de hierro** inmenso, con luces rojas y hélices; su sombra barre las nubes. Solo se insinúa (niebla, silueta). | 47,4–49,85 «No es la única que las busca.» |
| dive | 50 – 53,333 | flight | Clímax: el planeador se lanza en picado hacia un estallido de sol dorado entre las nubes, con líneas de velocidad y luz. Acaba en blanco (`flash` → 1 en los últimos 0,4 s). | — |
| title | 53,333 – 60 | nubaria | Panorama de Nubaria al atardecer, en calma (empieza con `flash` 1→0 en ~1 s). El título (雲, «KUMO», «MÁS ALLÁ DE LA LLUVIA»), el lema y «PRÓXIMAMENTE» son texto HTML centrado (54,0–59,1): deja el centro del cielo limpio y algo más oscuro para que se lean. Fundido a negro al final (`fade` de 59,1 a 60). | (título HTML) |

## 4. La protagonista y su API (`src/characters/girl.js`)

La ficha de diseño está en `engine/style.js` (`GIRL`, `CAT`, `GLIDER`). Funciones:
- `drawGirlSittingBack(g, t, { x, y, size, look, hood })`: de espaldas en el tejado. Ancla en la cadera; `size` es la altura de pie.
- `drawCat(g, t, { x, y, size, facing, look })`: gato negro sentado. Ancla en las patas.
- `drawGirlFace(g, t, { x, y, size, goggles, power, hood, look, glow })`: primer plano frontal. Ancla entre los ojos; `size` es la altura de la cara con el pelo.
- `drawGirlStandingBack(g, t, { x, y, size, wind, windDir })`: de pie de espaldas, exploradora. Ancla en los pies.
- `drawGliderRider(g, t, { x, y, size, view, bank, dir, glow })`: planeador con la chica. Ancla en el centro del ala; `size` es la envergadura; `view` es `'back' | 'side' | 'front' | 'below'`.
