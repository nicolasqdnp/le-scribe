# Vérification de la livraison (sur le MP4 final, pas sur les sources)

| Contrôle | Résultat |
|---|---|
| Format | 1080×1920, 60 fps constant, 1800 images, 30,000 s, H.264 High yuv420p BT.709, AAC 268 kb/s, 69 Mo |
| Sonie (EBU R128, mesurée par ffmpeg sur l'AAC) | **−14,0 LUFS intégrés**, crête vraie −4,6 dBTP (≤ −1), LRA 1,8 LU |
| Synchro image/son | 26 cues mesurables sur 30 : la première image modifiée tombe **exactement** sur l'image de la cue ; attaque audio décalée de +11 ms en moyenne (biais du détecteur grave), pire cas 12 ms (< 1 image = 16,7 ms). Corrélation croisée globale : pic à 0 image. |
| Zone sûre Instagram (x 120–960, y 270–1248) | 0 dépassement sur 1800 images pour tout texte lisible, logo, cartes et bouton (hors transitions d'entrée/sortie < 0,25 s et éclats du « shatter ») |
| Légendes | 31 légendes de 2 à 3 mots ; la dernière (« TES QUESTIONS ONT DES RÉPONSES », 5 mots) est une demande explicite hors règle |
| Photosensibilité | ≤ 2 flashs / s glissante (limite 3) |
| Silence numérique | 3,5–4,0 s (coupure) et 23,9–24,0 s (souffle) : zéro absolu |

Les 4 cues non mesurables : première image (rien à comparer), 2 fondus (handle, CTA) et l'impact de 2,0 s noyé dans le bruit de la montée.
