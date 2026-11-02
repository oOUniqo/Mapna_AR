/* Development fixture only: feed the reconstructed marker into the real webcam pipeline. */
(() => {
  const canvas = document.createElement('canvas');
  canvas.width = 1280; canvas.height = new URLSearchParams(location.search).get('aspect') === 'wide' ? 720 : 960;
  const ctx = canvas.getContext('2d');
  const marker = new Image();
  marker.src = '/dist/assets/marker/marker-black.svg';
  const modelFailure = new URLSearchParams(location.search).get('model');
  const trackingFailure = new URLSearchParams(location.search).get('tracking');
  if (modelFailure || trackingFailure) {
    const realFetch = window.fetch.bind(window);
    window.fetch = (input, options) => {
      if (trackingFailure === 'pattern404' && String(input).includes('.patt')) return Promise.resolve(new Response('Missing', {status:404}));
      if (trackingFailure === 'calibration404' && String(input).includes('camera_para.dat')) return Promise.resolve(new Response('Missing', {status:404}));
      if (trackingFailure === 'patternHTML' && String(input).includes('.patt')) return Promise.resolve(new Response('<!doctype html><html>Fallback</html>', {status:200}));
      if (String(input).includes('MW35018A.glb')) {
        if (modelFailure === '404') return Promise.resolve(new Response('Missing', {status:404}));
        if (modelFailure === 'html') return Promise.resolve(new Response('<!doctype html><html>Fallback page</html>', {status:200}));
      }
      return realFetch(input, options);
    };
  }
  let visible = new URLSearchParams(location.search).get('initial') !== 'hidden';
  const draw = () => {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (visible && marker.complete && marker.naturalWidth) ctx.drawImage(marker, (canvas.width-320)/2, (canvas.height-320)/2, 320, 320);
  };
  setInterval(draw, 1000 / 30);
  navigator.mediaDevices.enumerateDevices = async () => [{kind:'videoinput', deviceId:'test-camera', label:'Synthetic marker'}];
  navigator.mediaDevices.getUserMedia = async () => {
    if (new URLSearchParams(location.search).get('camera') === 'denied') throw new DOMException('Denied by test fixture', 'NotAllowedError');
    await marker.decode(); draw();
    return canvas.captureStream(30);
  };
  addEventListener('DOMContentLoaded', () => {
    const button = document.createElement('button');
    button.id = 'test-toggle-marker'; button.textContent = visible ? 'TEST: hide marker' : 'TEST: show marker';
    button.style.cssText = 'position:fixed;top:85px;left:20px;z-index:100;background:white;color:black;padding:8px';
    button.onclick = () => { visible = !visible; button.textContent = visible ? 'TEST: hide marker' : 'TEST: show marker'; };
    document.body.append(button);
  });
})();
