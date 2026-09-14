import json
import re
import unicodedata
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "Bases-Plataforma-Red-de-HUBs.xlsx"
OUT = ROOT / "src" / "data"

COMUNAS = {
    "Providencia": ("Metropolitana", -33.4269, -70.6100),
    "Vitacura": ("Metropolitana", -33.3900, -70.5800),
    "Peñalolen": ("Metropolitana", -33.4900, -70.5400),
    "Barnechea": ("Metropolitana", -33.3500, -70.5200),
    "La Florida": ("Metropolitana", -33.5333, -70.5833),
    "Independencia": ("Metropolitana", -33.4167, -70.6667),
    "Santiago": ("Metropolitana", -33.4489, -70.6693),
    "Ñuñoa": ("Metropolitana", -33.4560, -70.5970),
    "Colina": ("Metropolitana", -33.2000, -70.6750),
    "San Bernardo": ("Metropolitana", -33.5920, -70.7000),
    "La Reina": ("Metropolitana", -33.4450, -70.5400),
    "Huechuraba": ("Metropolitana", -33.3667, -70.6417),
    "Las Condes": ("Metropolitana", -33.4090, -70.5480),
    "Temuco": ("La Araucanía", -38.7359, -72.5904),
    "Puerto Montt": ("Los Lagos", -41.4693, -72.9424),
    "El Quisco": ("Valparaíso", -33.3980, -71.6940),
    "Santo Domingo": ("Valparaíso", -33.6400, -71.6300),
    "Yerbas Buenas": ("Maule", -35.7500, -71.5800),
    "San Clemente": ("Maule", -35.5400, -71.4900),
    "Viña del Mar": ("Valparaíso", -33.0245, -71.5518),
    "La Unión": ("Los Ríos", -40.2920, -73.0830),
    "Cerrillos": ("Metropolitana", -33.4950, -70.7160),
    "La Serena": ("Coquimbo", -29.9027, -71.2519),
    "Antofagasta": ("Antofagasta", -23.6509, -70.3975),
    "San Miguel": ("Metropolitana", -33.4970, -70.6520),
    "Renca": ("Metropolitana", -33.4040, -70.7280),
    "La Cisterna": ("Metropolitana", -33.5330, -70.6630),
    "Metropolitano": ("Metropolitana", -33.4489, -70.6693),
    "Calera de Tango": ("Metropolitana", -33.6300, -70.7800),
    "Estación Central": ("Metropolitana", -33.4600, -70.6960),
    "Los Rios": ("Los Ríos", -39.8139, -73.2458),
    "Punta Arenas": ("Magallanes", -53.1638, -70.9171),
}

MACROZONA = {
    "Antofagasta": "Norte",
    "Coquimbo": "Norte",
    "Valparaíso": "Centro",
    "Metropolitana": "Metropolitana",
    "Maule": "Centro",
    "La Araucanía": "Sur",
    "Los Ríos": "Sur",
    "Los Lagos": "Sur",
    "Magallanes": "Austral",
}


def slug(value):
    text = unicodedata.normalize("NFKD", value or "")
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text or "item"


def clean(value):
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def rows(sheet):
    data = list(sheet.iter_rows(values_only=True))
    header = [clean(c) for c in data[0]]
    out = []
    for raw in data[1:]:
        if all(c is None or str(c).strip() == "" for c in raw):
            continue
        out.append({header[i]: clean(raw[i]) for i in range(len(header)) if header[i]})
    return out


def urls_in(value):
    if not value:
        return []
    found = re.findall(r"https?://[^\s,;]+", value)
    return [u.rstrip(".,;") for u in dict.fromkeys(found)]


def date_only(value):
    text = clean(value)
    return text.split(" ")[0] if text else None


def time_only(value):
    text = clean(value)
    if not text:
        return None
    return text[:5] if re.match(r"^\d{2}:\d{2}", text) else text


def split_list(value):
    if not value:
        return []
    parts = re.split(r"\s*(?:,|/|-|·|\n)\s*", value)
    return [p.strip() for p in parts if p.strip() and p.strip() != "-"]


