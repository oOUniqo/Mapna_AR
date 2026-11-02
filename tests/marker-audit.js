'use strict';
(() => {
  const q = new URLSearchParams(location.search);
  const testCase = q.get('case') || 'mogs-red';
  const glare = Number(q.get('glare') || 0);
  const layout = q.get('layout') || 'aligned';
  const isHiro = testCase === 'hiro';
  const blackBorder = testCase === 'mogs-black';
  const ratio = isHiro ? 0.5 : 0.77;
  const source = document.createElement('canvas'); source.width = 1280; source.height = 720;
  const ctx = source.getContext('2d');
  const image = new Image(); image.src = isHiro ? '/dist/hiro-test/assets/hiro.png' : '/dist/assets/marker/marker-original.png';
  const markerSize = 320, markerX = 720, markerY = 170;
  function draw() {
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,1280,720);
    if (!image.complete || !image.naturalWidth) return;
    ctx.drawImage(image,markerX,markerY,markerSize,markerSize);
    if (blackBorder) {
      ctx.fillStyle = '#000'; ctx.fillRect(markerX+32,markerY+32,256,256);
      const inset = 0.1 + 0.8*(1-ratio)/2;
      ctx.drawImage(image,inset*512,inset*512,0.8*ratio*512,0.8*ratio*512,markerX+inset*markerSize,markerY+inset*markerSize,0.8*ratio*markerSize,0.8*ratio*markerSize);
    }
    if (glare) { ctx.fillStyle = `rgba(255,255,255,${glare})`; ctx.fillRect(0,0,1280,720); }
  }
  setInterval(draw,1000/30);
  navigator.mediaDevices.enumerateDevices = async () => [{kind:'videoinput',deviceId:'audit',label:'Synthetic 16:9 source'}];
  navigator.mediaDevices.getUserMedia = async () => { await image.decode(); draw(); return source.captureStream(30); };
  let scene, video, found = false, detections = 0, sample = 0, controllerReadyAt;
  const started = performance.now();
  function align() {
    if (!video || !video.videoWidth || layout !== 'aligned') return;
    scene.style.width = video.style.width; scene.style.height = video.style.height;
    scene.style.marginLeft = video.style.marginLeft; scene.style.marginTop = video.style.marginTop;
    scene.resize();
  }
  addEventListener('resize',()=>requestAnimationFrame(align));
  addEventListener('arjs-video-loaded',async e=>{
    video=e.detail.component;video.muted=true;
    if (layout === 'stock') { video.style.setProperty('position','absolute','important');scene.style.setProperty('position','relative','important'); }
    new ResizeObserver(align).observe(video);
    await video.play(); align();
  });
  AFRAME.registerComponent('audit-report',{
    tick(t){
      if(t-sample<150)return;sample=t;
      const controller=this.el.systems.arjs?._arSession?.arContext?.arController;
      const marker=document.getElementById('audit-marker');
      const r=video?.getBoundingClientRect(),c=this.el.canvas?.getBoundingClientRect();
      const rect=x=>x?{x:x.x,y:x.y,width:x.width,height:x.height}:null;
      const info={testCase,glare,layout,elapsed:Math.round(performance.now()-started),found,detections,source:video?{width:video.videoWidth,height:video.videoHeight}:null,video:rect(r),canvas:rect(c)};
      if(controller){
        controllerReadyAt ??= performance.now();
        for(const [key,method] of [['threshold','getThreshold'],['thresholdMode','getThresholdMode'],['candidates','getMarkerNum']]) if(typeof controller[method]==='function') info[key]=controller[method]();
        info.matches=[];
        if(typeof controller.getMarker==='function')for(let i=0;i<(info.candidates||0);i++){const m=controller.getMarker(i);info.matches.push({id:m.id,idPatt:m.idPatt,confidence:m.cf,cfPatt:m.cfPatt,cutoff:m.cutoffPhase});}
      }
      if(found&&r&&c){
        this.el.object3D.updateMatrixWorld(true);
        const pts=[[-.5,0,-.5],[.5,0,-.5],[.5,0,.5],[-.5,0,.5]].map(p=>{
          const v=new AFRAME.THREE.Vector3(...p).applyMatrix4(marker.object3D.matrixWorld).project(this.el.camera);
          return [c.x+(v.x+1)*c.width/2,c.y+(1-v.y)*c.height/2];
        });
        const projected=[Math.min(...pts.map(p=>p[0])),Math.min(...pts.map(p=>p[1])),Math.max(...pts.map(p=>p[0])),Math.max(...pts.map(p=>p[1]))];
        const expected=[r.x+(markerX+32)/1280*r.width,r.y+(markerY+32)/720*r.height,r.x+(markerX+288)/1280*r.width,r.y+(markerY+288)/720*r.height];
        info.projected=projected;info.expected=expected;info.maxPixelError=Math.max(...projected.map((v,i)=>Math.abs(v-expected[i])));
      }
      document.getElementById('report').textContent=JSON.stringify(info,null,2);
      document.body.dataset.ready=controller?'true':'false';document.body.dataset.found=String(found);
      document.body.dataset.settled=String(Boolean(controller && performance.now()-controllerReadyAt>1200));
    }
  });
  document.addEventListener('DOMContentLoaded',()=>{
    scene=document.createElement('a-scene');scene.setAttribute('embedded','');scene.setAttribute('vr-mode-ui','enabled:false');scene.setAttribute('device-orientation-permission-ui','enabled:false');scene.setAttribute('loading-screen','enabled:false');scene.setAttribute('audit-report','');
    scene.setAttribute('arjs',`sourceType:webcam; detectionMode:mono; patternRatio:${ratio}; canvasWidth:640; canvasHeight:480; cameraParametersUrl:/dist/vendor/camera_para.dat; debugUIEnabled:false;`);
    scene.innerHTML=`<a-marker id="audit-marker" ${isHiro?'preset="hiro"':`type="pattern" url="/dist/assets/marker/${testCase==='mogs-original'?'pattern.patt':'mogs-white-background.patt'}"`} emitevents="true"><a-box position="0 0.5 0" color="#36c5f0"></a-box><a-plane rotation="-90 0 0" position="0 0.001 0" material="color:#ff00ff;wireframe:true;side:double"></a-plane></a-marker><a-entity camera look-controls="enabled:false" wasd-controls="enabled:false"></a-entity>`;
    const marker=scene.querySelector('a-marker');marker.addEventListener('markerFound',()=>{found=true;detections++;});marker.addEventListener('markerLost',()=>{found=false;});
    document.body.append(scene);
  });
})();
