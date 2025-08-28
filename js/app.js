document.addEventListener('DOMContentLoaded', () => {
  const MAX_POINTS = 50;

  // ===== Estado =====
  let points = [];
  let nextId = 1; // clave interna estable para borrar/editar

  // --- DOM refs
  const tbody       = document.getElementById('tbody');
  const chkClosed   = document.getElementById('chkClosed');
  const chkAuto     = document.getElementById('chkAuto');
  const chkSmooth   = document.getElementById('chkSmooth'); // puede no existir
  const btnAdd      = document.getElementById('btnAdd');
  const btnUndo     = document.getElementById('btnUndo');
  const btnClear    = document.getElementById('btnClear');
  const btnExport   = document.getElementById('btnExportSVG'); // puede no existir
  const countEl     = document.getElementById('count');
  const areaEl      = document.getElementById('areaOut');
  const signEl      = document.getElementById('signOut');
  const svg         = document.getElementById('view');

  // ========= Parser: acepta punto/coma, negativos, estados intermedios =========
  function parseNumFlexible(s) {
    if (s === null || s === undefined) return null;
    const str = String(s).trim();
    if (str === '' || str === '-' || str === '.' || str === ',' || str === '-.' || str === '-,') return null;
    const norm = str.replace(',', '.');
    if (!/^[-]?\d*(?:\.\d+)?$/.test(norm)) return null;
    const v = Number(norm);
    return Number.isFinite(v) ? v : null;
  }

  // ========= Geometría =========
  function shoelace(pts){
    if (!pts || pts.length < 3) return 0;
    let s = 0;
    for (let i = 0; i < pts.length; i++){
      const a = pts[i], b = pts[(i+1) % pts.length];
      s += a.x * b.y - b.x * a.y;
    }
    return 0.5 * s; // CCW positivo, CW negativo
  }

  function centroid(pts){
    if (!pts.length) return {x:0,y:0};
    let sx=0, sy=0; for (const p of pts){ sx+=p.x; sy+=p.y; }
    return {x: sx/pts.length, y: sy/pts.length};
  }

  function autoOrder(pts){
    if (pts.length < 3) return pts.slice();
    const c = centroid(pts);
    return [...pts].sort((p,q)=>
      Math.atan2(p.y-c.y,p.x-c.x) - Math.atan2(q.y-c.y,q.x-c.x)
    );
  }

  function viewport(pts,W=560,H=540,pad=24){
    if (!pts.length){
      const scale = 20;
      return {
        toScreen: (pt)=>({ x: W/2 + pt.x*scale, y: H/2 - pt.y*scale }),
        inv:      (sx,sy)=> ({ x: (sx - W/2)/scale, y: (H/2 - sy)/scale }),
        W, H, pad, scale, ox:W/2, oy:H/2
      };
    }
    const xs=pts.map(p=>p.x), ys=pts.map(p=>p.y);
    const minX=Math.min(...xs), maxX=Math.max(...xs);
    const minY=Math.min(...ys), maxY=Math.max(...ys);
    const spanX=Math.max(1e-6, maxX-minX);
    const spanY=Math.max(1e-6, maxY-minY);
    const scale=Math.min((W-2*pad)/spanX,(H-2*pad)/spanY);
    const ox=pad - minX*scale;
    const oy=H - pad + minY*scale;
    return {
      toScreen:(pt)=>({ x: ox + pt.x*scale, y: oy - pt.y*scale }),
      inv:(sx,sy)=>({ x:(sx-ox)/scale,y:(oy-sy)/scale }),
      W,H,pad,scale,ox,oy
    };
  }

  // === Catmull–Rom centrípeta (α=0.5) -> puntos muestreados para suavizar ===
  function catmullRomCentripetalSample(points, {closed=false, alpha=0.5, samples=12} = {}){
    const n = points.length;
    if (n < 4) return points.slice();

    const dist = (a,b) => Math.hypot(b.x - a.x, b.y - a.y);
    const lerp = (A,B,t) => ({ x: A.x + (B.x-A.x)*t, y: A.y + (B.y-A.y)*t });
    const get  = (i) => closed ? points[(i+n)%n] : points[Math.max(0, Math.min(n-1, i))];

    const out = [];
    const start = closed ? 0 : 1;
    const end   = closed ? n : n-2;

    for (let i = start; i < end; i++){
      const P0 = get(i-1), P1 = get(i), P2 = get(i+1), P3 = get(i+2);
      let t0 = 0;
      let t1 = t0 + Math.pow(dist(P0,P1), alpha);
      let t2 = t1 + Math.pow(dist(P1,P2), alpha);
      let t3 = t2 + Math.pow(dist(P2,P3), alpha);

      for (let s = 0; s <= samples; s++){
        const u  = t1 + (t2 - t1) * (s / samples);
        const A1 = (t1 === t0) ? P1 : lerp(P0, P1, (u - t0) / (t1 - t0));
        const A2 = (t2 === t1) ? P2 : lerp(P1, P2, (u - t1) / (t2 - t1));
        const A3 = (t3 === t2) ? P3 : lerp(P2, P3, (u - t2) / (t3 - t2));
        const B1 = (t2 === t0) ? A2 : lerp(A1, A2, (u - t0) / (t2 - t0));
        const B2 = (t3 === t1) ? A2 : lerp(A2, A3, (u - t1) / (t3 - t1));
        const C  = (t2 === t1) ? A2 : lerp(B1, B2, (u - t1) / (t2 - t1));
        if (out.length === 0 || C.x !== out[out.length-1].x || C.y !== out[out.length-1].y) out.push(C);
      }
    }
    if (closed) out.push(out[0]);
    return out;
  }

  // ========= Render tabla =========
  function renderTable(){
    const labelOfId = new Map(points.map((p, idx) => [p.id, idx + 1]));

    tbody.innerHTML='';
    points.forEach((p)=>{
      const tr=document.createElement('tr');
      tr.dataset.pid = String(p.id); // clave para borrar por id

      // Nº compacto
      const tdIdx=document.createElement('td'); 
      tdIdx.textContent=String(labelOfId.get(p.id));
      tr.appendChild(tdIdx);

      // X
      const tdX=document.createElement('td');
      const inX = document.createElement('input');
      inX.type = 'text';
      inX.inputMode = 'decimal';
      inX.value = String(p.x);
      inX.placeholder = '0,0';
      inX.addEventListener('input', () => {
        const v = parseNumFlexible(inX.value);
        if (v === null) { inX.classList.add('invalid'); return; }
        inX.classList.remove('invalid');
        p.x = v;
      });
      inX.addEventListener('blur', () => {
        const v = parseNumFlexible(inX.value);
        if (v !== null) inX.value = String(v);
        renderAll();
      });
      inX.addEventListener('keydown', (e) => { if (e.key === 'Enter') inX.blur(); });
      tdX.appendChild(inX); 
      tr.appendChild(tdX);

      // Y
      const tdY=document.createElement('td');
      const inY=document.createElement('input');
      inY.type='text';
      inY.inputMode = 'decimal';
      inY.value=String(p.y);
      inY.placeholder='0,0';
      inY.addEventListener('input',()=>{
        const v = parseNumFlexible(inY.value);
        if (v === null) { inY.classList.add('invalid'); return; }
        inY.classList.remove('invalid');
        p.y = v;
      });
      inY.addEventListener('blur', () => {
        const v = parseNumFlexible(inY.value);
        if (v !== null) inY.value = String(v);
        renderAll();
      });
      inY.addEventListener('keydown', (e) => { if (e.key === 'Enter') inY.blur(); });
      tdY.appendChild(inY); 
      tr.appendChild(tdY);

      // Acciones
      const tdA=document.createElement('td'); 
      tdA.className='right';
      const del=document.createElement('button'); 
      del.type='button'; del.className='btn ghost'; 
      del.textContent='Eliminar';
      del.setAttribute('data-action','del');
      tdA.appendChild(del); 
      tr.appendChild(tdA);

      tbody.appendChild(tr);
    });
  }

  // Delegación: borrar SIEMPRE por id
  tbody.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-action="del"]');
    if (!btn) return;
    const tr = btn.closest('tr');
    if (!tr) return;
    const pid = tr.dataset.pid;
    points = points.filter(pt => String(pt.id) !== pid);
    renderAll();
  });

  // ========= Render SVG + área =========
  function renderSVG(){
    const labelOfId = new Map(points.map((p, idx) => [p.id, idx + 1]));

    // Limpia el SVG
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // Puntos a usar (auto-orden si está activo)
    const used   = chkAuto.checked ? autoOrder(points) : points.slice();
    const vp     = viewport(used);
    const closed = chkClosed.checked;

    // === Construir lista de puntos del trazo (suave o poligonal) ===
    let pathPoints = used;
    if (chkSmooth && chkSmooth.checked && used.length >= 4){
      pathPoints = catmullRomCentripetalSample(used, { closed, alpha: 0.5, samples: 12 });
    }

    // === Path (único) ===
    const path = document.createElementNS(svg.namespaceURI,'path');
    path.setAttribute('fill',(closed && used.length>=3)?'rgba(0,0,0,0.06)':'none');
    path.setAttribute('stroke','#111');
    path.setAttribute('stroke-width','2');

    if(pathPoints.length){
      let d = '';
      for(let i=0;i<pathPoints.length;i++){
        const s = vp.toScreen(pathPoints[i]);
        d += (i ? ' L ' : 'M ') + s.x + ' ' + s.y;
      }
      if (closed && used.length >= 3) d += ' Z';
      path.setAttribute('d', d);
    }
    svg.appendChild(path);

    // === Puntos + etiquetas (numeración compacta) ===
    used.forEach((pt)=>{
      const s = vp.toScreen(pt);

      const c = document.createElementNS(svg.namespaceURI,'circle');
      c.setAttribute('cx', s.x);
      c.setAttribute('cy', s.y);
      c.setAttribute('r', '4');
      c.setAttribute('fill', '#111');
      svg.appendChild(c);

      const t = document.createElementNS(svg.namespaceURI,'text');
      t.setAttribute('x', s.x + 6);
      t.setAttribute('y', s.y - 6);
      t.setAttribute('font-size', '10');
      t.textContent = String(labelOfId.get(pt.id) ?? '');
      svg.appendChild(t);
    });

    // === Área con el polígono base (no suavizado) ===
    const signed = (closed && used.length>=3) ? shoelace(used) : 0;
    if (signed === 0) {
      areaEl.textContent = '0.00 cm²';
      signEl.textContent = '(signo —)';
    } else {
      areaEl.textContent = Math.abs(signed).toFixed(2) + ' cm²';
      signEl.textContent = '(signo ' + (signed>0 ? 'positivo (CCW)' : 'negativo (CW)') + ')';
    }
  }

  function renderAll(){ 
    renderTable(); 
    renderSVG(); 
    countEl.textContent=String(points.length); 
  }

  // ========= Exportar SVG (sin círculos ni etiquetas) =========
  function exportCurrentSVG(filename='poligono.svg'){
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
    if (!clone.getAttribute('width'))  clone.setAttribute('width',  svg.clientWidth || 560);
    if (!clone.getAttribute('height')) clone.setAttribute('height', svg.clientHeight || 540);

    // 🚫 quitar círculos y textos
    clone.querySelectorAll('circle, text').forEach(el => el.remove());

    const svgText = `<?xml version="1.0" encoding="UTF-8"?>\n` + clone.outerHTML;
    const blob = new Blob([svgText], {type: 'image/svg+xml;charset=utf-8'});
    const url  = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (btnExport) btnExport.addEventListener('click', () => exportCurrentSVG());
  if (chkSmooth) chkSmooth.addEventListener('change', renderAll);

  // ========= Botones =========
  btnAdd.addEventListener('click', () => {
    if (points.length < MAX_POINTS) {
      points.push({ id: nextId++, x: 0, y: 0 });
      renderAll();
    }
  });

  btnUndo.addEventListener('click',()=>{
    if (points.length > 0) points.pop();
    renderAll();
  });

  btnClear.addEventListener('click',()=>{ points=[]; renderAll(); });
  chkClosed.addEventListener('change',renderAll);
  chkAuto.addEventListener('change',renderAll);

  renderAll();
});
