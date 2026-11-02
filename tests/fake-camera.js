/* Development fixture only: feed the reconstructed marker into the real webcam pipeline. */
(() => {
  const canvas = document.createElement('canvas');
  canvas.width = 1280; canvas.height = 960;
  const ctx = canvas.getContext('2d');
  const marker = new Image();
  marker.src = '/dist/assets/marker/marker.svg';
  let visible = true;
  const draw = () => {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (visible && marker.complete && marker.naturalWidth) ctx.drawImage(marker, 480, 320, 320, 320);
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
    button.id = 'test-toggle-marker'; button.textContent = 'TEST: hide marker';
    button.style.cssText = 'position:fixed;top:85px;left:20px;z-index:100;background:white;color:black;padding:8px';
    button.onclick = () => { visible = !visible; button.textContent = visible ? 'TEST: hide marker' : 'TEST: show marker'; };
    document.body.append(button);
  });
})();
