/* Isolated test input; never imported by the served Hiro camera page. */
(() => {
  const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 960;
  const context = canvas.getContext('2d');
  const image = new Image(); image.src = '/dist/hiro-test/assets/hiro.png';
  let visible = true;
  setInterval(() => {
    context.fillStyle = '#fff'; context.fillRect(0,0,1280,960);
    if (visible && image.complete && image.naturalWidth) context.drawImage(image,480,320,320,320);
  }, 1000/30);
  navigator.mediaDevices.enumerateDevices = async () => [{kind:'videoinput',deviceId:'hiro-fixture',label:'Synthetic Hiro'}];
  navigator.mediaDevices.getUserMedia = async () => { await image.decode(); return canvas.captureStream(30); };
  addEventListener('DOMContentLoaded', () => {
    const button = document.createElement('button'); button.textContent = 'TEST: hide Hiro';
    button.style.cssText = 'position:fixed;top:130px;left:16px;z-index:100;background:white;color:black;padding:8px';
    button.onclick = () => { visible = !visible; button.textContent = visible ? 'TEST: hide Hiro' : 'TEST: show Hiro'; };
    document.body.append(button);
  });
})();
