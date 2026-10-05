# Notas Remotion (Brainacho)

## Qué hay guardado
- `.claude/skills/` — skills oficiales de Remotion (se cargan al iniciar sesión desde esta rama).
- `prueba-remotion/` — dos tomas de texto animado 1080x1920 sobre azul Francia (#318CE7):
  - `Prueba` (`src/Composition.tsx`, `src/Background.tsx`): versión 1.
  - `PruebaToma2` (`src/opus/`): versión 2 (pelota con física, capas 3D, fichas tipo aeropuerto, semitono, loop perfecto).

## Usar en tu PC
```bash
cd prueba-remotion && npm i && npm run dev      # Studio con preview
npx remotion render PruebaToma2 out/toma2.mp4   # exportar MP4
```

## Trucos aprendidos en la nube
- Chromium local: `--browser-executable=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell`
- Google Fonts falla por el proxy: bajar el `.woff2` con curl a `public/` y cargarlo con `@remotion/fonts`.
- 2D renderiza en ~1,5 min; 3D con Three.js es mucho más lento (se descartó el Fusca).
- Verificar rápido con `npx remotion still <Comp> out/x.png --frame=N` antes de renderizar todo.
- Animar solo con `useCurrentFrame()`; nada de CSS transitions.
