# Dynamite Band website

Static one-page site built with Vite and Tailwind CSS.

## Run locally

```bash
npm install
npm run dev
```

## Where to edit

- Contact details and YouTube videos: `src/scripts/config.js` (email, Zalo, WhatsApp, video IDs)
- Pages: `index.html`, `videos.html`, `booking.html`
- Member portfolio links: the `href` on each member card in `index.html`
- Brand colour: `--color-accent` in `src/css/style.css`
- Photos: `public/images/` (the hero photo is `hero.jpg`)

## Deploy

Pushing to `main` builds the site and publishes it with GitHub Pages
(workflow in `.github/workflows/static.yml`; Settings > Pages > Source must be "GitHub Actions").

## Custom domain (later)

All asset paths are relative, so the same build works on any domain. After buying a domain:
add it in Settings > Pages > Custom domain, set the DNS records GitHub shows, then update the URLs in
`index.html`, `videos.html`, `booking.html` (canonical, og:url, og:image, JSON-LD), `public/robots.txt` and `public/sitemap.xml`.
