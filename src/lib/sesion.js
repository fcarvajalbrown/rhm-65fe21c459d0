export const LLAVE_SESION = "rhm-sesion";

export const AMBITOS = {
  agenda: "Agenda de la Red",
  noticias: "Noticias y novedades",
};

export const ROLES = {
  superadmin: {
    etiqueta: "Superadministración",
    resumen:
      "Crea y borra en todos los ámbitos y para cualquier organización, y gestiona las cuentas de la Red.",
    color: "var(--magenta)",
  },
  admin: {
    etiqueta: "Administración",
    resumen:
      "Crea en los ámbitos que tiene asignados y borra solo lo que pertenece a su propia organización.",
    color: "var(--turquesa)",
  },
  usuario: {
    etiqueta: "Integrante",
    resumen: "Consulta la agenda y el repositorio de buenas prácticas, sin editar.",
    color: "var(--amarillo)",
  },
};

export const CUENTAS = [
  {
    correo: "coordinacion@redhubs.cl",
    clave: "red-2026",
    nombre: "Coordinación de la Red",
    rol: "superadmin",
    ambitos: ["agenda", "noticias"],
    organizacion: "Red Chilena de Hubs Municipales",
  },
  {
    correo: "agenda.providencia@redhubs.cl",
    clave: "hub-2026",
    nombre: "Contraparte HUB Providencia",
    rol: "admin",
    ambitos: ["agenda"],
    organizacion: "HUB Providencia",
  },
  {
    correo: "agenda.vitacura@redhubs.cl",
    clave: "hub-2026",
    nombre: "Contraparte HUB Vitacura",
    rol: "admin",
    ambitos: ["agenda"],
    organizacion: "HUB Vitacura",
  },
  {
    correo: "noticias.providencia@redhubs.cl",
    clave: "hub-2026",
    nombre: "Comunicaciones HUB Providencia",
    rol: "admin",
    ambitos: ["noticias"],
    organizacion: "HUB Providencia",
  },
  {
    correo: "integrante@redhubs.cl",
    clave: "red-2026",
    nombre: "Integrante de la Red",
    rol: "usuario",
    ambitos: [],
    organizacion: "Municipalidad de San Miguel",
  },
];

const normalizar = (correo) => String(correo || "").trim().toLowerCase();

export const iniciarSesion = (correo, clave) => {
  const cuenta = CUENTAS.find((c) => c.correo === normalizar(correo) && c.clave === clave);
  if (!cuenta) return null;
  const sesion = {
    correo: cuenta.correo,
    nombre: cuenta.nombre,
    rol: cuenta.rol,
    ambitos: cuenta.ambitos,
    organizacion: cuenta.organizacion,
  };
  sessionStorage.setItem(LLAVE_SESION, JSON.stringify(sesion));
  return sesion;
};

export const leerSesion = () => {
  try {
    const bruto = sessionStorage.getItem(LLAVE_SESION);
    const sesion = bruto ? JSON.parse(bruto) : null;
    return sesion && ROLES[sesion.rol] ? sesion : null;
  } catch (error) {
    return null;
  }
};

export const cerrarSesion = () => sessionStorage.removeItem(LLAVE_SESION);

export const tieneAmbito = (sesion, ambito) => {
  if (!sesion) return false;
  if (sesion.rol === "superadmin") return true;
  return Array.isArray(sesion.ambitos) && sesion.ambitos.includes(ambito);
};

export const esPropio = (sesion, organizacion) =>
  Boolean(sesion) && Boolean(organizacion) && organizacion === sesion.organizacion;

export const puede = (sesion, ambito, accion, organizacion) => {
  if (!tieneAmbito(sesion, ambito)) return false;
  if (sesion.rol === "superadmin") return true;
  if (accion === "crear") return true;
  if (accion === "borrar") return esPropio(sesion, organizacion);
  return false;
};

export const gestionaCuentas = (sesion) => Boolean(sesion) && sesion.rol === "superadmin";
