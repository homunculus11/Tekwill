# Tekwill App – Development Guide

Quick setup and workflow for local development.

## Prerequisites

- Node.js 18+ (recommended)
- npm

## Install dependencies

```bash
npm install
```

## Development workflow

1. Start Tailwind watch mode:

```bash
npm run watch:css
```

2. Open the app in the browser:
   - Main page: `index.html`
   - Other pages: `prototype.html`, `src/login.html`

You can open files directly, but using a local static server (for example VS Code Live Server) is recommended during development.

## Build CSS for production

```bash
npm run build:css
```

This discovers all `*.tailwind.css` files in the workspace and compiles each one to a matching `.css` file (same path, same filename without `.tailwind`).

Examples:

- `css/index.tailwind.css` → `css/index.css`
- `css/prototype.tailwind.css` → `css/prototype.css`

## Deploy to GitHub Pages (auto build + publish)

This repository includes a workflow at `.github/workflows/pages.yml` that:

1. Installs dependencies
2. Runs `npm run build` (Tailwind compile)
3. Publishes the built static site to GitHub Pages

### One-time setup in GitHub

1. Push the repo to GitHub (default branch should be `main`)
2. Open **Settings → Pages**
3. Set **Source** to **GitHub Actions**
4. Push to `main` (or run workflow manually from Actions tab)

The site artifact includes:

- `index.html`
- `prototype.html`
- `assets/`, `css/`, `images/`, `js/`, `src/`

## Notes for project Pages URLs

When hosted at `https://<user>.github.io/<repo>/`, root-absolute links like `/login` break.
Use repository-safe relative/hash links in HTML (already applied in `index.html`).

## Project structure

- `index.html` – main landing page
- `prototype.html` – extra/prototype page
- `src/login.html` – login page
- `js/script.js` – frontend behavior and data fetch logic
- `css/styles.css` – shared design tokens (colors and related CSS variables)
- `*.tailwind.css` – Tailwind source styles (auto-discovered)
- `css/index.css` – generated CSS used by `index.html` and `src/login.html` (do not edit manually)
- `css/prototype.css` – generated CSS used by `prototype.html` (do not edit manually)
- `tailwind.config.js` – Tailwind config and content scan paths

## Notes

- `npm run watch:css` automatically picks up new `*.tailwind.css` files and starts watching them.
- The project uses Tailwind utility classes plus custom theme tokens from the config.
