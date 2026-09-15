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

Nine pages. Five of them import the generated JSON directly at build time and derive their own filter facets (`[...new Set(...)]` sorted with `localeCompare(a, b, "es")`): `index.astro` (landing, counters, map), `integrantes.astro`, `agenda.astro`, `startups.astro`, `buenas-practicas.astro`. The other four belong to the mock auth layer: `acceso.astro` (public members-area description), `ingresar.astro` (login form), `cuentas.astro` (superadmin account management) and `noticias.astro` (public reading, gated editing). `noticias.astro` is the only page whose content does not come from `src/data/` at all.

`src/lib/agenda.js` is the one shared helper: it decorates events with day/month/year parts and a `horario` string, then exports `proximas` and `anteriores` split on today's date. Both `index.astro` and `agenda.astro` consume it. See Known issues.

`src/components/MapaChile.astro` renders `mapa.json` as inline SVG and joins nodes to `miembros.json` by `id` for the tooltip and macrozona colour. The `interactivo` prop only enables pointer styling; the behaviour lives in the page.

## Session, permissions and the fake backends

`src/lib/sesion.js` is the whole permission model. Two exported vocabularies, `AMBITOS` (agenda, noticias) and `ROLES` (superadmin, admin, usuario), plus a hardcoded `CUENTAS` array whose `clave` is plaintext. A session is rol plus an `ambitos` array, not one role per area: superadmin implicitly holds every ámbito, usuario holds none, an admin holds only what its account lists. `tieneAmbito` answers where, `esPropio` answers whose, `puede(sesion, ambito, accion, organizacion)` combines them (superadmin does anything, admin creates in its ámbitos and deletes only its own organisation's records), and `gestionaCuentas(sesion)` is superadmin-only. Session state lives in `sessionStorage` under `LLAVE_SESION`. Every new gate goes through these functions, never through a rol comparison written inline.

Three localStorage modules stand in for a backend that does not exist yet. `agenda-local.js` is an overlay: the agenda is server-rendered from `agenda.json` and this module records `agregados` and `borrados` on top. `cuentas-backend.js` and `noticias-backend.js` are different, a deliberate dress rehearsal for Supabase: async functions returning Promises with a fake latency, all validation inside the module, seeded from a constant when storage is empty or corrupt. Pages await them and never touch localStorage directly, so replacing either with a real client should touch that one file. `noticias-backend.js` also owns `TEMATICAS`, a placeholder taxonomy the network has not confirmed, paired with `colorTematica` in `categorias.js`.

The gated pages guard client-side: no session redirects to `/ingresar?volver=…`, and `/cuentas` additionally shows a refusal block when the session is not superadmin. The header hides links behind `data-sesion-dentro` and `data-sesion-superadmin`.

None of this is security, and it must not be described as if it were. The site builds to static files, so a gated page is a real file at its URL and anyone who types the path receives the HTML; hiding a nav link hides the door, not the room. The demo credentials ship inside the published bundle. This is acceptable while the content is public or placeholder, and unacceptable the day real contraparte contact data goes in, which is what the Supabase migration is for. `/ingresar` and both editing pages say so on screen; keep that copy.

`/cuentas` and the login form are deliberately disconnected. `iniciarSesion` still reads the `CUENTAS` constant, so an account created in `/cuentas` cannot log in and one deleted there can. Accounts are created with no clave at all, because Supabase issues credentials by invite rather than by an admin typing a password.

## Known issues

**The agenda cutoff is frozen at build time.** `src/lib/agenda.js` computes `corte` from `new Date()` when the module is evaluated, which on a static Astro build is the moment of `pnpm build`, not the moment a visitor loads the page. A deployed site keeps listing past events under "actividades próximas" and keeps showing a stale count in the `index.astro` and `agenda.astro` headlines until someone rebuilds. Secondary defect in the same line: `toISOString()` yields a UTC date, so in Chile (UTC-3/-4) the cutoff flips around 20:00-21:00 local, and an event drops into "anteriores" during the evening of the day it happens rather than at local midnight. Fixing it properly means computing the split in the browser rather than at build time, with the comparison done in `America/Santiago`.

**Noticias are invisible without JavaScript.** `noticias.astro` ships an empty `<ul>` and fills it from `noticias-backend.js` on load, so the page carries no content for search engines, for link previews, or for a reader with scripts off, unlike every other listing page. This is the accepted cost of having no build-time source for noticias; it reverses if they ever move into the workbook and `build_data.py`.

## Conventions

Everything user-facing and every identifier is in Spanish (`envoltorio`, `ficha`, `rotulo`, `aplicar`, `proximas`). Keep new code in that vocabulary rather than mixing English names in.

Styling is plain CSS: design tokens in `src/styles/global.css` (`--tinta`, `--papel`, `--lila`, `--magenta`, `--naranja`, `--violeta`, `--amarillo`, `--turquesa`, `--linea`, `--sombra`, `--display`, `--texto`, `--ancho`) plus scoped `<style>` blocks per component and page. The look is neo-brutalist: 2px black borders and hard offset shadows. Colour is never picked inline — pages map a category to a token (`colorMacrozona`, `colorCategoria`, `colorTematica`) and pass it through a `--color` custom property.

Interactivity is vanilla, progressive and per-page: `integrantes`, `agenda` and `startups` each end in a plain `<script>` that reads `data-*` attributes off server-rendered cards and toggles `hidden`, updating a live `conteo` and an empty-state `vacio` element. There is no client-side framework and no hydration directive anywhere; keep it that way unless there is a reason not to. `integrantes.astro` additionally syncs card visibility back onto the SVG nodes by `data-id`.

Use `pnpm` only — `pnpm-lock.yaml` and `pnpm-workspace.yaml` are committed, and `astro` is the single runtime dependency.

## Git

Commit messages are in **English**, imperative mood, a short subject line plus a body explaining why when the change is not self-evident. The five oldest commits in this repo are Spanish; everything from `adf1d7d` onward is English. User-facing text and identifiers stay Spanish regardless.

**One logical change per commit**, split by what the change *is*, not by which files it touches. A new page ships with the module it depends on, in the same commit. Never edit working code to make a diff look tidier — if a helper cannot be split cleanly across two commits, it belongs whole in the earlier one.

Commit directly to `main`. Never open a pull request unless asked for one in that same turn. No AI attribution anywhere: no `Co-Authored-By` model trailer, no generated-with line, in commits or anywhere else.
