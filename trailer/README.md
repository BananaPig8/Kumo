# Tráiler de *Kumo: Más allá de la lluvia*

Tráiler de 60 s (1080p, 24 fps). Cada plano usa como fondo la ilustración estilo Ghibli que hizo el cliente retocando ese mismo fotograma (`assets/plates/`). Lo que se mueve va recortado en capas y se anima por código encima: cámara, islas que flotan, planeador, ballena, llave, bufanda, hierba, lluvia, faro, cascadas, pájaros, hojas, estelas y destellos, con un postprocesado WebGL con rayos de sol, grano y fundidos. Los rótulos y el título son HTML animado. La banda sonora (piano, cuerdas, flauta, coro, arpa, celesta, metales, percusión, lluvia y viento) se sintetiza en código y se renderiza a un búfer que suena igual en la web y en el MP4.

La versión anterior, pintada entera por código, sigue disponible con `?procedural`.

- Dirección de arte, montaje y contrato técnico: `docs/brief.md`.
- Estilo aprobado: `docs/estilo.png`.

## Verlo y renderizarlo

```bash
cd trailer && npm install
node tools/server.mjs 8080               # reproductor en http://127.0.0.1:8080/
node tools/still.mjs 20 26.5             # fotogramas sueltos en out/stills/
node tools/sheet.mjs                     # hoja de contactos de todos los planos
node tools/audio.mjs                     # música en out/score.wav con niveles y espectrograma
node tools/render.mjs --workers 2        # vídeo final en out/kumo-trailer.mp4
```

La versión publicada en la web es la misma página con three.js cargado desde jsDelivr (`three@0.170.0`) en vez de `vendor/`. Al abrirla carga los fondos antes de reproducir (unos segundos).

## Estructura

| Carpeta | Contenido |
|---|---|
| `src/engine/` | Escenario multiplano, pinceles (`paint.js`), guía de estilo y paletas (`style.js`) |
| `src/scenes/plates.js` | Los 13 planos sobre las ilustraciones del cliente (`plates/meta.js`: cajas de las capas recortadas) |
| `assets/plates/` | Fondos (sin las capas que se mueven ni el texto pintado) y capas recortadas, en WebP |
| `tools/plates/` | Preparación de los fondos: `masks.py` (máscaras SAM locales con rembg) y `prep.py` (recortes, rellenos y borrado de texto); las ilustraciones originales van en `out/refs/` |
| `src/scenes/*` (resto) | Versión pintada por código (`?procedural`): `town`, `goggles`, `nubaria`, `meadow`, `flight` |
| `src/characters/` | La protagonista, el gato y el planeador, dibujados con trazos vectoriales |
| `src/audio/` | Partitura y sintetizadores |
| `src/lab/` | Laboratorios para probar piezas sueltas (`?capture&lab=<nombre>`) |
| `tools/` | Servidor, capturas, hoja de contactos, audio y render final |
