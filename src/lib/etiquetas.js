const MARGEN = 14;
const CANAL = 182;
const CODO = 18;
const SANGRIA = 30;
const INTERLINEA = 24;
const SALTO = 21;
const RELLENO = 10;
const CABECERA = 64;
const SEPARACION = 24;
const HOLGURA = 6;

export const MACROZONA_AGRUPADA = "Metropolitana";

const porY = (a, b) => a.y - b.y;

const porComuna = (a, b) => a.comuna.localeCompare(b.comuna, "es");

const repartir = (objetivos, minimo, tope) => {
  const puestos = [];
  let ultimo = -Infinity;
  for (const objetivo of objetivos) {
    const puesto = Math.max(objetivo, ultimo + minimo);
    puestos.push(puesto);
    ultimo = puesto;
  }
  const total = puestos.length;
  if (total > 0 && puestos[total - 1] > tope) {
    for (let i = total - 1; i >= 0; i -= 1) {
      puestos[i] = Math.min(puestos[i], tope - (total - 1 - i) * minimo);
    }
  }
  return puestos;
};

export const disponerEtiquetas = (nodos, ancho, alto) => {
  const agrupados = nodos.filter((nodo) => nodo.macrozona === MACROZONA_AGRUPADA);
  const sueltos = nodos
    .filter((nodo) => nodo.macrozona !== MACROZONA_AGRUPADA)
    .sort(porY);

  const codoX = ancho + CODO;
  const textoX = ancho + SANGRIA;
  const puestos = repartir(
    sueltos.map((nodo) => nodo.y),
    INTERLINEA,
    alto
  );

  const individuales = new Map(
    sueltos.map((nodo, indice) => [
      nodo.id,
      {
        x: textoX,
        y: puestos[indice],
        guia: `${nodo.x},${nodo.y} ${codoX},${puestos[indice]} ${textoX - HOLGURA},${puestos[indice]}`,
      },
    ])
  );

  const cajaX = -(CANAL + SEPARACION);
  let grupo = null;
  const entradas = new Map();

  if (agrupados.length > 0) {
    const lista = [...agrupados].sort(porComuna);
    const cajaAlto = CABECERA + lista.length * SALTO + RELLENO;
    const centro =
      agrupados.reduce((suma, nodo) => suma + nodo.y, 0) / agrupados.length;
    const minimoX = Math.min(...agrupados.map((nodo) => nodo.x));
    const maximoX = Math.max(...agrupados.map((nodo) => nodo.x));
    const minimoY = Math.min(...agrupados.map((nodo) => nodo.y));
    const maximoY = Math.max(...agrupados.map((nodo) => nodo.y));
    const cajaY = Math.min(
      Math.max(centro - cajaAlto / 2, HOLGURA - MARGEN),
      alto + MARGEN - HOLGURA - cajaAlto
    );

    lista.forEach((nodo, indice) => {
      entradas.set(nodo.id, {
        x: cajaX + RELLENO,
        y: cajaY + CABECERA + (indice + 0.76) * SALTO,
      });
    });

    grupo = {
      total: lista.length,
      region: lista[0].region,
      x: cajaX,
      y: cajaY,
      ancho: CANAL,
      alto: cajaAlto,
      titulo: [cajaY + 20, cajaY + 38],
      subtitulo: cajaY + 54,
      textoX: cajaX + RELLENO,
      abrazadera: {
        x: minimoX - HOLGURA,
        y: minimoY - HOLGURA,
        ancho: maximoX - minimoX + HOLGURA * 2,
        alto: maximoY - minimoY + HOLGURA * 2,
      },
      ancla: `${minimoX - HOLGURA},${centro} ${cajaX + CANAL},${centro}`,
    };
  }

  const izquierda = grupo ? cajaX - MARGEN : -MARGEN;
  const derecha = textoX + CANAL + MARGEN;

  return {
    individuales,
    entradas,
    grupo,
    vista: `${izquierda} ${-MARGEN} ${derecha - izquierda} ${alto + MARGEN * 2}`,
  };
};
