# 📹 Génération des vidéos PoC (Playwright)

Chaque finding a une vidéo de démonstration au format Wordfence (MP4 H.264, 1920x1080, 36-41s).
Les vidéos générées dans cet environnement de test sont disponibles dans `videos/` après exécution.

## Structure chronométrée (exigée par Wordfence)
- `0:00-0:07` — Titre : plugin, version, classe de vulnérabilité, auth requise
- `0:07-0:25` — État AVANT : contexte (compte admin banni, inscription publique, page plugin)
- `0:25-0:55` — Exploitation EN DIRECT (requêtes réelles, réponses réelles affichées en overlay)
- `0:55-1:05` — Preuve de l'IMPACT (compte créé depuis IP bannie / log lu sans auth / shell exécuté)
- `1:05-fin` — Contrôle négatif / root-cause explicative

## Générer les vidéos

```bash
# 1. Environnement de test actif (voir scripts/setup-dynamic-env.sh)
#    Prérequis vidéo 2 : admin a configuré Block IPs = 127.0.0.1 dans Ultimate Member > Settings > Access
# 2. Dépendances
cd poc-videos
npm install
npx playwright install chromium
# 3. Génération (les webm sortent dans videos/)
npm run all        # ou npm run video1, video2...
# 4. Conversion MP4 (H.264 + faststart pour la soumission)
ffmpeg -y -i videos/poc-1-*.webm -c:v libx264 -pix_fmt yuv420p -an -movflags +faststart poc-1-ur-mail-logs.mp4
# (répéter pour les 4)
```

## Notes d'environnement sandbox (si exécution dans un conteneur sans root)
Chromium exige des libs système ; si `launch()` échoue avec `loading shared libraries`, extraire les libs en user-space :
- télécharger les .deb depuis deb.debian.org (pool/main/<x>/<source>/), extraire `data.tar.xz` avec python lzma, copier les `*.so*` dans un dossier
- exporter `LD_LIBRARY_PATH=<ce dossier>` avant `node`
- l'outil `scripts/setup-dynamic-env.sh` fournit le même pattern pour PHP/MariaDB sans root

## Correspondance vidéos ↔ rapports
| Vidéo | Finding | Rapport | Programme |
|---|---|---|---|
| video-1 → poc-1-ur-mail-logs.mp4 | #1 UR mail logs (Unauth) | reports/user-registration/ | Wordfence bounty |
| video-2 → poc-2-um-ip-ban-bypass.mp4 | #2 UM IP ban bypass (Unauth) | reports/ultimate-member/ | Wordfence (borderline) / WPScan |
| video-3 → poc-3-wpvivid-ssrf.mp4 | #3 WPvivid SSRF (admin) | reports/wpvivid-backup-plugin/ | WPScan |
| video-4 → poc-4-wpfm-upload-rce.mp4 | #4 WPFM upload RCE (admin) | reports/wp-file-manager/ | WPScan |
