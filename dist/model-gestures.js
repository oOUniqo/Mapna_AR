/* Touch/mouse controls affect the model, never the camera or document viewport. */
(() => {
  'use strict';
  window.MOGS = window.MOGS || {};
  window.MOGS.createModelGestures = ({surface, isEnabled, getTransform, onChange}) => {
    const pointers = new Map();
    const listeners = [];
    let previous = null;
    const listen = (target, name, handler, options) => {
      target.addEventListener(name, handler, options);
      listeners.push(() => target.removeEventListener(name, handler, options));
    };
    const measure = () => {
      const points = [...pointers.values()];
      if (points.length === 1) return {count: 1, x: points[0].x};
      if (points.length !== 2) return null;
      const dx = points[1].x - points[0].x, dy = points[1].y - points[0].y;
      return {count: 2, distance: Math.hypot(dx, dy), angle: Math.atan2(dy, dx)};
    };
    const cancel = () => {
      const ids = [...pointers.keys()];
      pointers.clear();
      previous = null;
      for (const id of ids) {
        if (surface.hasPointerCapture(id)) surface.releasePointerCapture(id);
      }
    };
    listen(surface, 'pointerdown', (event) => {
      if (!isEnabled() || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault();
      pointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
      previous = measure();
      // Capture keeps a gesture continuous when a finger crosses the controls.
      try { surface.setPointerCapture(event.pointerId); } catch { /* Pointer already ended. */ }
    });
    listen(surface, 'pointermove', (event) => {
      if (!pointers.has(event.pointerId)) return;
      if (!isEnabled()) { cancel(); return; }
      event.preventDefault();
      pointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
      const next = measure();
      if (previous && next && previous.count === next.count) {
        let {scale, rotation} = getTransform();
        if (next.count === 1) rotation += (next.x - previous.x) * 0.5;
        else if (previous.distance >= 12 && next.distance >= 12) {
          scale *= next.distance / previous.distance;
          // atan2 keeps crossing +180/-180 degrees from causing a full turn.
          const delta = next.angle - previous.angle;
          rotation -= Math.atan2(Math.sin(delta), Math.cos(delta)) * 180 / Math.PI;
        }
        onChange({scale: Math.min(3, Math.max(0.25, scale)), rotation: ((rotation % 360) + 360) % 360});
      }
      previous = next;
    });
    const end = (event) => {
      if (!pointers.delete(event.pointerId)) return;
      previous = measure();
      if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
    };
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(surface, name, end);
    listen(window, 'blur', cancel);
    listen(window, 'resize', cancel);
    listen(document, 'visibilitychange', cancel);
    return {cancel, destroy() { cancel(); listeners.forEach(remove => remove()); }};
  };
})();
