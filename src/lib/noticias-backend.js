const LLAVE = "rhm-noticias";
const RETARDO = 120;

export const TEMATICAS = ["Anuncio", "Convocatoria", "Alianza", "Territorio", "Otro"];

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const DIACRITICOS = new RegExp("[\\u0300-\\u036f]", "g");

const RELLENO =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";

const SEMILLA = [
  {
    id: "2026-09-10-titular-de-ejemplo-uno",
    fecha: "2026-09-10",
    titulo: "Titular de ejemplo uno",
    tematica: "Anuncio",
    organizacion: "Red Chilena de Hubs Municipales",
    resumen: "Bajada de ejemplo. Este texto es relleno y no describe ningún hecho real.",
    cuerpo: RELLENO,
    enlace: null,
    ejemplo: true,
  },
  {
    id: "2026-08-28-titular-de-ejemplo-dos",
    fecha: "2026-08-28",
    titulo: "Titular de ejemplo dos",
    tematica: "Convocatoria",
    organizacion: "HUB Providencia",
    resumen: "Bajada de ejemplo. Este texto es relleno y no describe ningún hecho real.",
    cuerpo: RELLENO,
    enlace: null,
    ejemplo: true,
  },
  {
    id: "2026-08-05-titular-de-ejemplo-tres",
    fecha: "2026-08-05",
    titulo: "Titular de ejemplo tres",
    tematica: "Territorio",
    organizacion: "HUB Vitacura",
    resumen: "Bajada de ejemplo. Este texto es relleno y no describe ningún hecho real.",
    cuerpo: RELLENO,
    enlace: null,
    ejemplo: true,
  },
];

const pausa = () => new Promise((resolver) => setTimeout(resolver, RETARDO));

const semilla = () => SEMILLA.map((noticia) => ({ ...noticia }));

const leer = () => {
  try {
    const bruto = localStorage.getItem(LLAVE);
    const datos = bruto ? JSON.parse(bruto) : null;
    if (!Array.isArray(datos)) return semilla();
    return datos.filter((noticia) => noticia && typeof noticia.id === "string");
  } catch (error) {
    return semilla();
  }
};

const guardar = (noticias) => {
  localStorage.setItem(LLAVE, JSON.stringify(noticias));
  return noticias;
};

const ordenar = (noticias) => [...noticias].sort((a, b) => b.fecha.localeCompare(a.fecha));

const texto = (valor) => String(valor || "").trim();

const sinAcentos = (valor) => valor.normalize("NFD").replace(DIACRITICOS, "");

export const idDeNoticia = (fecha, titulo) => {
  const ranura = sinAcentos(String(titulo))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${fecha}-${ranura || "noticia"}`;
};

const sanear = (datos) => {
  const fecha = texto(datos.fecha);
  const titulo = texto(datos.titulo);
  const tematica = texto(datos.tematica);
  const organizacion = texto(datos.organizacion);
  const enlace = texto(datos.enlace);

  if (!titulo) throw new Error("El titular es obligatorio.");
  if (!FECHA.test(fecha)) throw new Error("La fecha no tiene un formato válido.");
  if (!organizacion) throw new Error("La organización que publica es obligatoria.");
  if (!TEMATICAS.includes(tematica)) throw new Error("La temática indicada no existe.");
  if (enlace && !/^https?:\/\//.test(enlace)) throw new Error("El enlace debe empezar por http.");

  return {
    id: idDeNoticia(fecha, titulo),
    fecha,
    titulo,
    tematica,
    organizacion,
    resumen: texto(datos.resumen) || null,
    cuerpo: texto(datos.cuerpo) || null,
    enlace: enlace || null,
    ejemplo: false,
  };
};

export const listarNoticias = async () => {
  await pausa();
  return ordenar(leer()).map((noticia) => ({ ...noticia }));
};

export const crearNoticia = async (datos) => {
  await pausa();
  const noticias = leer();
  const noticia = sanear(datos);
  guardar([...noticias.filter((otra) => otra.id !== noticia.id), noticia]);
  return { ...noticia };
};

export const borrarNoticia = async (id) => {
  await pausa();
  const noticias = leer();
  if (!noticias.some((noticia) => noticia.id === id)) {
    throw new Error("La noticia ya no está en el listado.");
  }
  guardar(noticias.filter((noticia) => noticia.id !== id));
};

export const reiniciarNoticias = async () => {
  await pausa();
  return ordenar(guardar(semilla())).map((noticia) => ({ ...noticia }));
};
