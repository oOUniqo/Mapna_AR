'use strict';
(() => {
  let video;
  let found = false;
  let error = false;
  let scene;
  let resizeObserver;
  const align = () => {
    if (!video?.videoWidth || !scene) return;
    scene.style.width = video.style.width;
    scene.style.height = video.style.height;
    scene.style.marginLeft = video.style.marginLeft;
    scene.style.marginTop = video.style.marginTop;
    scene.resize();
  };
  const status = (message) => { document.getElementById('status').textContent = message; };
  const update = () => {
    if (error) return;
    document.body.dataset.tracked = String(found);
    status(found ? 'MOGS شناسایی شد؛ باکس روی مارکر است.' : 'دوربین آماده است؛ در حال جست‌وجوی MOGS…');
  };
  const play = async () => {
    try { await video.play(); document.getElementById('play-camera').hidden = true; }
    catch { document.getElementById('play-camera').hidden = false; status('برای نمایش تصویر، دکمهٔ دوربین را لمس کنید.'); }
  };
  window.addEventListener('arjs-video-loaded', (event) => {
    video = event.detail?.component;
    if (!(video instanceof HTMLVideoElement)) return;
    scene = document.querySelector('a-scene');
    resizeObserver = new ResizeObserver(align);
    resizeObserver.observe(video);
    video.muted = true;
    video.setAttribute('playsinline', '');
    video.addEventListener('playing', update);
    video.addEventListener('playing', align);
    play();
  });
  window.addEventListener('camera-error', () => {
    error = true;
    status('دوربین در دسترس نیست؛ مجوز دوربین را بررسی کنید و صفحه را دوباره باز کنید.');
  });
  document.addEventListener('DOMContentLoaded', () => {
    const marker = document.getElementById('hiro-marker');
    marker.addEventListener('markerFound', () => { found = true; update(); });
    marker.addEventListener('markerLost', () => { found = false; update(); });
    document.getElementById('play-camera').addEventListener('click', play);
    if (!window.isSecureContext) { error = true; status('دسترسی به دوربین به HTTPS یا localhost نیاز دارد.'); }
  });
  window.addEventListener('resize', () => requestAnimationFrame(align));
  window.addEventListener('pagehide', () => { resizeObserver?.disconnect(); video?.srcObject?.getTracks().forEach(track => track.stop()); });
  window.addEventListener('pageshow', (event) => { if (event.persisted) location.reload(); });
})();
