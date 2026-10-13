# Tráiler de *Kumo: Más allá de la lluvia*

Tráiler de 60 s (1080p, 24 fps), pintado y animado al 100 % con código: fondos de gouache sobre lienzo 2D, personajes en acetato y un postprocesado WebGL con bloom, rayos de sol, grano y fundidos. La banda sonora (piano, cuerdas, flauta, coro, arpa, celesta, metales, percusión, lluvia y viento) se sintetiza en código y se renderiza a un búfer que suena igual en la web y en el MP4. No usa imágenes ni sonidos externos.

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

La versión publicada en la web es la misma página con three.js cargado desde jsDelivr (`three@0.170.0`) en vez de `vendor/`. Al abrirla pinta todos los fondos antes de reproducir (puede tardar un minuto).

## Estructura

| Carpeta | Contenido |
|---|---|
| `src/engine/` | Escenario multiplano, pinceles (`paint.js`), guía de estilo y paletas (`style.js`) |
| `src/scenes/` | Un módulo por mundo: `town` (pueblo y tejado), `goggles` (gafas y túnel), `nubaria` (revelación y título), `meadow` (acantilado y santuario), `flight` (pasada, persecución, ballena, dirigible y picado) |
| `src/characters/` | La protagonista, el gato y el planeador, dibujados con trazos vectoriales |
| `src/audio/` | Partitura y sintetizadores |
| `src/lab/` | Laboratorios para probar piezas sueltas (`?capture&lab=<nombre>`) |
| `tools/` | Servidor, capturas, hoja de contactos, audio y render final |
