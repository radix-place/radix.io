(function(){
  const canvas = document.getElementById('perlinWave');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');

  // Paleta (claro / oscuro)
  const lightTop = '#0a7f55';   // verde Radix
  const lightBottom = '#f5fbf8';// --paper-soft
  const darkTop = '#0f6a4a';
  const darkBottom = '#0b0f0f';

  const mqDark = window.matchMedia('(prefers-color-scheme: dark)');
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  const waveSpeed = 0.004;
  const waveAmplitude = 60;
  const grad = [1, -1];

  function fade(t){ return t * (2 - t) * Math.sin(Math.PI * t / 2); }
  function lerp(a,b,t){ return a + t*(b - a); }

  function perlin1D(x, seed=0, octaves=4, persistence=0.5){
    let total=0, frequency=1, amplitude=1, maxValue=0;
    for(let i=0;i<octaves;i++){
      const xi = Math.floor(x*frequency);
      const xf = x*frequency - xi;
      const left  = grad[(xi+seed)%grad.length];
      const right = grad[(xi+1+seed)%grad.length];
      const dotL = left*xf, dotR = right*(xf-1);
      const value = lerp(dotL, dotR, fade(xf));
      total += value*amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }
    return total / maxValue;
  }

  function resize(){
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssW = canvas.clientWidth || window.innerWidth;
    const cssH = parseInt(getComputedStyle(canvas).height,10) || 80;
    canvas.width  = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  let t = 0, rafId = null;
  function drawFrame(){
    const w = canvas.width / (window.devicePixelRatio||1);
    const h = canvas.height / (window.devicePixelRatio||1);
    ctx.clearRect(0,0,w,h);

    ctx.beginPath();
    ctx.moveTo(0, h);
    const seed = 42;
    for(let x=0; x<=w; x++){
      const base   = perlin1D(x*0.008 + t, seed, 5, 0.5);
      const detail = perlin1D(x*0.02  + t*1.5, seed+100, 3, 0.6);
      const combined = 0.6*base + 0.4*detail;
      const y = (h*0.75) + (waveAmplitude * combined) * (h/80);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w,h); ctx.lineTo(0,h); ctx.closePath();

    const top = mqDark.matches ? darkTop : lightTop;
    const bottom = mqDark.matches ? darkBottom : lightBottom;
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  function animate(){
    t += waveSpeed;
    drawFrame();
    rafId = requestAnimationFrame(animate);
  }

  function start(){
    cancel(); resize();
    if(mqReduce.matches){
      t = 0; drawFrame();
    }else{
      animate();
    }
  }
  function cancel(){ if(rafId){ cancelAnimationFrame(rafId); rafId=null; } }

  window.addEventListener('resize', ()=>{ resize(); if(mqReduce.matches){ drawFrame(); }});
  document.addEventListener('visibilitychange', ()=>{ 
    if(document.hidden) cancel(); else start();
  });
  mqDark.addEventListener?.('change', ()=>{ drawFrame(); });
  mqReduce.addEventListener?.('change', start);

  requestAnimationFrame(start);
})();
