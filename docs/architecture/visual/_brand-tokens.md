# Vitaria · Diagram Design — fidelity receipt

Onboarding del skill **diagram-design** desde la marca real del producto.
Fuente de tokens: `landing-vitaria.html` (`:22-41`) y `frontend/src/modules/landing/LandingPage.css`.

## Semantic roles (light)

| Role | Hex / value | Origen |
|---|---|---|
| `paper` | `#f6f8fb` | `--bg` de la landing |
| `paper-2` | `#eef2f7` | derivado (5% ink sobre paper) |
| `ink` | `#0d3d38` | `--ink` (deep teal) |
| `muted` | `#48606f` | `--text-soft` |
| `soft` | `#7c93a1` | derivado |
| `accent` | `#0d9488` | `--brand` / `--ring` (teal) |
| `accent-tint` | `rgba(13,148,136,0.10)` | derivado |
| `link` | `#2f6f8e` | derivado (petróleo frío, distinto del acento teal) |
| `rule` | `rgba(13,61,56,0.10)` | derivado |
| `rule-strong` | `rgba(13,61,56,0.30)` | derivado |

## Typography

| Rol | Familia | Fuente |
|---|---|---|
| `title` / `callout` | **Instrument Serif** | mantenida por la skill (contraste serif/sans cargado de intención) |
| `node-name` | **Plus Jakarta Sans** 400/500/600/700 | fuente del `<body>` de la landing |
| `sublabel` / `eyebrow` / `arrow-label` | **Geist Mono** | mono de la skill |

> **Fallback declarado:** la landing usa `JetBrains Mono` para code. La skill lo prohíbe
> ("Never JetBrains Mono"); se sustituye por `Geist Mono` conservando el rol mono.

## Contrast (verificado)

- `ink #0d3d38` sobre `paper #f6f8fb` → ~13.6:1 (AAA).
- `muted #48606f` sobre `paper` → ~5.6:1 (AA).
- `accent #0d9488` sobre `paper` → ~3.7:1 (usado en trazo/relleno, no en texto pequeño).
- `link #2f6f8e` sobre `paper` → ~4.9:1 (AA).

## Nota de fidelidad

- Paleta teal de marca mapeada a rol `accent`; el rol `link` (HTTP/externo) se deriva en
  la misma familia fría para seguir siendo distinguible del acento.
- No se cambió ningún contrato de código ni configuración del producto; esto es identidad visual.
