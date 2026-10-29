# AGENTS.md

Chat de Chaturbate para OBS. Fuente de navegador + editor web, **sin dependencias**: solo
`node server.mjs`. Todo el texto (README, comentarios, etiquetas y `hint` del editor) va en
**español**; los textos que ve el usuario del editor salen de `SCHEMA` en `config.mjs`, no de
`editor.mjs`. Los comentarios del código evitan los acentos casi siempre, pero el README los
usa a diario y no es una restricción: no lo trates como norma.

## Comandos

```bash
node server.mjs            # editor en /, fuente OBS en /source, puerto 8017
node --check server.mjs    # única verificación disponible: no hay test, lint ni build
PORT=8018 node server.mjs  # en PowerShell: $env:PORT=8018
```

No hay `package.json` ni `node_modules`; **no añadas dependencias**. Todo es Node 18+
(`fetch`, `AbortController`, ESM nativo). Instalación portable de Node en
`%LOCALAPPDATA%\Programs\nodejs`, ya en el PATH del usuario.

Smoke test con el servidor arriba (`Invoke-RestMethod` o `curl`):

```bash
curl http://127.0.0.1:8017/api/status          # state debe ser "live" con token válido
curl http://127.0.0.1:8017/api/config?view=source   # NUNCA debe incluir connection.token
```

## Cómo está cableado

- `server.mjs` mantiene **un solo long-poll** contra la Events API y reparte por SSE
  (`/api/events/stream`). Un `HTTP 400` **con `nextUrl` es la continuación normal**, no un
  error; un AbortError por timeout tampoco lo es. No los trates como fallos.
- `pollLoop` captura `const cfg = config` una vez por ejecución. Cambios de conexión se
  aplican con `restartPolling()` vía el flag `config.__restart`, que consume el propio bucle
  al salir. `PUT /api/config` solo reinicia si cambia `connectionSignature`
  (username/token/testbed/pollTimeout).
- `public/js/config.mjs` es la **única fuente de verdad** de la configuración: `DEFAULT_CONFIG`,
  `THEME_PRESETS`, `SCHEMA` (las 8 pestañas) y `mergeDefaults`. Lo importan **el servidor y el
  navegador por igual** (ruta `./public/js/config.mjs` en `server.mjs:21`).

## Añadir un ajuste (el flujo obligatorio)

1. `DEFAULT_CONFIG` en `config.mjs` — valor por defecto y tipo. `mergeDefaults` **descarta
   valores cuyo tipo no coincida** con el del default, así que el default fija el tipo.
2. Una entrada en `SCHEMA` (`config.mjs`) con `key` en notación de punto (`theme.accentColor`).
   Tipos disponibles en `buildControl` (`editor.mjs:157`): `bool`, `number`, `range`, `text`,
   `password`, `textarea`, `select`, `color`, `image`, `preset`, `group`, `list`, `importer`,
   `assetlib`. Si el control no existe, **agrégalo en `buildControl` con su `sync()`**;
   `renderField` solo despacha los tipos especiales.
3. Consumirlo en `source.mjs` con `getPath(cfg, 'mi.clave')`. Los estilos pasan por variables
   CSS en `applyStyles`, no por estilos inline dispersos.

## Reglas que no son obvias

- **Nunca filtres el token a mano.** Todo texto que salga a log o al cliente pasa por
  `scrub()` (`server.mjs:123`), que enmascara el token plano y el codificado con
  `encodeURIComponent`. El token viaja en la URL de la Events API y se cuela en los errores de
  `fetch`. Si añades un `console.log` o un `sendJson` con datos de conexión, usa `scrub()`.
- `/api/config` **sí** devuelve el token (lo necesita el editor); `?view=source` lo vacía.
  Mantén esa asimetría.
- **Guardar es atómico y encolado** (`saveQueue`, `CONFIG_FILE + '.tmp'` + `rename`) y devuelve error
  real si falla el disco (`lastSaveError` → HTTP 500). No escribas `config.json` a mano para
  "depurar": pásalo por `mergeDefaults`.
- **El editor no habla con la fuente por red**: la vista previa usa `postMessage`
  (`cb-preview-ready` / `cb-preview-config` / `cb-preview-demo`) contra un iframe de
  `/source?preview`. En `?preview` la fuente **no** abre SSE y la config se fusiona con
  `mergeDefaults` para que un borrador incompleto no la rompa. Para probar en OBS usa la URL
  real, no la vista previa.
- El token real vive **solo** en `data/config.json`, y `data/` está en `.gitignore`. No lo
  muevas fuera de `data/`, no lo imprimas y no lo pegues en ejemplos, commits ni capturas.
- Parámetros de la fuente: `?w=&h=` (tamaño lógico del lienzo), `?marquee=1` (solo marquesina),
  `?preview` (solo editor). El tamaño que cambies en el editor **no** llega solo a OBS: hay que
  actualizar `w`/`h` en la URL de la fuente.
- En `source.mjs`, el filtro del broadcaster (`isBroadcaster`, `onMessage`) oculta tus propios
  mensajes por diseño; `chat.showOwnMessages` y `events.notices.enabled` son los dos
  interruptores de prueba. Si documentas o tocas esto, que siga siendo el comportamiento por
  defecto de "no duplicar en tu propio stream".
- **El render del chat es DOM, no `innerHTML`** (`chat.mjs` usa `createElement`/`textContent`).
  Mantenlo así: el texto viene de usuarios desconocidos y no debe ejecutarse.
- `data/emotes/*.json` es una **caché en disco** generada por `/api/emote`. Es desechable; no la
  edites a mano ni la versionees.

## Antes de dar algo por terminado

- `node --check` en `server.mjs` y en los 6 módulos de `public/js/`.
- Si tocaste `config.mjs`: confirma que `/api/config?view=source` sigue sin `connection.token`.
- Si tocaste el editor: recarga y comprueba en `/` que la pestaña nueva aparece; mira la
  consola del navegador, no solo el estado de red.
- El estado de la conexión se ve en `/api/status` y en `/api/events/recent` (últimos 40 eventos
  recibidos) — es lo primero que hay que mirar cuando "no me sale mi mensaje": distinguishes
  "la API no lo entregó" de "el overlay lo filtró".
- `README.md` es la referencia de uso para el usuario final (instalación, OBS, token,
  troubleshooting). Si cambias una opción, un parámetro de URL o un endpoint, actualízalo en el
  mismo commit.

  ## Si se sube un repositorio a Github deja vacio el usuario y el token
    **Si se sube un repositorio a Github deja vacio el usuario y el token**