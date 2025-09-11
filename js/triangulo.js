// triángulo.js — drop-in
(() => {
  const EPS = 1e-9;

  // === utilidades ===
  const clamp = (mn, v, mx) => Math.max(mn, Math.min(v, mx));
  const safeAcos = (x) => Math.acos(Math.min(1, Math.max(-1, x)));

  function esTriangulo(a, b, c) {
    const s = [a, b, c].sort((x, y) => x - y);
    return s[0] > 0 && s[0] + s[1] > s[2] + EPS;
  }

  function angulos(a, b, c) {
    // A opuesto a a, etc.
    const A = safeAcos((b*b + c*c - a*a) / (2*b*c)) * 180/Math.PI;
    const B = safeAcos((a*a + c*c - b*b) / (2*a*c)) * 180/Math.PI;
    const C = Math.max(0, 180 - A - B);
    return [A, B, C];
  }

  function heron(a,b,c){
    const s = (a+b+c)/2;
    return Math.max(0, Math.sqrt(Math.max(0, s*(s-a)*(s-b)*(s-c))));
  }

  function clasifLados(a,b,c){
    const eq=(x,y)=>Math.abs(x-y)<1e-7;
    if (eq(a,b) && eq(b,c)) return "equilátero";
    if (eq(a,b) || eq(b,c) || eq(a,c)) return "isósceles";
    return "escaleno";
  }
  function clasifAng(A,B,C){
    const m = Math.max(A,B,C);
    if (Math.abs(m-90)<1e-6) return "rectángulo";
    if (m>90) return "obtusángulo";
    return "acutángulo";
  }

  // === geometría canónica: base horizontal = lado mayor c ===
  function coordenadas(a, b, c) {
    // AB = c sobre eje X, A=(0,0), B=(c,0); AC=b, BC=a
    const A = [0,0];
    const B = [c,0];
    const x = (b*b + c*c - a*a)/(2*c);
    let y2 = b*b - x*x;
    if (y2 < 0 && Math.abs(y2) < 1e-9) y2 = 0;
    const y = Math.sqrt(Math.max(0,y2));
    const C = [x, y];
    return [A,B,C];
  }

  // pequeño arco para marcar el ángulo en un vértice (sin etiqueta)
  function arcoAngulo(svg, O, P, Q, r){
    const [ox,oy]=O, [px,py]=P, [qx,qy]=Q;
    const v1=[px-ox,py-oy], v2=[qx-ox,qy-oy];
    const n1=Math.hypot(...v1), n2=Math.hypot(...v2);
    if (n1<EPS || n2<EPS) return;

    const u1=[v1[0]/n1,v1[1]/n1], u2=[v2[0]/n2,v2[1]/n2];
    const a1=Math.atan2(u1[1],u1[0]), a2=Math.atan2(u2[1],u2[0]);
    let da=a2-a1;
    while (da> Math.PI) da-=2*Math.PI;
    while (da<-Math.PI) da+=2*Math.PI;

    const p1=[ox+r*Math.cos(a1),     oy+r*Math.sin(a1)];
    const p2=[ox+r*Math.cos(a1+da),  oy+r*Math.sin(a1+da)];
    const largeArc = Math.abs(da)>Math.PI ? 1 : 0;
    const sweep    = da>=0 ? 1 : 0;

    const path=document.createElementNS("http://www.w3.org/2000/svg","path");
    path.setAttribute("d",`M ${p1[0]} ${p1[1]} A ${r} ${r} 0 ${largeArc} ${sweep} ${p2[0]} ${p2[1]}`);
    path.setAttribute("fill","none");
    path.setAttribute("stroke","#888");
    path.setAttribute("stroke-width","1.2");
    path.setAttribute("vector-effect","non-scaling-stroke");
    svg.appendChild(path);
  }

  // === render principal con control de escala ===
  function render({l1, l2, l3, svgId="canvas", tablaId="tabla", extraId="extra"}) {
    const a0 = parseFloat(l1), b0 = parseFloat(l2), c0 = parseFloat(l3);
    if (![a0,b0,c0].every(v => Number.isFinite(v) && v>0)) {
      alert("Ingresa tres longitudes positivas."); return;
    }
    if (!esTriangulo(a0,b0,c0)) {
      alert("No es posible formar un triángulo con esas longitudes."); return;
    }

    // ordenar para fijar c = lado mayor (base horizontal)
    const lados = [a0,b0,c0].sort((x,y)=>x-y);
    const [a,b,c] = lados; // a ≤ b ≤ c

    // coord canónicas
    const [A,B,C] = coordenadas(a,b,c);
    const [angA,angB,angC] = angulos(a,b,c);

    // === SVG y viewBox ===
    const svg = document.getElementById(svgId);
    if (!svg) { console.warn("SVG no encontrado"); return; }
    svg.innerHTML = "";

    // límites geométricos
    const xs=[A[0],B[0],C[0]], ys=[A[1],B[1],C[1]];
    const minX=Math.min(...xs), maxX=Math.max(...xs);
    const minY=Math.min(...ys), maxY=Math.max(...ys);

    // margen proporcional a c
    const margin = 0.18 * c;

    // viewBox normalizado a la longitud del lado mayor
    const vbX = minX - margin;
    const vbY = -(maxY + margin);     // invertimos Y
    const vbW = (maxX - minX) + 2*margin || c + 2*margin;
    const vbH = (maxY - minY) + 2*margin || c + 2*margin;

    svg.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);
    svg.setAttribute("preserveAspectRatio","xMidYMid meet");

    // función de inversión Y
    const tx = ([x,y]) => [x, -y];
    const [Ax,Ay]=tx(A), [Bx,By]=tx(B), [Cx,Cy]=tx(C);

    // === tamaños visuales constantes ===
    const pxPerUnit = (() => {
      const w = svg.clientWidth || 800; // fallback
      return w / vbW;
    })();

    // Ajusta a tu gusto estos "px visuales"
    const DOT_PX   = 5;     // radio del punto
    const STROKE_PX= 20;    // grosor del triángulo
    const TEXT_PX  = 13;    // tamaño de letra
    const ARC_R_PX = 28;    // radio del arco de ángulo

    // Conversión a unidades del viewBox
    const dotR   = DOT_PX   / pxPerUnit;
    const stroke = STROKE_PX/ pxPerUnit;
    const fUser  = TEXT_PX  / pxPerUnit;
    const rArc   = ARC_R_PX / pxPerUnit;

    // triángulo
    const poly=document.createElementNS("http://www.w3.org/2000/svg","polygon");
    poly.setAttribute("points", `${Ax},${Ay} ${Bx},${By} ${Cx},${Cy}`);
    poly.setAttribute("fill","none");
    poly.setAttribute("stroke","#111");
    poly.setAttribute("stroke-width", stroke);
    poly.setAttribute("vector-effect","non-scaling-stroke");
    svg.appendChild(poly);

    // centroide en coords SVG
    const Gx = (Ax + Bx + Cx) / 3;
    const Gy = (Ay + By + Cy) / 3;

    // vértices + etiquetas (empuje hacia afuera desde el centroide)
    [["A",Ax,Ay],["B",Bx,By],["C",Cx,Cy]].forEach(([lab,x,y])=>{
      // punto
      const dot=document.createElementNS("http://www.w3.org/2000/svg","circle");
      dot.setAttribute("cx",x); dot.setAttribute("cy",y); dot.setAttribute("r",dotR);
      dot.setAttribute("fill","#111"); svg.appendChild(dot);

      // vector desde centroide al vértice
      let vx = x - Gx, vy = y - Gy;
      const n = Math.hypot(vx, vy) || 1;
      vx /= n; vy /= n;

      // offset hacia afuera (ajusta si quieres más/menos separación)
      const offset = dotR * 1.8 + stroke * 0.6;   // más cerca


      const text=document.createElementNS("http://www.w3.org/2000/svg","text");
      text.setAttribute("x", x + vx * offset);
      text.setAttribute("y", y + vy * offset);
      text.setAttribute("font-size", fUser.toString());
      text.setAttribute("fill", "#111");
      text.textContent = lab;
      svg.appendChild(text);
    });

    // arcos (∠A, ∠B, ∠C) sin texto
    arcoAngulo(svg, [Ax,Ay], [Bx,By], [Cx,Cy], rArc);
    arcoAngulo(svg, [Bx,By], [Cx,Cy], [Ax,Ay], rArc);
    arcoAngulo(svg, [Cx,Cy], [Ax,Ay], [Bx,By], rArc);

    // === tabla y extras (2 decimales) ===
    const per=a+b+c;
    const area=heron(a,b,c);
    const R = (a*b*c)/(4*(area || Infinity));
    const rIn = area/(per/2);

    const tbody = document.getElementById(tablaId);
    if (tbody) {
      tbody.innerHTML = `
        <tr><td>|AB|</td><td style="text-align:right">${c.toFixed(2)}</td></tr>
        <tr><td>|BC|</td><td style="text-align:right">${a.toFixed(2)}</td></tr>
        <tr><td>|CA|</td><td style="text-align:right">${b.toFixed(2)}</td></tr>
        <tr><td>∠A</td><td style="text-align:right">${angA.toFixed(2)}°</td></tr>
        <tr><td>∠B</td><td style="text-align:right">${angB.toFixed(2)}°</td></tr>
        <tr><td>∠C</td><td style="text-align:right">${angC.toFixed(2)}°</td></tr>
        <tr><td>A</td><td style="text-align:right">(${A[0].toFixed(2)}, ${A[1].toFixed(2)})</td></tr>
        <tr><td>B</td><td style="text-align:right">(${B[0].toFixed(2)}, ${B[1].toFixed(2)})</td></tr>
        <tr><td>C</td><td style="text-align:right">(${C[0].toFixed(2)}, ${C[1].toFixed(2)})</td></tr>
        <tr><td>Perímetro</td><td style="text-align:right">${per.toFixed(2)}</td></tr>
        <tr><td>Área</td><td style="text-align:right">${area.toFixed(2)}</td></tr>
      `;
    }

    const extra = document.getElementById(extraId);
    if (extra) {
      extra.textContent = `Tipo: ${clasifLados(a,b,c)} · ${clasifAng(angA,angB,angC)}. (Base horizontal = lado mayor c)`;
    }
  }

  // hook simple a tu HTML
  window.dibujar = function(){
    const l1 = document.getElementById("l1")?.value;
    const l2 = document.getElementById("l2")?.value;
    const l3 = document.getElementById("l3")?.value;
    render({ l1, l2, l3, svgId:"canvas", tablaId:"tabla", extraId:"extra" });
  };

  // render inicial si existen elementos
  if (document.getElementById("l1") && document.getElementById("canvas")) {
    window.dibujar();
  }
})();
