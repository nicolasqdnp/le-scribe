# @quoidneufpasteur — motion design 30 s (1080×1920, 60 fps)

Tout est en code : aucune vidéo, image ou musique importée (seules les 5 polices libres de `assets/fonts` sont embarquées).

```
src/timeline.js   ← LA timeline unique : BPM, sections, légendes, cues (impacts, kicks, pops…), partition
src/film.js       ← image : state(t) est une fonction pure du temps (lit la timeline)
src/audio.js      ← son : synthèse Web Audio hors-ligne (lit les MÊMES cues + la partition)
src/gfx.js        ← WebGL2 HDR : fond procédural, sprites 3D, particules, flou de mouvement,
                    bloom + traînée anamorphique, aberration chromatique, grain, dither
src/text.js, art.js ← typographie lettre par lettre (Canvas 2D → textures), logo, cartes, bouton
src/loudness.mjs  ← BS.1770-4 : LUFS, crête vraie, limiteur, normalisation −14 LUFS
tools/            ← build-audio, render (Playwright → ffmpeg), mux, safe, verify, still, sheet
```

## Pipeline
```
npm i && node tools/build-audio.mjs   # musique + bruitages → build/audio.wav (−14 LUFS, ≤ −1 dBTP)
node tools/render.mjs --workers=3     # 1800 images → build/video.mp4 (≈ 1 h en WebGL logiciel)
node tools/mux.mjs                    # → build/final.mp4
node tools/safe.mjs                   # zone sûre Instagram + règle « 2 à 3 mots » (sans rendu)
node tools/verify.mjs                 # conteneur, sonie, synchro, photosensibilité, planches contact
node tools/still.mjs 0 240 1500 && node tools/sheet.mjs out.png 3 0 240 1500   # inspecter des images
```

## Une seule timeline
60 temps à 120 BPM : 1 temps = 0,5 s = 30 images = 24 000 échantillons. `film.js` et `audio.js`
importent le même `timeline.js` ; une cue (`boom`, `hit`, `pop`, `kick`…) déclenche le son à
l'échantillon près et l'éclair / le slam / la secousse à l'image près. Le rendu d'une image est
indépendant des autres (pas d'état), donc identique quel que soit le nombre de workers.

## Flou de mouvement
Obturateur 180° centré sur l'intervalle d'affichage de l'image : 1 à 16 sous-images accumulées en
HDR linéaire, le nombre étant estimé image par image d'après le déplacement réel à l'écran.
