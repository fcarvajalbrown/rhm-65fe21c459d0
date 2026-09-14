# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static site for the Red Chilena de Hubs Municipales (Astro 7, no UI framework, no TypeScript), built from a single Excel workbook maintained by the network. Deployed to GitHub Pages at `https://fcarvajalbrown.github.io/rhm-65fe21c459d0/`, so `astro.config.mjs` sets both `site` and `base`. Every internal link and asset path must go through `url()` in `src/lib/rutas.js` or it will 404 under the base path.

## Commands

```
pnpm install --frozen-lockfile
pnpm dev              # astro dev
pnpm build            # astro build -> dist/
pnpm preview
pnpm data             # python scripts/build_data.py && python scripts/build_map.py
python scripts/fetch_logos.py     # scrapes member logos into data/logos-crudos/
python scripts/prepare_assets.py  # regenerates public/img/* from assets/ (see caveat below)
```

No tests, no linter, no formatter configured. Python scripts need `openpyxl` and `Pillow`; there is no requirements file.

## Data pipeline

The workbook `Bases-Plataforma-Red-de-HUBs.xlsx` at the repo root is the single source of truth. It is gitignored, because it holds the direct emails and phone numbers of municipal counterparts and startup founders; ask the network's coordination for a copy. Everything under `src/data/` is generated — never hand-edit those JSON files, the next `pnpm data` run overwrites them.

`scripts/build_data.py` reads four named sheets (`Miembros Red de HUB´s`, `Repositorio Startups`, `Agenda de la Red`, `Repositorio Buenas Prácticas`) and writes `miembros.json`, `startups.json`, `agenda.json`, `buenas-practicas.json`. It keys records by a `slug()` of the name, which is also the `id` used to join members to map nodes and to DOM `data-id` attributes.

Two lookup tables in that script are the manual part: `COMUNAS` maps each comuna to `(region, lat, lon)` and `MACROZONA` maps region to one of Norte / Centro / Metropolitana / Sur / Austral. A new member in an unlisted comuna aborts the build with `Comuna sin georreferencia`. Add the entry there, do not patch the JSON.

`scripts/build_map.py` runs second and depends on `miembros.json` already existing. It reads `data/chile-adm0.geojson` (geoBoundaries gbOpen CHL ADM0, public domain), projects it, Douglas-Peucker-simplifies it, and writes `src/data/mapa.json` holding a 220-unit-wide canvas: the SVG `paths` plus one `{id, x, y}` node per member, projected through the same transform so nodes land on the coastline. The tuning constants are `TOLERANCE`, `MIN_AREA` and `WIDTH` at the top of the file.

`scripts/fetch_logos.py` is an independent scraper: per-member domains in its `SITIOS` dict, a heuristic `puntuar()` score over `<link rel=icon>`, logo-looking `<img>` and `og:image` candidates, output into `data/logos-crudos/` with a `data/logos-informe.json` report. These logos are not wired into the site yet.

`scripts/prepare_assets.py` expects an `assets/` directory that is not present in the tree; its outputs (`public/img/logo-red-hubs*.png`, `favicon.png`, `firma-red.jpg`, `coworks.jpg`) are already committed. Restore the source images before running it.

## Site structure

`src/layouts/Base.astro` takes `titulo` and `descripcion` props, appends the network name to the title, sets the `es-CL` lang, OG tags and Google Fonts link, and wraps `Header` / `<slot />` / `Footer`.

Five pages, each importing the generated JSON directly at build time and deriving its own filter facets (`[...new Set(...)]` sorted with `localeCompare(a, b, "es")`): `index.astro` (landing, counters, map), `integrantes.astro`, `agenda.astro`, `startups.astro`, `acceso.astro` (members-area description page; no real auth).

`src/lib/agenda.js` is the one shared helper: it decorates events with day/month/year parts and a `horario` string, then exports `proximas` and `anteriores` split on today's date. Both `index.astro` and `agenda.astro` consume it. See Known issues.

`src/components/MapaChile.astro` renders `mapa.json` as inline SVG and joins nodes to `miembros.json` by `id` for the tooltip and macrozona colour. The `interactivo` prop only enables pointer styling; the behaviour lives in the page.

## Known issues

**The agenda cutoff is frozen at build time.** `src/lib/agenda.js` computes `corte` from `new Date()` when the module is evaluated, which on a static Astro build is the moment of `pnpm build`, not the moment a visitor loads the page. A deployed site keeps listing past events under "actividades próximas" and keeps showing a stale count in the `index.astro` and `agenda.astro` headlines until someone rebuilds. Secondary defect in the same line: `toISOString()` yields a UTC date, so in Chile (UTC-3/-4) the cutoff flips around 20:00-21:00 local, and an event drops into "anteriores" during the evening of the day it happens rather than at local midnight. Fixing it properly means computing the split in the browser rather than at build time, with the comparison done in `America/Santiago`.

## Conventions

Everything user-facing and every identifier is in Spanish (`envoltorio`, `ficha`, `rotulo`, `aplicar`, `proximas`). Keep new code in that vocabulary rather than mixing English names in.

Styling is plain CSS: design tokens in `src/styles/global.css` (`--tinta`, `--papel`, `--lila`, `--magenta`, `--naranja`, `--violeta`, `--amarillo`, `--turquesa`, `--linea`, `--sombra`, `--display`, `--texto`, `--ancho`) plus scoped `<style>` blocks per component and page. The look is neo-brutalist: 2px black borders and hard offset shadows. Colour is never picked inline — pages map a category to a token (`colorMacrozona`, `colorCategoria`, `colorTematica`) and pass it through a `--color` custom property.

Interactivity is vanilla, progressive and per-page: `integrantes`, `agenda` and `startups` each end in a plain `<script>` that reads `data-*` attributes off server-rendered cards and toggles `hidden`, updating a live `conteo` and an empty-state `vacio` element. There is no client-side framework and no hydration directive anywhere; keep it that way unless there is a reason not to. `integrantes.astro` additionally syncs card visibility back onto the SVG nodes by `data-id`.

Use `pnpm` only — `pnpm-lock.yaml` and `pnpm-workspace.yaml` are committed, and `astro` is the single runtime dependency.
