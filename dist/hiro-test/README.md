# Isolated Hiro baseline

Open `/hiro-test/` on the same local server. This page uses AR.js's built-in `preset="hiro"` and A-Frame's `<a-box position="0 0.5 0">`. It loads neither the custom MOGS pattern nor the glTF model, and does not import or modify the main site's application code or CSS.

Tracking uses the standard 0.5 pattern ratio, no smoothing, and the existing pinned A-Frame 1.6.0 / AR.js 3.4.8 libraries. Camera calibration is local. The built-in Hiro preset loads its standard pattern from the AR.js official host, so internet access is required for that request. The supplied local Hiro PNG is the official marker image, unchanged, from `https://raw.githubusercontent.com/AR-js-org/AR.js/3.4.8/data/images/hiro.png`.

`marker.html` displays the standard marker for another device or printing. Detection and loss update the on-screen status; only the box is attached to the marker.

Validation: the actual built-in Hiro detector recognized the official marker PNG supplied through a synthetic camera MediaStream and rendered the box. Hiding and restoring the PNG produced markerLost and markerFound behavior. Browser application error logs were empty. This is not a physical camera pass. Existing application and asset files were verified by SHA-256 to remain unchanged (Finder .DS_Store metadata excluded).
