import { AMBITOS, CUENTAS, ROLES } from "./sesion.js";

const LLAVE = "rhm-cuentas";
const RETARDO = 120;

const ROLES_VALIDOS = Object.keys(ROLES);
const AMBITOS_VALIDOS = Object.keys(AMBITOS);
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const pausa = () => new Promise((resolver) => setTimeout(resolver, RETARDO));

const semilla = () => CUENTAS.map((cuenta) => ({ ...cuenta, ambitos: [...cuenta.ambitos] }));

const leer = () => {
  try {
    const bruto = localStorage.getItem(LLAVE);
    const datos = bruto ? JSON.parse(bruto) : null;
    if (!Array.isArray(datos)) return semilla();
    return datos.filter((cuenta) => cuenta && typeof cuenta.correo === "string");
  } catch (error) {
    return semilla();
  }
};

const guardar = (cuentas) => {
  localStorage.setItem(LLAVE, JSON.stringify(cuentas));
  return cuentas;
};

const copia = (cuenta) => ({ ...cuenta, ambitos: [...cuenta.ambitos] });

const normalizar = (correo) => String(correo || "").trim().toLowerCase();

const texto = (valor) => String(valor || "").trim();

const sanear = (datos, cuentas, correoPrevio) => {
  const correo = normalizar(datos.correo);
  const nombre = texto(datos.nombre);
  const organizacion = texto(datos.organizacion);
  const rol = texto(datos.rol);
  const pedidos = Array.isArray(datos.ambitos) ? datos.ambitos : [];
  const ambitos = AMBITOS_VALIDOS.filter((ambito) => pedidos.includes(ambito));

  if (!CORREO.test(correo)) throw new Error("El correo no tiene un formato válido.");
  if (!nombre) throw new Error("El nombre de la contraparte es obligatorio.");
  if (!organizacion) throw new Error("La organización es obligatoria.");
  if (!ROLES_VALIDOS.includes(rol)) throw new Error("El rol indicado no existe.");
  if (cuentas.some((cuenta) => cuenta.correo === correo && cuenta.correo !== correoPrevio)) {
    throw new Error("Ya existe una cuenta con ese correo.");
  }

  return { correo, nombre, organizacion, rol, ambitos: rol === "usuario" ? [] : ambitos };
};

export const listarCuentas = async () => {
  await pausa();
  return leer().map(copia);
};

export const crearCuenta = async (datos) => {
  await pausa();
  const cuentas = leer();
  const cuenta = sanear(datos, cuentas, null);
  guardar([...cuentas, cuenta]);
  return copia(cuenta);
};

export const actualizarCuenta = async (correo, cambios) => {
  await pausa();
  const cuentas = leer();
  const previo = normalizar(correo);
  const indice = cuentas.findIndex((cuenta) => cuenta.correo === previo);
  if (indice < 0) throw new Error("La cuenta ya no está en el listado.");
  const saneada = sanear({ ...cuentas[indice], ...cambios, correo: previo }, cuentas, previo);
  cuentas[indice] = { ...cuentas[indice], ...saneada };
  guardar(cuentas);
  return copia(cuentas[indice]);
};

export const borrarCuenta = async (correo) => {
  await pausa();
  const cuentas = leer();
  const previo = normalizar(correo);
  if (!cuentas.some((cuenta) => cuenta.correo === previo)) {
    throw new Error("La cuenta ya no está en el listado.");
  }
  guardar(cuentas.filter((cuenta) => cuenta.correo !== previo));
};

export const reiniciarCuentas = async () => {
  await pausa();
  return guardar(semilla()).map(copia);
};
