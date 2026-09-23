# Model Previewer

A browser-local STL viewer with a point-to-point surface ruler. Model files are read only by the browser; the application has no API, upload, storage, or telemetry path.

## Local development

```bash
npm install
npm run dev
```

Run the regression suite and production build:

```bash
npm test
npm run build
```

## Cloudflare Pages

Create a Pages project from this repository and use:

```text
Build command: npm run build
Build output directory: dist
```

No Worker is required. The deployable application is the generated static `dist/` directory.

## Measurement convention

STL does not encode units. Model Previewer interprets coordinates as millimetres, which is the normal 3D-printing convention. Use the Ruler control, then click two model-surface points to obtain their straight-line (Euclidean) distance.
