/* Keep detection pixels square, then undo the detector's letterbox in projection.
   AR.js 3.4.8 otherwise stretches every source into its fixed 640 x 480 detector. */
'use strict';
AFRAME.registerComponent('camera-geometry', {
  init() {
    this.install = this.install.bind(this);
    this.el.addEventListener('renderstart', this.install);
  },
  install() {
    if (this.context) return;
    const context = this.el.systems.arjs?._arSession?.arContext;
    if (!context) return;
    this.context = context;
    this.originalProcess = context._updateArtoolkit;
    this.originalProjection = context.getProjectionMatrix;
    this.buffer = document.createElement('canvas');
    this.buffer.width = context.parameters.canvasWidth;
    this.buffer.height = context.parameters.canvasHeight;
    const ctx = this.buffer.getContext('2d', {alpha: false});
    this.fractionX = this.fractionY = 1;
    context._updateArtoolkit = (source) => {
      const width = source.videoWidth || source.naturalWidth || source.width;
      const height = source.videoHeight || source.naturalHeight || source.height;
      if (!width || !height) return;
      const scale = Math.min(this.buffer.width / width, this.buffer.height / height);
      const drawWidth = width * scale, drawHeight = height * scale;
      this.fractionX = drawWidth / this.buffer.width;
      this.fractionY = drawHeight / this.buffer.height;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, this.buffer.width, this.buffer.height);
      ctx.drawImage(source, (this.buffer.width - drawWidth) / 2, (this.buffer.height - drawHeight) / 2, drawWidth, drawHeight);
      // The buffer already has detector dimensions. Disable ARToolkit's extra
      // portrait stretch for this call, including portrait camera sources.
      const orientation = context.arController.orientation;
      context.arController.orientation = 'landscape';
      try { this.originalProcess.call(context, this.buffer); }
      finally { context.arController.orientation = orientation; }
    };
    context.getProjectionMatrix = () => {
      const projection = this.originalProjection.call(context);
      const e = projection.elements;
      // Scale complete clip-space rows, including the calibrated principal point.
      for (const index of [0, 4, 8, 12]) e[index] /= this.fractionX;
      for (const index of [1, 5, 9, 13]) e[index] /= this.fractionY;
      this.el.camera?.projectionMatrixInverse.copy(projection).invert();
      return projection;
    };
  },
  tick() { this.install(); },
  remove() {
    this.el.removeEventListener('renderstart', this.install);
    if (!this.context) return;
    this.context._updateArtoolkit = this.originalProcess;
    this.context.getProjectionMatrix = this.originalProjection;
  }
});
