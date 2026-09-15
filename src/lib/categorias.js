export const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const COLOR_CATEGORIA = {
  Evento: "var(--magenta)",
  Capacitación: "var(--turquesa)",
  "Reunión Red": "var(--amarillo)",
  "Mesa Territorial": "var(--violeta)",
  Otro: "var(--naranja)",
};

export const colorCategoria = (categoria) => COLOR_CATEGORIA[categoria] || "var(--lila-hondo)";

const COLOR_TEMATICA = {
  Anuncio: "var(--magenta)",
  Convocatoria: "var(--turquesa)",
  Alianza: "var(--violeta)",
  Territorio: "var(--amarillo)",
  Otro: "var(--naranja)",
};

export const colorTematica = (tematica) => COLOR_TEMATICA[tematica] || "var(--lila-hondo)";
