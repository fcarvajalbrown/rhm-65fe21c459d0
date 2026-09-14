import json
import re
import ssl
import urllib.parse
import urllib.request
from io import BytesIO
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MIEMBROS = ROOT / "src" / "data" / "miembros.json"
CRUDO = ROOT / "data" / "logos-crudos"
INFORME = ROOT / "data" / "logos-informe.json"

AGENTE = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

SITIOS = {
    "hub-providencia": ["providencia.cl"],
    "hub-vitacura": ["vitacura.cl"],
    "corporacion-yunus": ["corporacionyunus.cl", "penalolen.cl"],
    "municipalidad-de-lo-barnechea": ["lobarnechea.cl"],
    "corporacion-de-fomento-la-florida": ["fomentolaflorida.cl"],
    "corporacion-municipal-de-innovacion-y-desarrollo-municipalidad-de-independencia": [
        "www.independenciaciudadana.cl"
    ],
    "hub-stgo": ["hubsantiago.cl", "santiagoinnova.com"],
    "hub-de-emprendimiento-nunoa": ["nunoa.cl"],
    "colina-emprende": ["colina.cl", "corporacioncolina.cl"],
    "municipalidad-de-san-bernardo": ["sanbernardo.cl"],
    "red-la-reina": ["lareina.cl"],
    "corporacion-huechuraba": ["huechuraba.cl"],
    "municipalidad-de-las-condes": ["lascondes.cl"],
    "temuco-lab": ["temuco.cl"],
    "municipalidad-de-puerto-montt": ["puertomontt.cl"],
    "municipalidad-el-quisco": ["elquisco.cl"],
    "hub-santo-domingo": ["santodomingo.cl"],
    "municipalidad-yerbas-buenas": ["muniyerbasbuenas.cl"],
    "municipalidad-de-san-clemente": ["sanclemente.cl"],
    "innova-vina": ["innovavina.cl"],
    "municipalidad-de-la-union": ["munilaunion.cl"],
    "municipalidad-de-cerrillos": ["cerrillos.cl", "municerrillos.cl"],
    "hub-municipalidad-de-la-serena": ["laserena.cl"],
    "municipalidad-de-antofagasta": ["municipalidaddeantofagasta.cl", "antofagasta.cl"],
    "municipalidad-de-san-miguel": ["sanmiguel.cl"],
    "la-fabrica": ["renca.cl"],
    "municipalidad-de-la-cisterna": ["cisterna.cl"],
    "hub-met": ["hubmetropolitano.cl"],
    "municipalidad-calera-de-tango": ["caleradetango.cl"],
    "centro-ideactiva": ["centroideactiva.cl"],
    "corporacion-regional-de-desarrollo-productivo-los-rios": ["corporacionlosrios.cl"],
    "municipalidad-punta-arenas": ["puntaarenas.cl"],
}

VETADO = ("/owa/", "gob_logo", "gob.cl/", "/plugins/", "whatsapp", "facebook", "instagram")

CONTEXTO = ssl.create_default_context()
CONTEXTO.check_hostname = False
CONTEXTO.verify_mode = ssl.CERT_NONE


def traer(url, limite=4_000_000):
    peticion = urllib.request.Request(
        url,
        headers={
            "User-Agent": AGENTE,
            "Accept": "text/html,application/xhtml+xml,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "es-CL,es;q=0.9",
        },
    )
    with urllib.request.urlopen(peticion, timeout=25, context=CONTEXTO) as respuesta:
        return respuesta.read(limite), respuesta.geturl()


def reunir(html, base):
    vistos = {}

    def agregar(url, clase):
        if not url or url.startswith("data:"):
            return
        absoluta = urllib.parse.urljoin(base, url.strip())
        if any(v in absoluta.lower() for v in VETADO):
            return
        vistos.setdefault(absoluta, clase)

    for etiqueta in re.findall(r"<link[^>]+>", html, re.I):
        rel = re.search(r'rel=["\']([^"\']+)["\']', etiqueta, re.I)
        href = re.search(r'href=["\']([^"\']+)["\']', etiqueta, re.I)
        if rel and href:
            valor = rel.group(1).lower()
            if "apple-touch-icon" in valor:
                agregar(href.group(1), "apple")
            elif "icon" in valor and "mask" not in valor:
                agregar(href.group(1), "icono")

    for etiqueta in re.findall(r"<img[^>]+>", html[:300_000], re.I):
        for atributo in ("src", "data-src"):
            valor = re.search(rf'{atributo}=["\']([^"\']+)["\']', etiqueta, re.I)
            if valor and re.search(r"logo|isotipo|marca|escudo", etiqueta, re.I):
                agregar(valor.group(1), "img")

    for etiqueta in re.findall(r"<meta[^>]+>", html, re.I):
        if re.search(r'property=["\']og:image["\']', etiqueta, re.I):
            contenido = re.search(r'content=["\']([^"\']+)["\']', etiqueta, re.I)
            if contenido:
                agregar(contenido.group(1), "og")

    agregar("/favicon.ico", "icono")
    return list(vistos.items())


