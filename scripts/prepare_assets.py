from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets"
OUT = ROOT / "public" / "img"


def trim(image):
    alpha = image.getchannel("A")
    box = alpha.getbbox()
    return image.crop(box) if box else image


def to_white(image):
    blanco = Image.new("RGBA", image.size, (255, 255, 255, 255))
    blanco.putalpha(image.getchannel("A"))
    return blanco


def resize_to_width(image, width):
    if image.width <= width:
        return image
    height = round(image.height * width / image.width)
    return image.resize((width, height), Image.LANCZOS)


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    logo = trim(Image.open(SRC / "LogoRedHubs_SinFondo.png").convert("RGBA"))
    logo.save(OUT / "logo-red-hubs.png")
    to_white(logo).save(OUT / "logo-red-hubs-blanco.png")
    print(f"logo-red-hubs.png {logo.size}")

    bombilla = trim(logo.crop((round(logo.width * 0.52), 0, round(logo.width * 0.71), logo.height)))
    lado = round(max(bombilla.size) * 1.22)
    icono = Image.new("RGBA", (lado, lado), (255, 255, 255, 255))
    icono.paste(bombilla, ((lado - bombilla.width) // 2, (lado - bombilla.height) // 2), bombilla)
    icono.resize((256, 256), Image.LANCZOS).save(OUT / "favicon.png")
    print(f"favicon.png recortado desde {bombilla.size}")

    foto = resize_to_width(Image.open(SRC / "fotoalcaldes.png").convert("RGB"), 1600)
    foto.save(OUT / "firma-red.jpg", quality=86, optimize=True, progressive=True)
    print(f"firma-red.jpg {foto.size}")

    cowork = resize_to_width(Image.open(SRC / "coworks.png").convert("RGB"), 1800)
    cowork.save(OUT / "coworks.jpg", quality=86, optimize=True, progressive=True)
    print(f"coworks.jpg {cowork.size}")


if __name__ == "__main__":
    main()
