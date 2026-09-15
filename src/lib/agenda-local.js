const LLAVE = "rhm-agenda-local";

const vacio = () => ({ agregados: [], borrados: [] });

const leer = () => {
  try {
    const bruto = localStorage.getItem(LLAVE);
    const datos = bruto ? JSON.parse(bruto) : null;
    if (!datos || !Array.isArray(datos.agregados) || !Array.isArray(datos.borrados)) return vacio();
    return datos;
  } catch (error) {
    return vacio();
  }
};

const guardar = (datos) => localStorage.setItem(LLAVE, JSON.stringify(datos));

export const agregados = () => leer().agregados;

export const borrados = () => leer().borrados;

export const agregar = (evento) => {
  const datos = leer();
  datos.agregados = [...datos.agregados.filter((e) => e.id !== evento.id), evento];
  datos.borrados = datos.borrados.filter((id) => id !== evento.id);
  guardar(datos);
  return evento;
};

export const borrar = (id) => {
  const datos = leer();
  datos.agregados = datos.agregados.filter((e) => e.id !== id);
  if (!datos.borrados.includes(id)) datos.borrados.push(id);
  guardar(datos);
};

export const limpiar = () => localStorage.removeItem(LLAVE);

const DIACRITICOS = new RegExp("[\\u0300-\\u036f]", "g");

const sinAcentos = (texto) => texto.normalize("NFD").replace(DIACRITICOS, "");

export const idDeEvento = (fecha, titulo) => {
  const ranura = sinAcentos(String(titulo))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${fecha}-${ranura || "actividad"}`;
};

export const hoyLocal = () => {
  const ahora = new Date();
  const desfase = ahora.getTimezoneOffset() * 60000;
  return new Date(ahora.getTime() - desfase).toISOString().slice(0, 10);
};
