# Simon 3D

Ein reaktives 3D-Simon-Game mit Three.js, WebAudio-Sounds, generativer Ambient-Musik und persistenter Highscore-Liste.

## Features
- 3D-Pads mit Glossy/Glow, sanfter Kamerabewegung, Partikeln.
- Klassische Simon-Logik: Sequenz ansehen, nachklicken, Runde steigert Länge.
- Schnelle Audio-Feedbacks pro Pad, aggressiver Fehlerton.
- Generative Hintergrundmusik (pentatonisch, variierende Noten/Panning/Filter).
- Highscores mit Datum und Name (lokal gespeichert, letzter Name wird gemerkt).
- Start/Status-UI plus Namensfeld und Top-10-Highscores, responsive Glas-Optik.
- Doppelklickbares Start-Script für lokalen Start.

## Starten
```bash
./start.command
# oder manuell:
python3 -m http.server 8000
# Browser: http://localhost:8000
```
Im Spiel auf „Start“ klicken (aktiviert AudioContext).

## Bedienung
- Simon-Sequenz ansehen, dann die Pads in derselben Reihenfolge anklicken.
- Fehlversuch speichert Score (Rundenanzahl minus 1) mit Name/Datum in `localStorage`.
- Namen im Feld anpassen; letzter Eintrag wird als Default geladen.

## Dateien
- `index.html` – Canvas + UI (Start, Runde, Hinweis, Name, Highscores).
- `style.css` – Neon/Glass-Styling, Layout, Responsive.
- `main.js` – Three.js Szene, Spiel-Logik, Audio (Pad-Töne, generatives Ambient, Fehlerton), Highscores (localStorage).
- `start.command` – Lokaler Server + Browser-Open (doppelklickbar).

## Git/GitHub (falls gewünscht)
Repository initialisieren:
```bash
git init
git add .
git commit -m "Add 3D Simon game with audio and highscores"
```

Remote auf GitHub anlegen (vorher leeres Repo erstellen):
```bash
git branch -M main
git remote add origin git@github.com:<USER>/<REPO>.git
git push -u origin main
```

Updates committen/pushen:
```bash
git add .
git commit -m "Kurzbeschreibung der Änderung"
git push
```
