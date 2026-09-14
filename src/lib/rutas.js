const BASE = import.meta.env.BASE_URL;

export const url = (ruta = "/") => `${BASE}/${ruta}`.replace(/\/{2,}/g, "/");

export const esActiva = (actual, ruta) => {
  const limpia = (valor) => valor.replace(/\/+$/, "") || "/";
  return limpia(actual) === limpia(url(ruta));
};
