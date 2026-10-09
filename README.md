# Brainacho 🧠

App de escritorio (Mac) que mide la "energía" de tu espacio de trabajo: ruido, pausas y ritmo del día. Te da un puntaje de 0 a 100 y un coach con humor que te avisa cuando tu cuerpo o tu ambiente necesitan algo.

## Correrla

```bash
npm install
npm start
```

Al primer arranque macOS te pide permiso de micrófono. Para dejarla como app: `npm run dist` (genera el `.app`/`.dmg` en `dist/`).

## Qué mide

| Señal | Cómo | Permisos |
|---|---|---|
| Ruido (dB aprox., Leq de 5 min, picos) | Web Audio API, solo números | Micrófono |
| "Voz alrededor" | % de energía en 300–3400 Hz (heurística, no reconoce habla) | Micrófono |
| Actividad / pausas reales | `powerMonitor.getSystemIdleTime()` (activo < 1 min de inactividad; pausa ≥ 5 min) | Ninguno |
| Ritmo del día | Curva circadiana genérica; con 3+ días usa tus horas más activas | Ninguno |

**Puntaje** = 40 % ruido + 35 % pausas + 25 % ritmo (sin micrófono se reparte entre los otros dos).

## Privacidad

El audio nunca se graba ni se guarda: se calcula el nivel y el espectro cada segundo y se descarta. En disco quedan solo números por hora, en `~/Library/Application Support/Brainacho/days/AAAA-MM-DD.json`.

## Límites honestos

- Los dB son **relativos** hasta que calibrás (Ajustes → medí con otro sonómetro, ej. una app del celu). El micrófono de una Mac no es un sonómetro.
- Los umbrales (55 dB para concentrarse, pausa cada ~60 min) son recomendaciones generales de ergonomía, no un diagnóstico médico.

## Estructura

- `src/core/` lógica pura y testeada (`npm test`): análisis de audio, puntaje, sesión del día, coach, insights, almacenamiento.
- `src/main.js` proceso principal (bandeja, notificaciones, inactividad); `src/renderer/` interfaz y captura de audio.
