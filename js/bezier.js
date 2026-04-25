const canvas = document.getElementById("canvasBezier");
const ctx = canvas.getContext("2d");

const btnAgregar = document.getElementById("agregarPunto");
const btnReiniciar = document.getElementById("reiniciar");
const btnQuitar = document.getElementById("quitarPunto");

let puntos = [];
let puntoSeleccionado = null;
let radioPunto = 9;

function iniciar() {
  puntos = [
    { x: 150, y: 400 },
    { x: 750, y: 200 }
  ];

  puntoSeleccionado = null;
  actualizarBotonQuitar();
  dibujar();
}

function agregarPuntoControl() {
  const n = puntos.length;

  const x = canvas.width / 2 + (Math.random() - 0.5) * 200;
  const y = canvas.height / 2 + (Math.random() - 0.5) * 200;

  puntos.splice(n - 1, 0, { x, y });

  actualizarBotonQuitar();
  dibujar();
}

function quitarPuntoControl() {
  if (puntos.length <= 2) return;

  puntos.splice(puntos.length - 2, 1);

  puntoSeleccionado = null;
  actualizarBotonQuitar();
  dibujar();
}

function actualizarBotonQuitar() {
  btnQuitar.disabled = puntos.length <= 2;
  btnQuitar.style.opacity = puntos.length <= 2 ? "0.4" : "1";
  btnQuitar.style.cursor = puntos.length <= 2 ? "not-allowed" : "pointer";
}

function interpolar(p1, p2, t) {
  return {
    x: (1 - t) * p1.x + t * p2.x,
    y: (1 - t) * p1.y + t * p2.y
  };
}

function deCasteljau(puntosBase, t) {
  let copia = puntosBase.map(p => ({ x: p.x, y: p.y }));

  while (copia.length > 1) {
    let nuevos = [];

    for (let i = 0; i < copia.length - 1; i++) {
      nuevos.push(interpolar(copia[i], copia[i + 1], t));
    }

    copia = nuevos;
  }

  return copia[0];
}

function dibujarCurvaBezier() {
  if (puntos.length < 2) return;

  ctx.beginPath();

  const inicio = deCasteljau(puntos, 0);
  ctx.moveTo(inicio.x, inicio.y);

  for (let t = 0; t <= 1; t += 0.005) {
    const p = deCasteljau(puntos, t);
    ctx.lineTo(p.x, p.y);
  }

  ctx.strokeStyle = "#d62828";
  ctx.lineWidth = 4;
  ctx.stroke();
}

function dibujarPoligonalControl() {
  ctx.beginPath();

  for (let i = 0; i < puntos.length; i++) {
    const p = puntos[i];

    if (i === 0) {
      ctx.moveTo(p.x, p.y);
    } else {
      ctx.lineTo(p.x, p.y);
    }
  }

  ctx.strokeStyle = "#999";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
}

function dibujarPuntos() {
  puntos.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, radioPunto, 0, Math.PI * 2);

    if (i === 0 || i === puntos.length - 1) {
      ctx.fillStyle = "#003049";
    } else {
      ctx.fillStyle = "#f77f00";
    }

    ctx.fill();

    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#222";
    ctx.font = "14px Arial";
    ctx.fillText(`P${i}`, p.x + 12, p.y - 12);
  });
}

function dibujar() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  dibujarPoligonalControl();
  dibujarCurvaBezier();
  dibujarPuntos();
}

function obtenerPosicionMouse(evento) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: evento.clientX - rect.left,
    y: evento.clientY - rect.top
  };
}

function buscarPuntoCercano(pos) {
  for (let i = puntos.length - 1; i >= 0; i--) {
    const p = puntos[i];
    const dx = pos.x - p.x;
    const dy = pos.y - p.y;
    const distancia = Math.sqrt(dx * dx + dy * dy);

    if (distancia < radioPunto + 4) {
      return i;
    }
  }

  return null;
}

canvas.addEventListener("mousedown", (evento) => {
  const pos = obtenerPosicionMouse(evento);
  puntoSeleccionado = buscarPuntoCercano(pos);
});

canvas.addEventListener("mousemove", (evento) => {
  if (puntoSeleccionado !== null) {
    const pos = obtenerPosicionMouse(evento);

    puntos[puntoSeleccionado].x = pos.x;
    puntos[puntoSeleccionado].y = pos.y;

    dibujar();
  }
});

canvas.addEventListener("mouseup", () => {
  puntoSeleccionado = null;
});

canvas.addEventListener("mouseleave", () => {
  puntoSeleccionado = null;
});

btnAgregar.addEventListener("click", agregarPuntoControl);
btnQuitar.addEventListener("click", quitarPuntoControl);
btnReiniciar.addEventListener("click", iniciar);

iniciar();