def build_members(sheet):
    out = []
    for row in rows(sheet):
        comuna = row.get("Comuna")
        region, lat, lon = COMUNAS.get(comuna, (None, None, None))
        if region is None:
            raise SystemExit(f"Comuna sin georreferencia: {comuna!r}")
        handle = row.get("Red Social")
        out.append(
            {
                "id": slug(row.get("Organización")),
                "organizacion": row.get("Organización"),
                "comuna": comuna,
                "region": region,
                "macrozona": MACROZONA[region],
                "lat": lat,
                "lon": lon,
                "tipo": row.get("Tipo"),
                "direccion": row.get("Dirección"),
                "instagram": handle.strip() if handle and handle.startswith("@") else None,
                "alcalde": row.get("Alcalde/sa"),
                "contraparte": row.get("Director/a"),
            }
        )
    return out


def build_startups(sheet):
    out = []
    for row in rows(sheet):
        nombre = row.get("NOMBRE")
        if not nombre:
            continue
        enlaces = urls_in(row.get("URL")) + urls_in(row.get("CONTACTO"))
        sitio = next((u for u in enlaces if "linkedin" not in u and "facebook" not in u and "instagram" not in u and "youtube" not in u), None)
        out.append(
            {
                "id": slug(nombre),
                "nombre": nombre,
                "comuna": row.get("COMUNA DE VINCULO"),
                "programas": split_list(row.get("PROGRAMA MUNICIPAL PERTENECIENTE")),
                "tematicas": split_list(row.get("TEMÁTICA")),
                "descripcion": row.get("DESCRIPCIÓN"),
                "sitio": sitio,
                "enlaces": [u for u in dict.fromkeys(enlaces)],
            }
        )
    return out


def build_agenda(sheet):
    out = []
    for row in rows(sheet):
        titulo = row.get("Título / Asunto")
        if not titulo:
            continue
        out.append(
            {
                "id": slug(f"{date_only(row.get('Fecha'))}-{titulo}"),
                "organizador": row.get("Oferta Municipalidad"),
                "fecha": date_only(row.get("Fecha")),
                "horaInicio": time_only(row.get("Hora inicio")),
                "horaFin": time_only(row.get("Hora fin")),
                "categoria": row.get("Categoría"),
                "titulo": titulo,
                "conQuien": row.get("Con quién"),
                "modalidad": row.get("Modalidad"),
                "lugar": row.get("Lugar"),
                "notas": row.get("Notas"),
                "estado": row.get("Estado"),
            }
        )
    out.sort(key=lambda e: e["fecha"] or "")
    return out


def build_practicas(sheet):
    out = []
    for row in rows(sheet):
        nombre = row.get("NOMBRE BUENA PRÁCTICA")
        if not nombre:
            continue
        anio = date_only(row.get("AÑO IMPLEMENTACIÓN"))
        out.append(
            {
                "id": slug(nombre),
                "area": row.get("ÁREA"),
                "subarea": row.get("SUBÁREA"),
                "origen": row.get("COMUNA ORIGEN"),
                "nombre": nombre,
                "descripcion": row.get("DESCRIPCIÓN"),
                "anio": anio.split("-")[0] if anio else None,
                "contacto": row.get("CONTACTO DE CONSULTA"),
                "documentacion": row.get("URL/DOCUMENTACIÓN"),
            }
        )
    return out


def main():
    wb = openpyxl.load_workbook(SOURCE, data_only=True)
    OUT.mkdir(parents=True, exist_ok=True)

    miembros = build_members(wb["Miembros Red de HUB´s"])
    startups = build_startups(wb["Repositorio Startups"])
    agenda = build_agenda(wb["Agenda de la Red"])
    practicas = build_practicas(wb["Repositorio Buenas Prácticas"])

    for name, payload in [
        ("miembros", miembros),
        ("startups", startups),
        ("agenda", agenda),
        ("buenas-practicas", practicas),
    ]:
        path = OUT / f"{name}.json"
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{path.relative_to(ROOT)}: {len(payload)} registros")

    regiones = sorted({m["region"] for m in miembros})
    print(f"regiones representadas: {len(regiones)} -> {', '.join(regiones)}")


if __name__ == "__main__":
    main()