def luminancia(imagen):
    muestra = imagen.convert("RGBA").resize((48, 48))
    pixeles = [p for p in muestra.getdata() if p[3] > 40]
    if not pixeles:
        return 255.0
    return sum(0.2126 * r + 0.7152 * g + 0.0722 * b for r, g, b, _ in pixeles) / len(pixeles)


def puntuar(url, clase, imagen, esvg):
    bajo = url.lower()
    puntos = 0
    if "logo" in bajo:
        puntos += 45
    if re.search(r"isotipo|marca|escudo", bajo):
        puntos += 35
    if clase == "apple":
        puntos += 18
    if clase == "og":
        puntos -= 5
    if clase == "icono":
        puntos += 4
    if bajo.endswith(".ico"):
        puntos -= 12
    if re.search(r"blanco|white|negativo", bajo):
        puntos -= 28

    if esvg:
        return puntos + 30, None

    ancho, alto = imagen.size
    proporcion = ancho / alto
    if proporcion > 8 or proporcion < 0.12:
        return -999, None
    if clase == "og" and 1.6 < proporcion < 2.2:
        puntos -= 40
    if min(ancho, alto) >= 120:
        puntos += 16
    elif min(ancho, alto) >= 64:
        puntos += 9
    elif min(ancho, alto) >= 40:
        puntos += 3

    luz = luminancia(imagen)
    if luz > 215:
        puntos -= 22
    return puntos, luz


def main():
    CRUDO.mkdir(parents=True, exist_ok=True)
    for viejo in CRUDO.iterdir():
        viejo.unlink()

    miembros = json.loads(MIEMBROS.read_text(encoding="utf-8"))
    informe = {}

    for miembro in miembros:
        clave = miembro["id"]
        resultado = {"organizacion": miembro["organizacion"], "estado": "sin-logo", "origen": None}
        mejor = None

        for dominio in SITIOS.get(clave, []):
            html = None
            base = None
            for esquema in ("https://", "http://"):
                try:
                    crudo, final = traer(esquema + dominio)
                    html, base = crudo.decode("utf-8", "ignore"), final
                    break
                except Exception as error:
                    resultado["estado"] = f"sitio-inaccesible ({type(error).__name__})"
            if not html:
                continue
            resultado["estado"] = "sin-logo"

            for url, clase in reunir(html, base)[:16]:
                try:
                    datos, final = traer(url)
                except Exception:
                    continue
                if not datos:
                    continue
                cabeza = datos[:600].lower()
                esvg = final.lower().split("?")[0].endswith(".svg") or b"<svg" in cabeza
                imagen = None
                if not esvg:
                    try:
                        imagen = Image.open(BytesIO(datos))
                        imagen.load()
                    except Exception:
                        continue
                    if min(imagen.size) < 28:
                        continue
                puntos, luz = puntuar(final, clase, imagen, esvg)
                if puntos <= -900:
                    continue
                if mejor is None or puntos > mejor["puntos"]:
                    mejor = {
                        "puntos": puntos,
                        "datos": datos,
                        "url": final,
                        "esvg": esvg,
                        "tamano": None if esvg else list(imagen.size),
                        "formato": "svg" if esvg else (imagen.format or "PNG").lower(),
                        "luz": luz,
                    }

            if mejor and mejor["puntos"] >= 45:
                break

        if mejor:
            destino = CRUDO / f"{clave}.{'svg' if mejor['esvg'] else mejor['formato']}"
            destino.write_bytes(mejor["datos"])
            resultado.update(
                {
                    "estado": "ok",
                    "origen": mejor["url"],
                    "archivo": destino.name,
                    "tamano": mejor["tamano"],
                    "puntos": mejor["puntos"],
                    "claro": bool(mejor["luz"] and mejor["luz"] > 200),
                }
            )

        informe[clave] = resultado
        marca = "ok " if resultado["estado"] == "ok" else "   "
        print(f"{marca}{clave[:44]:46} {resultado['estado'][:26]:28} {(resultado.get('origen') or '')[:88]}")

    INFORME.write_text(json.dumps(informe, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    ok = sum(1 for v in informe.values() if v["estado"] == "ok")
    print(f"\nconseguidos: {ok}/{len(miembros)}")
    faltan = [v["organizacion"] for v in informe.values() if v["estado"] != "ok"]
    for f in faltan:
        print(f"  falta: {f}")


if __name__ == "__main__":
    main()
