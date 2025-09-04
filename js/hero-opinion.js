(function(){
  // --- Ajustes globales ---
  const CANVAS_MIN = 300;
  const CANVAS_MAX = 360;
  const SPACING    = 24;
  const AMP        = 16;
  const NOISE_SCL  = 0.02;
  const STEP       = 0.008;
  const FPS        = 90;
  const X_STEP     = 6;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  new p5((sk)=>{
    let t = 0;
    let parent, cw, ch;

    function computeSize(){
      parent = document.getElementById('radixArt');
      const w = parent ? parent.clientWidth : window.innerWidth;
      const h = Math.max(CANVAS_MIN, Math.min(CANVAS_MAX, Math.round(w * 0.28)));
      return [w, h];
    }

    sk.setup = function(){
      [cw, ch] = computeSize();
      const c = sk.createCanvas(cw, ch);
      c.parent('radixArt');
      sk.pixelDensity(1);
      sk.noFill();
      sk.frameRate(FPS);
      sk.colorMode(sk.HSB, 360,100,100,100);

      if (reduceMotion) sk.noLoop();

      document.addEventListener('visibilitychange', ()=>{
        if (document.hidden) sk.noLoop(); else if (!reduceMotion) sk.loop();
      }, {passive:true});
    };

    sk.draw = function(){
      sk.background(0,0,100);

      const rows = Math.ceil(ch / SPACING);
      const cols = Math.ceil(cw / SPACING);

      for (let i = 0; i <= rows; i++){
        const y = i * SPACING;
        const ruido = sk.noise(100*NOISE_SCL, i*NOISE_SCL, t*0.3);
        const hue   = (sk.map(y, 0, ch, 180, 280) + 40*ruido) % 360;
        const sat   = 50 + 40*ruido;
        const bri   = 60 + 30*ruido;
        const alp   = 15 + 45*ruido;
        sk.stroke(hue, sat, bri, alp);

        sk.beginShape();
        for (let x = 0; x <= cw; x += X_STEP){
          const n = sk.noise(x*NOISE_SCL, y*NOISE_SCL, t*0.25);
          const off = AMP * Math.sin(0.02*x + t + i*0.1) * n;
          sk.vertex(x, y + off);
        }
        sk.endShape();
      }

      for (let j = 0; j <= cols; j++){
        const x = j * SPACING;
        const ruido = sk.noise(j*NOISE_SCL, 200*NOISE_SCL, t*0.35);
        const hue   = (sk.map(x, 0, cw, 220, 140) + 40*ruido) % 360;
        const sat   = 60 + 30*ruido;
        const bri   = 60 + 30*ruido;
        const alp   = 15 + 40*ruido;
        sk.stroke(hue, sat, bri, alp);

        sk.beginShape();
        for (let y = 0; y <= ch; y += X_STEP){
          const n = sk.noise(x*NOISE_SCL, y*NOISE_SCL, t*0.2+10);
          const off = AMP * Math.cos(0.02*y + t + j*0.1) * n;
          sk.vertex(x + off, y);
        }
        sk.endShape();
      }

      t += STEP;
    };

    sk.windowResized = function(){
      const [w, h] = computeSize();
      if (w !== cw || h !== ch){
        cw = w; ch = h;
        sk.resizeCanvas(cw, ch);
      }
    };
  });
})();
