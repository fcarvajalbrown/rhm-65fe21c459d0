import agenda from "../data/agenda.json";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const hoy = () => new Date().toISOString().slice(0, 10);

const decorar = (evento) => {
  const [anio, mes, dia] = evento.fecha.split("-");
  return {
    ...evento,
    dia,
    mes: MESES[Number(mes) - 1],
    anio,
    modalidad: evento.modalidad ? evento.modalidad.replace("Hibrido", "Híbrido") : null,
    horario: [evento.horaInicio, evento.horaFin].filter(Boolean).join(" a "),
  };
};

export const eventos = agenda.map(decorar);
export const corte = hoy();
export const proximas = eventos.filter((e) => e.fecha >= corte).sort((a, b) => a.fecha.localeCompare(b.fecha));
export const anteriores = eventos.filter((e) => e.fecha < corte).sort((a, b) => b.fecha.localeCompare(a.fecha));
