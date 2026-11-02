/* Run against `python3 tests/prepare.py` and a project-root server on :8081.
   PLAYWRIGHT_MODULE may point to a shared Playwright installation. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const results = [];
(async () => {
  const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
  try {
    for (const aspect of ['standard', 'wide', 'portrait']) {
      const page = await browser.newPage({viewport: {width: 390, height: 844}});
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(`http://127.0.0.1:8081/test-results/?gestures=1&aspect=${aspect}`);
      await page.waitForFunction(() => document.body.dataset.state === 'tracked' && document.body.dataset.gestureTests === 'passed', null, {timeout: 30000});
      const geometry = await page.evaluate(() => {
        const scene = document.querySelector('a-scene'), video = document.querySelector('video'), p = scene.camera.projectionMatrix.elements;
        const ratio = Math.abs(p[0] / p[5]) * scene.canvas.clientWidth / scene.canvas.clientHeight;
        const rect = el => {const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height];};
        return {ratio, video: rect(video), canvas: rect(scene.canvas), source: [video.videoWidth, video.videoHeight], scale: document.querySelector('#tracked-part').object3D.scale.toArray(), overflow: document.documentElement.scrollWidth > innerWidth};
      });
      assert.ok(Math.abs(geometry.ratio - 1) < 0.01, `${aspect}: circle projection ${geometry.ratio}`);
      geometry.video.forEach((v, i) => assert.ok(Math.abs(v - geometry.canvas[i]) < 1.1, `${aspect}: overlay coordinate ${i}`));
      assert.deepEqual(geometry.scale, [1, 1, 1]);
      assert.equal(geometry.overflow, false);
      // Real detection gaps exercise status/UI, alongside deterministic timing below.
      await page.selectOption('#tracking-hold', '500');
      await page.click('#test-toggle-marker');
      await page.waitForFunction(() => document.body.dataset.state === 'holding');
      await page.waitForFunction(() => document.body.dataset.state === 'scanning');
      await page.click('#test-toggle-marker');
      await page.waitForFunction(() => document.body.dataset.state === 'tracked');
      await page.selectOption('#tracking-hold', '60000');
      await page.selectOption('#tracking-smoothing', '300');
      await page.locator('#ambient-light').fill('0.15');
      await page.reload();
      await page.waitForFunction(() => document.body.dataset.state === 'tracked');
      assert.deepEqual(await page.evaluate(() => ({hold: document.querySelector('#tracked-part').components['marker-persistence'].data.holdMs, smooth: document.querySelector('#tracked-part').components['marker-persistence'].data.smoothingMs, light: document.querySelector('#ambient-model-light').getAttribute('light').intensity})), {hold: 60000, smooth: 300, light: 0.15});
      // Also check resizing with the same live camera stream.
      await page.setViewportSize({width: 844, height: 390});
      await page.waitForTimeout(200);
      assert.ok(await page.evaluate(() => {const s = document.querySelector('a-scene'), v = document.querySelector('video'), p = s.camera.projectionMatrix.elements; return Math.abs(Math.abs(p[0]/p[5])*s.canvas.clientWidth/s.canvas.clientHeight-1)<0.01 && Math.abs(v.clientWidth-s.canvas.clientWidth)<2;}));
      assert.deepEqual(errors, []);
      results.push({aspect, geometry, gestures: 'passed', detectionGaps: 'passed', preferences: 'passed', resize: 'passed'});
      if (aspect === 'standard') {
        await page.setViewportSize({width: 390, height: 844});
        await page.waitForTimeout(100);
        await page.screenshot({path: 'test-results/tracking-v5-mobile.png'});
        // Exercise the production pose component with a deterministic clock and
        // real THREE transforms, without involving noisy image recognition.
        const poseTests = await page.evaluate(() => {
          const prototype = Object.getPrototypeOf(document.querySelector('#tracked-part').components['marker-persistence']);
          const THREE = AFRAME.THREE, checks = [];
          const check = (name, yes) => {if (!yes) throw new Error(name); checks.push(name);};
          const originalNow = Object.getOwnPropertyDescriptor(performance, 'now');
          let now = 1000;
          Object.defineProperty(performance, 'now', {configurable: true, value: () => now});
          try {
            function fixture(smoothingMs = 180, holdMs = 5000) {
              const root = new THREE.Group(), marker = new THREE.Group(), object3D = new THREE.Group();
              root.add(marker, object3D); marker.position.z = -3;
              const instance = Object.create(prototype);
              instance.data = {marker: {object3D: marker}, holdMs, smoothingMs, ready: true};
              instance.el = {object3D, dataset: {}, setAttribute: (key, value) => {if (key === 'visible') object3D.visible = value;}, emit() {}};
              instance.init(); instance.tick();
              return {instance, marker, object3D};
            }
            const {instance: c, marker, object3D: object} = fixture();
            check('first acquisition snaps to detected pose', object.position.z === -3);
            marker.position.x = 1; marker.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
            now += 30; c.tick();
            check('motion is smoothed', object.position.x > 0 && object.position.x < 1);
            check('rotation remains normalized and scale stays rigid', Math.abs(object.quaternion.length()-1)<1e-10 && object.scale.equals(new THREE.Vector3(1,1,1)));
            now += 970; c.tick();
            check('pose converges after movement', object.position.x > 0.99);
            const frozen = object.position.clone(); marker.visible = false; now += 10; c.tick();
            check('hold freezes exact displayed pose', c.phase === 'holding' && object.position.equals(frozen));
            marker.visible = true; marker.position.x = 2; now += 20; c.tick();
            check('brief reacquisition blends without teleport', object.position.x > frozen.x && object.position.x < 2);
            for (const hold of [0,500,1500,3000,5000,8000,10000,15000,30000,60000]) {
              const f = fixture(180, hold); f.marker.visible = false;
              now += Math.max(0, hold - 1); f.instance.tick();
              check(`hold ${hold} before expiry`, hold === 0 ? f.instance.phase === 'lost' : f.instance.phase === 'holding');
              now += 2; f.instance.tick();
              check(`hold ${hold} expires`, f.instance.phase === 'lost' && !f.object3D.visible);
              f.marker.visible = true; f.marker.position.x = 5; f.instance.tick();
              check(`hold ${hold} fresh acquisition`, f.object3D.position.x === 5);
            }
            const delayed = fixture(); delayed.marker.visible = false; now += 10; delayed.instance.tick();
            delayed.marker.visible = true; delayed.marker.position.x = 9; now += 6000; delayed.instance.tick();
            check('reacquisition after a stalled expired hold starts fresh', delayed.object3D.position.x === 9);
            const run = hz => {
              const f = fixture(); f.marker.position.x = 1;
              for (let i = 0; i < hz; i++) {now += 1000 / hz; f.instance.tick();}
              return f.object3D.position.x;
            };
            check('smoothing is independent of frame rate', Math.abs(run(30)-run(60)) < 1e-10);
            const raw = fixture(0); raw.marker.position.x = 8; now += 20; raw.instance.tick();
            check('smoothing off follows raw pose', raw.object3D.position.x === 8);
            c.reset(); check('reset clears stale pose', !c.seen && c.phase === 'lost');
            return checks;
          } finally {
            if (originalNow) Object.defineProperty(performance, 'now', originalNow);
            else delete performance.now;
          }
        });
        const pauseClearsPose = await page.evaluate(() => {
          const scene = document.querySelector('a-scene'), c = document.querySelector('#tracked-part').components['marker-persistence'];
          scene.pause(); const cleared = !c.seen && c.phase === 'lost'; scene.play(); return cleared;
        });
        assert.equal(pauseClearsPose, true);
        results.push({poseTests, pauseClearsPose});
      }
      await page.close();
    }
    fs.writeFileSync('test-results/tracking-v5.json', JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
  } finally {await browser.close();}
})().catch(e => {console.error(e); process.exitCode = 1;});
