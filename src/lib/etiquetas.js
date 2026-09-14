const MARGEN = 14;
const FUENTE = 26;
const LINEA = 30;
const CORTE = 28;
const ANCHO_CARACTER = 0.6;
const CANAL = Math.ceil(CORTE * ANCHO_CARACTER * FUENTE);
const CODO = 22;
const SANGRIA = 36;
const AIRE = 7;
const RELLENO = 14;
const CABECERA = 96;
const SEPARACION = 24;
const HOLGURA = 6;

export const MACROZONA_AGRUPADA = "Metropolitana";

const porY = (a, b) => a.y - b.y;

const porOrganizacion = (a, b) =>
  a.organizacion.localeCompare(b.organizacion, "es");

const partir = (texto) => {
  const lineas = [];
  let actual = "";
  for (const palabra of texto.split(/\s+/)) {
    const tentativa = actual ? `${actual} ${palabra}` : palabra;
    if (actual && tentativa.length > CORTE) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = tentativa;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
};

const repartir = (piezas, suelo, techo) => {
  const centros = [];
  piezas.forEach((pieza, i) => {
    const minimo =
      i === 0
        ? suelo + pieza.alto / 2
        : centros[i - 1] + (piezas[i - 1].alto + pieza.alto) / 2 + AIRE;
    centros.push(Math.max(pieza.objetivo, minimo));
  });
  for (let i = piezas.length - 1; i >= 0; i -= 1) {
    const limite =
      i === piezas.length - 1
        ? techo - piezas[i].alto / 2
        : centros[i + 1] - (piezas[i].alto + piezas[i + 1].alto) / 2 - AIRE;
    centros[i] = Math.min(centros[i], limite);
  }
  for (let vuelta = 0; vuelta < 3; vuelta += 1) {
    centrar(piezas, centros, suelo);
  }
  return centros;
};

const separacion = (a, b) => (a.alto + b.alto) / 2 + AIRE;

const centrar = (piezas, centros, suelo) => {
  let i = 0;
  while (i < piezas.length) {
    let fin = i;
    while (
      fin + 1 < piezas.length &&
      centros[fin + 1] - centros[fin] <=
        separacion(piezas[fin], piezas[fin + 1]) + 0.01
    ) {
      fin += 1;
    }
    const tramo = fin - i + 1;
    let arrastre = 0;
    for (let k = i; k <= fin; k += 1) arrastre += centros[k] - piezas[k].objetivo;
    const sobra =
      i === 0
        ? centros[i] - (suelo + piezas[i].alto / 2)
        : centros[i] - centros[i - 1] - separacion(piezas[i - 1], piezas[i]);
    const ajuste = Math.min(arrastre / tramo, sobra);
    if (ajuste > 0) for (let k = i; k <= fin; k += 1) centros[k] -= ajuste;
    i = fin + 1;
  }
};

const apilar = (lineas, centro, x) =>
  lineas.map((texto, i) => ({
    texto,
    x,
    y: centro - ((lineas.length - 1) * LINEA) / 2 + i * LINEA,
  }));

export const disponerEtiquetas = (nodos, ancho, alto) => {
  const agrupados = nodos.filter((nodo) => nodo.macrozona === MACROZONA_AGRUPADA);
  const sueltos = nodos
    .filter((nodo) => nodo.macrozona !== MACROZONA_AGRUPADA)
    .sort(porY);

  const codoX = ancho + CODO;
  const textoX = ancho + SANGRIA;

  const piezas = sueltos.map((nodo) => {
    const lineas = partir(nodo.organizacion);
    return { objetivo: nodo.y, alto: lineas.length * LINEA, lineas };
  });
  const centros = repartir(piezas, -MARGEN + HOLGURA, alto + MARGEN - HOLGURA);

  const individuales = new Map(
    sueltos.map((nodo, i) => [
      nodo.id,
      {
        centro: centros[i],
        lineas: apilar(piezas[i].lineas, centros[i], textoX),
        guia: `${nodo.x},${nodo.y} ${codoX},${centros[i]} ${textoX - HOLGURA},${centros[i]}`,
      },
    ])
  );

  const cajaAncho = CANAL + RELLENO * 2;
  const cajaX = -(cajaAncho + SEPARACION);
  let grupo = null;
  const entradas = new Map();

  if (agrupados.length > 0) {
    const lista = [...agrupados].sort(porOrganizacion);
    const bloques = lista.map((nodo) => partir(nodo.organizacion));
    const cuerpo =
      bloques.reduce((suma, lineas) => suma + lineas.length * LINEA, 0) +
      (bloques.length - 1) * AIRE;
    const cajaAlto = CABECERA + cuerpo + RELLENO;
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

    let cursor = cajaY + CABECERA;
    lista.forEach((nodo, i) => {
      const lineas = bloques[i];
      entradas.set(nodo.id, {
        lineas: lineas.map((texto, j) => ({
          texto,
          x: cajaX + RELLENO,
          y: cursor + (j + 0.76) * LINEA,
        })),
      });
      cursor += lineas.length * LINEA + AIRE;
    });

    grupo = {
      total: lista.length,
      region: lista[0].region,
      x: cajaX,
      y: cajaY,
      ancho: cajaAncho,
      alto: cajaAlto,
      textoX: cajaX + RELLENO,
      antetitulo: cajaY + 30,
      titulo: cajaY + 58,
      conteo: cajaY + 80,
      abrazadera: {
        x: minimoX - HOLGURA,
        y: minimoY - HOLGURA,
        ancho: maximoX - minimoX + HOLGURA * 2,
        alto: maximoY - minimoY + HOLGURA * 2,
      },
      ancla: `${minimoX - HOLGURA},${centro} ${cajaX + cajaAncho},${centro}`,
    };
  }

  const izquierda = (grupo ? cajaX : 0) - MARGEN;
  const derecha = textoX + CANAL + MARGEN;

  return {
    individuales,
    entradas,
    grupo,
    vista: `${izquierda} ${-MARGEN} ${derecha - izquierda} ${alto + MARGEN * 2}`,
  };
};
