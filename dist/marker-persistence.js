/* Smooth rigid poses without averaging matrix entries or changing model scale. */
'use strict';
AFRAME.registerComponent('marker-persistence', {
  schema: {
    marker: {type: 'selector'},
    holdMs: {type: 'number', default: 5000},
    smoothingMs: {type: 'number', default: 180},
    ready: {type: 'boolean', default: false}
  },
  init() {
    this.seen = false;
    this.lastSeenAt = 0;
    this.lastTickAt = null;
    this.phase = null;
    const THREE = AFRAME.THREE;
    this.pose = new THREE.Matrix4();
    this.inverseParent = new THREE.Matrix4();
    this.targetPosition = new THREE.Vector3();
    this.targetRotation = new THREE.Quaternion();
    this.targetScale = new THREE.Vector3();
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
    this.lastTickAt = null;
    this.setPhase('lost');
  },
  tick() {
    const marker = this.data.marker;
    if (!this.data.ready || !marker?.object3D) { this.reset(); return; }
    const now = performance.now();
    const dt = this.lastTickAt === null ? 0 : Math.max(0, now - this.lastTickAt);
    this.lastTickAt = now;
    if (marker.object3D.visible) {
      marker.object3D.updateWorldMatrix(true, false);
      this.el.object3D.parent.updateWorldMatrix(true, false);
      this.inverseParent.copy(this.el.object3D.parent.matrixWorld).invert();
      this.pose.multiplyMatrices(this.inverseParent, marker.object3D.matrixWorld);
      this.pose.decompose(this.targetPosition, this.targetRotation, this.targetScale);
      const object = this.el.object3D;
      // A fresh acquisition starts at the current marker, never an obsolete pose.
      // Reacquisition during the hold blends from the frozen displayed pose.
      const holdExpired = this.phase === 'holding' && now - this.lastSeenAt >= Math.max(0, this.data.holdMs);
      if (!this.seen || holdExpired || this.data.smoothingMs <= 0) {
        object.position.copy(this.targetPosition);
        object.quaternion.copy(this.targetRotation);
      } else {
        const alpha = 1 - Math.exp(-dt / this.data.smoothingMs);
        object.position.lerp(this.targetPosition, alpha);
        object.quaternion.slerp(this.targetRotation, alpha).normalize();
      }
      // Marker coordinates are rigid. User size belongs to model-controls only.
      object.scale.set(1, 1, 1);
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
