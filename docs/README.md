# JYPTrendApp Docs

Este archivo replica el resumen tecnico vigente del repo para referencia dentro de `docs/`.

La fuente de referencia principal es [README.md](/c:/01_DevSebas/JYPTrendApp/README.md).

## Estado actual

- Version en repo: `v1.5.0` (`public/version.json`, fecha `2026-03-19`).
- Frontend estatico en `public/` sin build step.
- Estructura modular vigente:
  - `public/js/app/`
  - `public/js/features/`
  - `public/js/shared/`
  - `public/js/vendor/`
- Wrappers legacy mantenidos por compatibilidad:
  - `public/js/*.js`
  - `public/js/components/*.js`

## Documentacion operativa

- Contexto del proyecto: `docs/project-context.md`
- Arquitectura backend/Supabase: `docs/supabase-architecture-final.md`
- Riesgo vigente de compatibilidad:
  - `public/sw.js` ya precachea rutas modulares reales; tras la tercera limpieza controlada solo queda una superficie legacy minima en `public/js/cart.js` y `public/js/components/`.
