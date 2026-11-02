# Verification

Browser verification used the production `index.html`, `app.js`, libraries, model and pattern without modifications. `tests/prepare.py` generates an isolated HTML copy with a fake-camera bootstrap. The bootstrap returns a real canvas MediaStream to AR.js through getUserMedia. ARToolkit then detects the supplied pattern in the video, so marker events are produced by the detector rather than simulated DOM events. Test-only files are outside `dist` and are excluded from the deployed static assets.

Observed passing paths:

- Automatic start with no start button; camera video playback; local calibration and marker loading.
- Real ARToolkit detection of the 16×16 marker reconstruction, model loading and visible yellow mesh rendering.
- Removing the synthetic marker hides the mesh and restores the scanning state; restoring it displays the mesh again.
- Scale increase displays 125%; reset returns 100%; rotation control runs without JavaScript errors.
- Help dialog opens and closes; printable marker is linked.
- Rejected getUserMedia produces the camera error panel and retry button.
- Node syntax checks pass. Original glTF, BIN and pattern have identical SHA-256 digests to the supplied assets. Buffer ranges and all 17,136 indices are valid: 7,482 vertices, 5,712 triangles.

Library warnings about deprecated Three.js lighting and AR.js markersAreaEnabled are upstream messages. The tested final application has no application JavaScript errors.

Physical phone camera tracking, real permission prompts, iOS autoplay restrictions, printed-marker distance/lighting, and real-world pose accuracy have not been tested. The assumed marker interior ratio is 0.5; only the pattern data was supplied, so the original printed border ratio cannot be recovered. Use the original image if available and match its ratio in `index.html`.

To repeat locally:

```sh
python3 tests/prepare.py
python3 -m http.server 8081 --bind 127.0.0.1
```

Open `http://localhost:8081/test-results/`, or append `?camera=denied` for the failure path.
