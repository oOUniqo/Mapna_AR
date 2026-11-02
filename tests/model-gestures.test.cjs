const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('dist/model-gestures.js', 'utf8');
function setup() {
  const window = new EventTarget(), document = new EventTarget(), surface = new EventTarget();
  const captured = new Set();
  surface.setPointerCapture = id => captured.add(id);
  surface.hasPointerCapture = id => captured.has(id);
  surface.releasePointerCapture = id => captured.delete(id);
  vm.runInNewContext(source, {window, document});
  let transform = {scale: 1, rotation: 0}, enabled = true;
  const controls = window.MOGS.createModelGestures({surface, isEnabled: () => enabled, getTransform: () => transform, onChange: next => { transform = next; }});
  const send = (type, id, x, y = 0) => {
    const e = new Event(type, {cancelable: true});
    Object.assign(e, {pointerId: id, clientX: x, clientY: y, pointerType: 'touch', button: 0});
    surface.dispatchEvent(e);
    return e;
  };
  return {send, controls, window, document, captured, get value() { return transform; }, set enabled(v) { enabled = v; }};
}
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
test('one finger rotates; switching between one/two fingers does not jump', () => {
  const s = setup(); s.send('pointerdown', 1, 10); s.send('pointermove', 1, 110);
  close(s.value.rotation, 50); close(s.value.scale, 1);
  s.send('pointerdown', 2, 210); close(s.value.rotation, 50);
  s.send('pointerup', 2, 210); s.send('pointermove', 1, 130);
  close(s.value.rotation, 60);
});
test('pinch scales continuously and clamps both limits without sticking', () => {
  const s = setup(); s.send('pointerdown', 1, 0); s.send('pointerdown', 2, 100);
  assert.equal(s.send('pointermove', 2, 200).defaultPrevented, true); close(s.value.scale, 2);
  s.send('pointermove', 2, 400); close(s.value.scale, 3);
  s.send('pointermove', 2, 200); close(s.value.scale, 1.5);
  s.send('pointermove', 2, 20); close(s.value.scale, 0.25);
  s.send('pointermove', 2, 40); close(s.value.scale, 0.5);
});
test('two-finger twist rotates and does not wrap-jump across 180 degrees', () => {
  const s = setup(); s.send('pointerdown', 1, 0); s.send('pointerdown', 2, 100);
  s.send('pointermove', 2, 0, 100); close(s.value.rotation, 270); close(s.value.scale, 1);
  s.send('pointermove', 2, -100, 1); const before = s.value.rotation;
  s.send('pointermove', 2, -100, -1);
  assert.ok(Math.abs(s.value.rotation - before) < 2);
});
test('cancel, visibility loss and tracking loss require a new gesture', () => {
  const s = setup(); s.send('pointerdown', 1, 0); s.send('pointercancel', 1, 0);
  s.send('pointermove', 1, 100); close(s.value.rotation, 0);
  s.send('pointerdown', 1, 0); s.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(s.captured.size, 0); s.send('pointermove', 1, 100); close(s.value.rotation, 0);
  s.send('pointerdown', 1, 0); s.enabled = false; s.send('pointermove', 1, 100);
  s.enabled = true; s.send('pointermove', 1, 200); close(s.value.rotation, 0);
});
test('three fingers suspend manipulation; releasing a finger rebases safely', () => {
  const s = setup(); s.send('pointerdown', 1, 0); s.send('pointerdown', 2, 100); s.send('pointerdown', 3, 300);
  s.send('pointermove', 2, 200); close(s.value.scale, 1);
  s.send('pointerup', 3, 300); s.send('pointermove', 2, 300); close(s.value.scale, 1.5);
});
test('disabled input and destroyed controls do nothing; coincident fingers remain finite', () => {
  const s = setup(); s.enabled = false; s.send('pointerdown', 1, 0);
  s.enabled = true; s.send('pointermove', 1, 100); close(s.value.rotation, 0);
  s.send('pointerdown', 1, 0); s.send('pointerdown', 2, 0); s.send('pointermove', 2, 100);
  close(s.value.scale, 1); s.controls.destroy(); assert.equal(s.captured.size, 0);
  s.send('pointerdown', 1, 0); s.send('pointermove', 1, 100); close(s.value.rotation, 0);
});
