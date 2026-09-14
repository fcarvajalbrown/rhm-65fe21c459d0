export const coordinacion = {
  nombre: "Luis Felipe Valenzuela",
  cargo: "Coordinador de la Red de Hubs",
  correo: "luis.valenzuela@providencia.cl",
};

export const enlaceCorreo = (asunto = "Red Chilena de Hubs Municipales") =>
  `mailto:${coordinacion.correo}?subject=${encodeURIComponent(asunto)}`;
