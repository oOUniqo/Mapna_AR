'use strict';
AFRAME.registerComponent('verified-gltf-model', {
  schema: {src: {type: 'string'}},
  update() {
    this.request?.abort();
    if (!this.data.src) return;
    const request = this.request = new AbortController();
    this.loadModel(request).catch(error => {
      if (request.signal.aborted) return;
      console.error('Model loading failed:', error);
      this.el.emit('model-error', {src: this.data.src, message: error.userMessage || 'دریافت مدل قطع شد؛ اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.'});
    });
  },
  async loadModel(request) {
    const url = new URL(this.data.src, document.baseURI);
    const response = await fetch(url, {signal: request.signal, cache: 'no-cache'});
    const fail = (message) => { const error = new Error(message); error.userMessage = message; throw error; };
    if (!response.ok) fail(`دریافت فایل مدل ناموفق بود (HTTP ${response.status}). فایل MW35018A.glb باید داخل assets/model روی سرور باشد.`);
    const buffer = await response.arrayBuffer();
    if (request.signal.aborted) return;
    if (buffer.byteLength < 20) fail('فایل مدل ناقص است. بستهٔ جدید سایت را دوباره روی سرور آپلود کنید.');
    const header = new DataView(buffer);
    if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2) fail('پاسخ سرور فایل سه‌بعدی GLB نیست. مسیر assets/model/MW35018A.glb را بررسی کنید؛ ممکن است سرور به‌جای مدل، صفحهٔ HTML برگرداند.');
    if (header.getUint32(8, true) !== buffer.byteLength) fail('دانلود فایل مدل ناقص است. اتصال و آپلود کامل فایل MW35018A.glb را بررسی کنید.');
    const loader = new AFRAME.THREE.GLTFLoader();
    const gltf = await new Promise((resolve, reject) => loader.parse(buffer, '', resolve, error => {
      const failure = new Error(error?.message || 'GLB parse failed');
      failure.userMessage = 'فایل مدل دریافت شد، اما پردازش آن ناموفق بود. فایل MW35018A.glb را از بستهٔ جدید دوباره آپلود کنید.';
      reject(failure);
    }));
    if (request.signal.aborted) return;
    const model = gltf.scene || gltf.scenes[0];
    model.animations = gltf.animations;
    this.el.setObject3D('mesh', model);
    this.el.emit('model-loaded', {format: 'gltf', model});
  },
  remove() { this.request?.abort(); }
});
