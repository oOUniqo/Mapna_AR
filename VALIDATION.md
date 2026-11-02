# Verification

Browser verification used the production `index.html`, `app.js`, libraries, model and pattern without modifications. `tests/prepare.py` generates an isolated HTML copy with a fake-camera bootstrap. The bootstrap returns a real canvas MediaStream to AR.js through getUserMedia. ARToolkit then detects the supplied pattern in the video, so marker events are produced by the detector rather than simulated DOM events. Test-only files are outside `dist` and are excluded from the deployed static assets.

Observed passing paths:

- Automatic start with no start button; camera video playback; local calibration and marker loading.
- Real ARToolkit detection of the 16×16 marker reconstruction, model loading and visible yellow mesh rendering.
- Removing the synthetic marker hides the mesh and restores the scanning state; restoring it displays the mesh again.
- Scale increase displays 125%; reset returns 100%; rotation control runs without JavaScript errors.
- Help dialog opens and closes; printable marker is linked.
- Rejected getUserMedia produces the camera error panel and retry button.
- Portrait layout checked at 390×844. The camera video and render canvas have matching DOM rectangles: x=-367.664, y=0, width=1125.328, height=844; the disc renders with its circular proportions after correcting viewport-based canvas stretching.
- Node syntax checks pass. Original glTF, BIN and pattern have identical SHA-256 digests to the supplied assets. Buffer ranges and all 17,136 indices are valid: 7,482 vertices, 5,712 triangles.

Library warnings about deprecated Three.js lighting and AR.js markersAreaEnabled are upstream messages. The tested final application has no application JavaScript errors.

Physical phone camera tracking, real permission prompts, iOS autoplay restrictions, printed-marker distance/lighting, and real-world pose accuracy have not been tested. The assumed marker interior ratio is 0.5; only the pattern data was supplied, so the original printed border ratio cannot be recovered. Use the original image if available and match its ratio in `index.html`.

To repeat locally:

```sh
python3 tests/prepare.py
python3 -m http.server 8081 --bind 127.0.0.1
```

Open `http://localhost:8081/test-results/`, or append `?camera=denied` for the failure path.

## Original-marker correction

The user subsequently supplied the original 512×512 marker PNG and confirmed generator settings: patternRatio 0.77, red border. Pixel edges agree: outer border nominally x=51.2..460.8 and interior x=98.304..413.696. The original pattern has zero RGB background samples while the PNG interior has white background samples. The active pattern is re-encoded from the PNG interior using the official AR.js encoder convention (browser Canvas, 16×16, four counterclockwise orientations, BGR channel order); the supplied original pattern remains unchanged.

Controlled before/after verification used exactly this original PNG as the synthetic camera input. Before (0.5 / supplied pattern), it remained in scanning state. After (0.77 / white-background pattern), ARToolkit detected it and the yellow mesh rendered. Application error logs were empty. Screenshot: `test-results/original-marker-fixed.png`. This verifies the provided image through the real detector; it does not establish physical camera robustness under the user's lighting and distance. The supplied company logo is shown in the header and used as favicon.

## Marker loss grace period

The real synthetic-camera path was used for these checks: no model before first detection (visible=false); first recognition; marker removed and render root remains visible in holding phase; expiration hides it (visible=false); reacquisition during the grace interval restores tracked phase with visible=true; selecting zero removes the delay and hides on loss. Application error logs were empty. Screenshot `test-results/marker-hold.png` shows the actual model held over a blank camera frame, with the holding-state status. The detector and match-confidence settings were not relaxed. Default 1500 ms, configurable through the part card. Physical comfort/pose behavior during camera movement remains a device/user test.
