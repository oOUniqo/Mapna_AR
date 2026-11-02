/* Pinned, self-hosted A-Frame 1.6.0 + AR.js 3.4.8. No camera frames leave the browser. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const state = { camera: false, model: false, marker: false, holding: false, error: false, scale: 1, rotation: 0 };
  let scene;
  let cameraVideo;
  let startupTimer;
  let videoResizeObserver;
  let layoutRequest = 0;

  function requestCameraLayout() {
    if (layoutRequest) return;
    layoutRequest = requestAnimationFrame(() => { layoutRequest = 0; alignSceneToCamera(); });
  }

  function alignSceneToCamera() {
    if (!scene || !cameraVideo || !cameraVideo.videoWidth) return;
    // ARToolkit's projection uses the uncropped camera aspect. Match the canvas to
    // the cover-sized video, then crop both identically; viewport-sized canvases
    // squeeze the model on portrait screens.
    const width = cameraVideo.style.width;
    const height = cameraVideo.style.height;
    const sizeChanged = scene.style.width !== width || scene.style.height !== height;
    if (sizeChanged) { scene.style.width = width; scene.style.height = height; }
    if (scene.style.marginLeft !== cameraVideo.style.marginLeft) scene.style.marginLeft = cameraVideo.style.marginLeft;
    if (scene.style.marginTop !== cameraVideo.style.marginTop) scene.style.marginTop = cameraVideo.style.marginTop;
    if (sizeChanged) scene.resize();
  }

  function renderStatus() {
    if (state.error) return;
    document.body.dataset.state = state.camera && state.model && (state.marker || state.holding) ? (state.holding ? 'holding' : 'tracked') : state.camera ? 'scanning' : 'starting';
    $('status-text').textContent = !state.camera ? 'در انتظار دسترسی به دوربین…' : !state.model ? 'دوربین آماده است؛ در حال بارگذاری قطعه…' : state.marker ? 'مارکر شناسایی شد · قطعه در حال نمایش است' : state.holding ? 'مارکر موقتاً گم شده؛ نمایش آخرین موقعیت…' : 'در حال جست‌وجوی مارکر…';
    ['smaller', 'larger', 'rotate', 'reset'].forEach((id) => { $(id).disabled = !state.model; });
    $('smaller').disabled = !state.model || state.scale <= 0.25;
    $('larger').disabled = !state.model || state.scale >= 3;
  }

  function showError(title, message) {
    state.error = true;
    $('tracked-part')?.setAttribute('marker-persistence', 'ready', false);
    $('tracked-part')?.components?.['marker-persistence']?.reset();
    clearTimeout(startupTimer);
    document.body.dataset.state = 'error';
    $('error-title').textContent = title;
    $('error-message').textContent = message;
    $('error-panel').hidden = false;
    $('status-text').textContent = title;
    $('play-camera').hidden = true;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Unable to load ${src}`));
      document.head.appendChild(script);
    });
  }

  async function verifyTrackingAssets() {
    const verify = async (path, kind) => {
      const title = kind === 'pattern' ? 'فایل الگوی مارکر دریافت نشد' : 'فایل کالیبراسیون دوربین دریافت نشد';
      const fail = (message) => { const error = new Error(message); error.userTitle = title; throw error; };
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch(new URL(path, document.baseURI), {signal: controller.signal, cache: 'no-cache'});
        if (!response.ok) fail(`HTTP ${response.status} — ${path.split('?')[0]} . همهٔ فایل‌های بسته را آپلود کنید؛ روی IIS تنظیمات MIME در web.config لازم است.`);
        if (kind === 'pattern') {
          const text = await response.text();
          const values = text.trim().split(/\s+/);
          if (values.length !== 3072 || values.some(value => !/^\d+$/.test(value) || Number(value) > 255)) fail('پاسخ سرور یک فایل الگوی معتبر نیست. سرور باید خود فایل .patt را برگرداند، نه صفحهٔ HTML.');
        } else {
          const buffer = await response.arrayBuffer();
          if (buffer.byteLength < 136) fail('فایل camera_para.dat ناقص است یا سرور پاسخ اشتباه برگردانده است.');
          const view = new DataView(buffer);
          const width = view.getUint32(0, false), height = view.getUint32(4, false);
          if (!width || !height || width > 16384 || height > 16384) fail('پاسخ سرور فایل کالیبراسیون معتبر نیست. مسیر vendor/camera_para.dat را بررسی کنید.');
        }
      } catch (error) {
        if (error.userTitle) throw error;
        const failure = new Error(`ارتباط برای دریافت ${path.split('?')[0]} برقرار نشد. اتصال و دسترسی فایل روی سرور را بررسی کنید.`);
        failure.userTitle = title;
        throw failure;
      } finally { clearTimeout(timeout); }
    };
    await Promise.all([
      verify('./assets/marker/mogs-white-background.patt?v=iis-v3', 'pattern'),
      verify('./vendor/camera_para.dat?v=iis-v3', 'calibration')
    ]);
  }

  function updateTransform() {
    const holder = $('model-controls');
    if (!holder || !state.model) return;
    holder.object3D.scale.setScalar(state.scale);
    holder.object3D.rotation.y = state.rotation * Math.PI / 180;
    $('scale-value').value = `${Math.round(state.scale * 100)}%`;
    renderStatus();
  }

  function registerModelComponent() {
    AFRAME.registerComponent('fit-to-marker', {
      init() {
        this.el.addEventListener('model-loaded', () => {
          if (state.error) return;
          const model = this.el.getObject3D('mesh');
          // The supplied disc's axis is X. Rotate it onto the marker's XZ plane.
          model.rotation.z = Math.PI / 2;
          model.updateMatrixWorld(true);
          const bounds = new AFRAME.THREE.Box3().setFromObject(model);
          const size = bounds.getSize(new AFRAME.THREE.Vector3());
          if (bounds.isEmpty() || !Number.isFinite(size.length()) || size.length() === 0) {
            showError('ابعاد مدل معتبر نیست', 'فایل سه‌بعدی بارگذاری شد، اما هندسهٔ قابل نمایش ندارد.');
            return;
          }
          const center = bounds.getCenter(new AFRAME.THREE.Vector3());
          const scale = 1.25 / Math.max(size.x, size.y, size.z);
          model.scale.multiplyScalar(scale);
          model.position.set(-center.x * scale, -bounds.min.y * scale + 0.015, -center.z * scale);
          model.updateMatrixWorld(true);
          state.model = true;
          $('tracked-part').setAttribute('marker-persistence', 'ready', true);
          renderStatus();
        });
        this.el.addEventListener('model-error', (event) => {
          showError('قطعه بارگذاری نشد', event.detail?.message || 'فایل MW35018A.glb را بررسی کنید و دوباره تلاش کنید.');
        });
      }
    });
  }

  async function playCamera() {
    if (!cameraVideo) return;
    try {
      await cameraVideo.play();
      $('play-camera').hidden = true;
    } catch {
      $('play-camera').hidden = false;
      $('status-text').textContent = 'برای فعال‌شدن تصویر، دکمهٔ دوربین را لمس کنید.';
    }
  }

  window.addEventListener('arjs-video-loaded', (event) => {
    const video = event.detail?.component;
    if (!(video instanceof HTMLVideoElement)) return;
    cameraVideo = video;
    $('ar-stage').appendChild(video);
    videoResizeObserver = new ResizeObserver(requestCameraLayout);
    videoResizeObserver.observe(video);
    videoResizeObserver.observe($('ar-stage'));
    video.muted = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    const ready = () => {
      if (video.videoWidth === 0 || video.paused) return;
      state.camera = true;
      document.body.dataset.camera = 'ready';
      clearTimeout(startupTimer);
      requestCameraLayout();
      renderStatus();
    };
    video.addEventListener('playing', ready);
    video.addEventListener('loadeddata', ready);
    video.addEventListener('error', () => showError('تصویر دوربین متوقف شد', 'دوربین را در برنامه‌های دیگر ببندید و دوباره تلاش کنید.'));
    if (video.srcObject) {
      video.srcObject.getVideoTracks().forEach((track) => {
        track.addEventListener('ended', () => showError('دسترسی به دوربین قطع شد', 'اجازهٔ دسترسی به دوربین را بررسی کنید و دوباره تلاش کنید.'));
      });
    }
    playCamera();
    ready();
  });

  // AR.js 3.4.8 emits camera-error without a detail payload. Do not infer an error name.
  window.addEventListener('camera-error', () => {
    showError('دوربین در دسترس نیست', 'در تنظیمات این سایت اجازهٔ دوربین را فعال کنید، دوربین را در برنامه‌های دیگر ببندید و دوباره تلاش کنید. صفحه را در مرورگر اصلی گوشی باز کنید.');
  });

  $('retry').addEventListener('click', () => window.location.reload());
  $('play-camera').addEventListener('click', playCamera);
  $('smaller').addEventListener('click', () => { state.scale = Math.max(0.25, Math.round((state.scale - 0.25) * 100) / 100); updateTransform(); });
  $('larger').addEventListener('click', () => { state.scale = Math.min(3, Math.round((state.scale + 0.25) * 100) / 100); updateTransform(); });
  $('rotate').addEventListener('click', () => { state.rotation = (state.rotation + 45) % 360; updateTransform(); });
  $('reset').addEventListener('click', () => { state.scale = 1; state.rotation = 0; updateTransform(); });
  $('help-open').addEventListener('click', () => $('help-dialog').showModal());
  $('help-close').addEventListener('click', () => $('help-dialog').close());
  const holdOptions = new Set(['0', '500', '1500', '3000']);
  try {
    const savedHold = localStorage.getItem('mogs-marker-hold-ms');
    if (holdOptions.has(savedHold)) $('tracking-hold').value = savedHold;
  } catch { /* Storage may be unavailable in private browsing. */ }
  $('tracking-hold').addEventListener('change', () => {
    const value = $('tracking-hold').value;
    if (!holdOptions.has(value)) return;
    $('tracked-part')?.setAttribute('marker-persistence', 'holdMs', Number(value));
    try { localStorage.setItem('mogs-marker-hold-ms', value); } catch { /* Optional preference. */ }
  });
  $('help-dialog').addEventListener('click', (event) => { if (event.target === $('help-dialog')) { const r = event.target.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) event.target.close(); } });

  window.addEventListener('pagehide', () => {
    videoResizeObserver?.disconnect();
    cancelAnimationFrame(layoutRequest);
    cameraVideo?.srcObject?.getTracks().forEach((track) => track.stop());
  });
  window.addEventListener('pageshow', (event) => { if (event.persisted) window.location.reload(); });
  window.addEventListener('resize', requestCameraLayout);
  window.visualViewport?.addEventListener('resize', requestCameraLayout);
  document.addEventListener('visibilitychange', () => {
    if (!scene || !state.camera) return;
    if (document.hidden) scene.pause();
    else { scene.play(); playCamera(); }
  });

  async function start() {
    if (!window.isSecureContext) {
      showError('دوربین به اتصال امن نیاز دارد', 'این صفحه را با HTTPS باز کنید. برای آزمایش روی همین کامپیوتر می‌توانید از localhost استفاده کنید.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      showError('مرورگر از دوربین پشتیبانی نمی‌کند', 'صفحه را در نسخهٔ به‌روز Safari در آیفون یا Chrome در اندروید باز کنید.');
      return;
    }
    try {
      await verifyTrackingAssets();
      await loadScript('./vendor/aframe-1.6.0.min.js');
      await loadScript('./vendor/aframe-ar-3.4.8.js');
      await loadScript('./marker-persistence.js?v=1');
      await loadScript('./model-loader.js?v=mobile-v2');
      registerModelComponent();
      const fragment = $('scene-template').content.cloneNode(true);
      scene = fragment.querySelector('a-scene');
      const trackedPart = fragment.querySelector('#tracked-part');
      trackedPart.setAttribute('marker-persistence', `marker: #part-marker; holdMs: ${Number($('tracking-hold').value)}`);
      trackedPart.addEventListener('tracking-phase-changed', (event) => {
        state.marker = event.detail.phase === 'tracked';
        state.holding = event.detail.phase === 'holding';
        renderStatus();
      });
      $('ar-stage').appendChild(fragment);
      renderStatus();
      startupTimer = window.setTimeout(() => {
        if (!state.camera && !state.error) $('status-text').textContent = 'لطفاً پیام مجوز دوربین مرورگر را بررسی کنید.';
      }, 20000);
    } catch (error) {
      console.error(error);
      showError(error.userTitle || 'راه‌اندازی نمایش سه‌بعدی ناموفق بود', error.userTitle ? error.message : 'صفحه را دوباره بارگذاری کنید و مطمئن شوید مرورگر از WebGL پشتیبانی می‌کند.');
    }
  }
  start();
})();
