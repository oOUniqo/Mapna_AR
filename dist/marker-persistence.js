/* Display a cached marker pose through brief detection gaps. The detector stays unchanged. */
'use strict';
AFRAME.registerComponent('marker-persistence', {
  schema: {
    marker: {type: 'selector'},
    holdMs: {type: 'number', default: 1500},
    ready: {type: 'boolean', default: false}
  },
  init() {
    this.seen = false;
    this.lastSeenAt = 0;
    this.phase = null;
    this.pose = new AFRAME.THREE.Matrix4();
    this.inverseParent = new AFRAME.THREE.Matrix4();
    this.setPhase('lost');
  },
  setPhase(phase) {
    if (this.phase === phase) return;
    this.phase = phase;
    this.el.setAttribute('visible', phase !== 'lost');
    this.el.dataset.trackingPhase = phase;
    this.el.emit('tracking-phase-changed', {phase});
  },
  reset() {
    this.seen = false;
    this.lastSeenAt = 0;
    this.setPhase('lost');
  },
  tick() {
    const marker = this.data.marker;
    if (!this.data.ready || !marker?.object3D) { this.reset(); return; }
    const now = performance.now();
    if (marker.object3D.visible) {
      marker.object3D.updateWorldMatrix(true, false);
      this.el.object3D.parent.updateWorldMatrix(true, false);
      this.inverseParent.copy(this.el.object3D.parent.matrixWorld).invert();
      this.pose.multiplyMatrices(this.inverseParent, marker.object3D.matrixWorld);
      this.pose.decompose(this.el.object3D.position, this.el.object3D.quaternion, this.el.object3D.scale);
      this.seen = true;
      this.lastSeenAt = now;
      this.setPhase('tracked');
    } else if (this.seen && now - this.lastSeenAt < Math.max(0, this.data.holdMs)) {
      this.setPhase('holding');
    } else {
      this.seen = false;
      this.setPhase('lost');
    }
  },
  pause() { this.reset(); },
  remove() { this.reset(); }
});
