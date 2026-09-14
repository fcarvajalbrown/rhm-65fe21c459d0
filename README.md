# Red Chilena de Hubs Municipales

Sitio público de la Red. Todo lo que aparece en pantalla sale de la base de la Red y se regenera con un script, así que ninguna página tiene datos escritos a mano.

## Qué contiene

| Página | Qué muestra |
| --- | --- |
| `/` | Portada: cifras de la Red, qué ofrece, mapa del territorio y cómo integrarse |
| `/integrantes` | Las 32 organizaciones, con mapa de Chile, buscador y filtros por región y tipo |
| `/agenda` | Actividades próximas y anteriores, filtrables por categoría y modalidad |
| `/startups` | 43 fichas, con buscador y filtros por temática y programa municipal |
| `/acceso` | Qué hay en el área privada y los tres pasos para entrar a la Red |

Las buenas prácticas quedan fuera del sitio público a propósito. Se consultan en el área de miembros.

## Cómo correrlo

```
pnpm install
pnpm dev
```

Para regenerar los datos desde el libro Excel de la Red:

```
pnpm data
```

`scripts/build_data.py` lee las cuatro hojas y escribe `src/data/*.json`. Deja afuera todo correo y teléfono personal, de modo que lo versionado no expone a nadie. `scripts/build_map.py` proyecta la silueta de Chile y ubica a cada integrante según sus coordenadas.

El libro `Bases-Plataforma-Red-de-HUBs.xlsx` no está en el repositorio, porque sí trae los correos directos de las contrapartes municipales. Pídeselo a la coordinación de la Red.

## Despliegue

Cada push a `main` dispara el workflow de GitHub Actions, que construye el sitio y lo publica en GitHub Pages.

## Créditos de datos

La silueta de Chile viene de geoBoundaries gbOpen CHL ADM0, de dominio público, derivada de Natural Earth. Los logos municipales pertenecen a cada municipio o corporación.
