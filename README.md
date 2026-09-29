# lhub — Learning Hub

A growing collection of self-contained learning modules (syllabus + examples + quiz), each a single static HTML file, hosted via GitHub Pages.

## Structure

- `docs/index.html` — landing page listing all modules
- `docs/<module>.html` — one module per topic, e.g. `think_in_english.html`

Each module is a standalone HTML file (no build step, no dependencies) so it can be opened locally or served as-is by GitHub Pages.

## Hosting

GitHub Pages is served from the `docs/` folder on the `master` branch. In the repo settings on GitHub: **Settings → Pages → Source: Deploy from a branch → master / docs**.

## Workflow

New modules are added by request: a topic comes in, a module is built following the existing visual style, linked from `docs/index.html`, then committed and pushed.
