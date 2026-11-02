"""Generate an isolated harness using the unchanged production HTML, JS and assets.

Serve the project root on localhost:8081; open /test-results/ for synthetic tracking
or /test-results/?camera=denied for the camera failure path. Never deploy this fixture.
"""
from pathlib import Path

root = Path(__file__).resolve().parent.parent
html = (root / 'dist/index.html').read_text().replace(
    '<head>',
    '<head>\n<base href="/dist/">\n<script src="/tests/fake-camera.js"></script>',
    1,
)
(root / 'test-results').mkdir(exist_ok=True)
(root / 'test-results/index.html').write_text(html)
print('Test harness ready: /test-results/ (serve the project root)')
