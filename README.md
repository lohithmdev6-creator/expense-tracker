# Expense Tracker (offline PWA)
All data stays on your device (IndexedDB via Dexie). No backend, no login, no analytics.
## Run
`npm install && npm run dev` · build with `npm run build` (output in `dist/`).
## Deploy
**Netlify:** drag the `dist/` folder onto app.netlify.com/drop (or connect the repo; build `npm run build`, publish `dist`).
**GitHub Pages:** push `dist/` to a `gh-pages` branch (or use an Actions deploy). `base` is `./`, so sub-paths work.
## Install on Android
Open the deployed HTTPS URL in Chrome → ⋮ menu → Install app. After first load it works in airplane mode.
Back up regularly from More → Back up all data.
