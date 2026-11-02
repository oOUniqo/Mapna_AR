# IIS tracking-asset failure

Direct public-resource diagnostics against https://185.81.99.32:3193:

- `/` → HTTP 200, page requests `assets/marker/mogs-white-background.patt` and `vendor/camera_para.dat`.
- `/assets/marker/mogs-white-background.patt` → HTTP 404, HTML IIS error page (1245 bytes).
- `/vendor/camera_para.dat` → HTTP 404, HTML IIS error page (1245 bytes).
- `/assets/model/MW35018A.glb?v=mobile-v2` → HTTP 200, 249720 bytes, model/gltf-binary.
- Header identifies Microsoft-IIS/10.0. These requests read public files only; certificate verification was disabled for these isolated diagnostic requests because the supplied certificate is self-signed. No browser or server trust settings were changed.

The missing tracking pattern and camera calibration prevent marker tracking independently of camera permission or GLB loading. HTTP 404 proves the resources are inaccessible at the requested URLs; it does not distinguish a missing upload from IIS MIME filtering. Both files are present in the new package, together with IIS staticContent MIME mappings. Existing custom web.config settings must be preserved when merging.

The v3 application validates pattern HTTP status and all 3072 integer samples (0..255), and calibration HTTP status and header/dimensions before starting AR.js. Missing or HTML fallback responses produce explicit errors rather than an indefinite scanning status.

Browser regressions: injected pattern 404, calibration 404 and HTML-200 pattern responses show their respective errors; with valid assets, the real detector recognizes the synthetic black marker and the GLB renders. XML syntax, expected MIME mappings, runtime paths, GLB contents and ZIP integrity passed. The live server configuration cannot be tested as fixed until the owner uploads/merges the package.

Primary IIS documentation: https://learn.microsoft.com/en-us/iis/configuration/system.webserver/staticcontent/mimemap
