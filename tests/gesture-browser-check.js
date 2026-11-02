/* Isolated synthetic pointer QA, loaded by the development harness only. */
addEventListener('DOMContentLoaded', () => {
  if (!new URLSearchParams(location.search).has('gestures')) return;
  const results = [];
  const report = document.createElement('output');
  report.id = 'gesture-test-result';
  report.style.cssText = 'position:fixed;top:130px;left:20px;z-index:101;background:#17221b;color:white;padding:12px;font:13px Arial;direction:ltr';
  document.body.append(report);
  report.textContent = 'Waiting for marker…';
  const timer = setInterval(() => {
    if (document.body.dataset.state !== 'tracked') return;
    clearInterval(timer);
    const stage = document.getElementById('ar-stage'), model = document.getElementById('model-controls');
    const width = document.documentElement.clientWidth, viewportScale = visualViewport.scale;
    const send = (type, id, x, y = 200, target = stage) => target.dispatchEvent(new PointerEvent(type, {pointerId: id, pointerType: 'touch', button: 0, clientX: x, clientY: y, bubbles: true, cancelable: true}));
    const check = (name, condition) => { results.push({name, passed: !!condition}); if (!condition) throw new Error(name); };
    const close = (a, b) => Math.abs(a - b) < 1e-6;
    try {
      document.getElementById('reset').click();
      send('pointerdown', 1, 100); send('pointermove', 1, 200); send('pointerup', 1, 200);
      check('one finger rotates rendered model', close(model.object3D.rotation.y, 50 * Math.PI / 180));
      document.getElementById('reset').click();
      send('pointerdown', 1, 100); send('pointerdown', 2, 200); send('pointermove', 2, 300);
      check('pinch changes model scale and UI', close(model.object3D.scale.x, 2) && document.getElementById('scale-value').value === '200%');
      send('pointerup', 2, 300); send('pointerup', 1, 100);
      document.getElementById('reset').click();
      send('pointerdown', 1, 100); send('pointerdown', 2, 200); send('pointermove', 2, 100, 300);
      check('twist rotates model', close(model.object3D.rotation.y, 270 * Math.PI / 180));
      send('pointercancel', 1, 100); send('pointercancel', 2, 100);
      document.getElementById('reset').click();
      check('reset restores scale and rotation', close(model.object3D.scale.x, 1) && close(model.object3D.rotation.y, 0));
      send('pointerdown', 1, 100, 200, document.getElementById('larger'));
      send('pointermove', 1, 300, 200, document.getElementById('larger'));
      check('controls do not initiate model gestures', close(model.object3D.rotation.y, 0));
      check('camera surface suppresses browser pinch only there', getComputedStyle(stage).touchAction === 'none');
      check('page viewport dimensions remain unchanged', width === document.documentElement.clientWidth && viewportScale === visualViewport.scale && document.documentElement.scrollWidth === width);
      const hit = document.elementFromPoint(innerWidth * 0.5, innerHeight * 0.35);
      check('camera accepts gestures through noninteractive overlay', hit === stage || stage.contains(hit));
      report.textContent = `PASS · ${results.length} gesture checks`;
      document.body.dataset.gestureTests = 'passed';
    } catch (error) {
      report.textContent = `FAIL · ${error.message}`;
      document.body.dataset.gestureTests = 'failed';
    }
    report.dataset.results = JSON.stringify(results);
  }, 100);
});
