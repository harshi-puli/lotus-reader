# Lotus Hand Bloom

A live MediaPipe webcam sketch that blooms a lotus over your camera feed.

## What It Does

This browser tool opens your webcam, tracks one hand with MediaPipe, and draws a glowing lotus as a transparent overlay. The lotus appears when your hand is visible and fades away when your hand leaves the camera view.

## How To Run

From this project folder, start a local web server:

```bash
python3 -m http.server 5173
```

Then open:

```text
http://localhost:5173
```

Allow camera access when the browser asks. The app needs to run from `localhost` because browsers usually block webcam access from plain local files.

## Hand Actions

| Action | Result |
| --- | --- |
| Show one hand | Creates the lotus bloom |
| Move your palm | Moves the lotus around the screen |
| Open your hand wider | Makes the lotus fuller and larger |
| Pinch thumb and index finger | Brightens the center seed glow |
| Remove your hand | Lets the lotus fade out |

## On-Screen Controls

| Control | What It Changes |
| --- | --- |
| Petals | Number of lotus petals |
| Trails | How long the drawn motion lingers |
| Glow | Brightness and softness of the bloom |

## Notes

- The app runs entirely in the browser.
- It loads MediaPipe Tasks Vision from a CDN, so an internet connection is needed the first time it loads.
- If the camera does not start, check browser camera permissions and refresh the page.
- `src/app.js` includes comments explaining the hand landmarks, gesture math, canvas drawing, and animation loop.
- `physics/lotus_spring.cpp` is a small C++ reference showing how the lotus smoothing could be modeled like a spring for TouchDesigner-style realtime work.
