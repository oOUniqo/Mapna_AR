# Marker audit

The physical Hiro pass is user-reported. The measurements below are controlled synthetic-camera tests using the project's actual A-Frame 1.6.0 and AR.js 3.4.8 bundle, not simulated marker events. Neither the main application nor the Hiro test was changed during this audit.

## Detection

| Input | Added white veil | Detected | Square candidates | Match confidence |
| --- | ---: | --- | ---: | ---: |
| Original MOGS red border, active corrected pattern, ratio 0.77 | 0% | Yes | 1 | 0.97345 |
| Same red-border image and pattern | 12% | No | 0 | — |
| Same image/interior/pattern/ratio, border black in the test frame | 12% | Yes | 1 | 0.96987 |

White veil is a controlled photometric stress transform: I' = 0.88 I + 0.12 × 255. It demonstrates a sensitivity mechanism, not a measurement of the user's room or camera. The actual engine reported threshold 100 and manual threshold mode 0. With the red border, no square candidate survived the stress case; template matching and model rendering were not reached. The only changed variable in the last two cases was the border's color. No confidence threshold was lowered.

AR.js's generator explicitly asks for a dark border. The marker documentation recommends a black border and simple high-contrast shapes. The supplied pure red border has little brightness margin against the engine's fixed threshold, explaining why the digital-image test passed while a camera capture can fail. This is the strongest remaining lead after correcting the pattern's background, but physical camera causation has not been proved.

Pattern ratio 0.77 is supported and matches the supplied image and the user's generator setting. It is not an invalid API value. Each border side is (1−0.77)/2 = 11.5% of outer marker width, versus 25% for ratio 0.5; at the same outer size, this provides about 46% of the border thickness of a default 0.5 design. This is a robustness consideration, not a demonstrated independent failure in these tests.

The initially supplied pattern encoded transparent-background pixels as RGB zero, whereas the rendered marker image contains white background. The active corrected `mogs-white-background.patt` already addresses this. It should not be presented as an unfixed defect of the current application.

The logo contains small lettering, while the official encoder reduces the interior to 16×16 pixels in four BGR orientations. Simpler artwork is a reasonable future robustness improvement, but these measurements do not isolate lettering as the current failure's cause.

## Placement / offset

With a synthetic 1280×720 (16:9) source and a 390×844 portrait viewport, the stock AR.js layout gave:

- Camera video rectangle: x −555.219, width 1500.438, height 844.
- Render canvas rectangle: x −367.5, width 1125.328, height 844.
- Maximum projected marker-plane edge error: 81.18 CSS pixels.

The source code's portrait `copyElementSizeTo` branch forces a 4:3 width. Matching the render canvas rectangle to the actual video's rectangle reduced the edge error to 35.74 pixels. This validates a concrete layout error mechanism. The remaining error is not fixed by CSS alone and requires examining camera calibration and projection. The generic calibration file is not a calibration of the user's camera.

The box's declared position is x=0, y=0.5, z=0, with height 1. Its bottom is at marker-plane y=0; there is no intentional X/Z translation in the test. An elevated box also has normal perspective parallax relative to the marker surface. The correct diagnostic target is the projected base plane, not the center of its raised top face.

## Recommended next controlled test

Keep the existing files and 0.77 ratio. Make a separate black-border version of the supplied marker, with the same white-background interior and corrected pattern, and test it physically with a simple box. Only after that pass restore the glTF model. This changes the experimentally implicated variable without conflating marker artwork, confidence, smoothing, or model placement.

## Evidence and primary sources

- Measurements: `test-results/marker-audit.json`.
- Reproducer: serve project root on localhost:8081 and open `tests/marker-audit.html?case=mogs-red&glare=0.12`, then change case to `mogs-black`. The black border and glare exist only in test video frames; no original image asset is edited.
- https://ar-js-org.github.io/AR.js-Docs/marker-based/
- https://ar-js-org.github.io/AR.js/three.js/examples/marker-training/examples/generator.html
- https://raw.githubusercontent.com/AR-js-org/AR.js/3.4.8/three.js/examples/marker-training/threex-arpatternfile.js
- https://raw.githubusercontent.com/AR-js-org/AR.js/3.4.8/three.js/src/threex/arjs-source.js
- https://raw.githubusercontent.com/AR-js-org/AR.js/3.4.8/three.js/src/threex/arjs-context.js
- https://raw.githubusercontent.com/artoolkitx/jsartoolkit5/master/js/artoolkit.api.js
