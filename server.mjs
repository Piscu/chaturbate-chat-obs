/**
 * Servidor local de la fuente de chat para OBS. Sin dependencias externas.
 *
 * Responsabilidades:
 *  - Servir el editor y la fuente de OBS.
 *  - Guardar la configuracion en disco (data/config.json) y los PNGs en data/assets/.
 *  - Mantener UNA sola conexion long-poll contra la Events API de Chaturbate y
 *    repartir los eventos por SSE a todas las fuentes abiertas en OBS.
 *  - Resolver emotes sueltos contra la API de Chaturbate, con cache en disco.
 *
 * El token nunca se envia a la fuente: solo vive en este proceso.
 */

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { DEFAULT_CONFIG, mergeDefaults } from './public/js/config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const ASSETS_DIR = path.join(DATA_DIR, 'assets');
const EMOTES_DIR = path.join(DATA_DIR, 'emotes');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

const PORT = Number(process.env.PORT || 8017);
const HOST = process.env.HOST || '127.0.0.1';
// Si el puerto esta ocupado se prueba el siguiente; asi un usuario que ya tiene
// algo en el 8017 no se queda mirando un proceso que muere sin explicacion.
const PORT_TRIES = 20;
// Abrir el navegador desde el servidor garantiza que ya esta escuchando.
const OPEN_BROWSER = process.env.OPEN === '1';
const EVENTS_HOST = 'eventsapi.chaturbate.com';
const TESTBED_HOST = 'testbed.eventsapi.chaturbate.com';
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

const ALLOWED_IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);

// ---------------------------------------------------------------- configuracion

let config = cloneDefaults();

function cloneDefaults() {
  return mergeDefaults({});
}

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    config = mergeDefaults(JSON.parse(raw));
    console.log(`[config] cargada desde ${CONFIG_FILE}`);
  } catch (err) {
    if (err.code === 'ENOENT') {
      config = cloneDefaults();
      console.log('[config] no existe, usando valores por defecto');
    } else {
      console.error('[config] error al leer, se usan valores por defecto:', err.message);
      config = cloneDefaults();
    }
  }
  return config;
}

let saveQueue = Promise.resolve();
let lastSaveError = null;

function saveConfig(next) {
  const merged = mergeDefaults(next);
  // La config en memoria se actualiza ya: el resto del proceso (el sondeo y las
  // respuestas de /api/config) deben ver el cambio sin esperar al disco.
  config = merged;
  // Se serializa aqui para que dos guardados seguidos no se pisen entre si.
  const payload = JSON.stringify(merged, null, 2);
  saveQueue = saveQueue.then(async () => {
    const tmp = CONFIG_FILE + '.tmp';
    await fsp.writeFile(tmp, payload, 'utf8');
    await fsp.rename(tmp, CONFIG_FILE);
    lastSaveError = null;
  }).catch((err) => {
    // Antes este error se perdia: el editor decia "guardado" y el cambio se
    // evaporaba al reiniciar. Se recuerda para poder responder con un fallo real.
    lastSaveError = err;
    console.error('[config] no se pudo guardar:', err.message);
  });
  return saveQueue;
}

/** Copia de la config sin el token, para la pagina de la fuente. */
function configForSource() {
  const clone = JSON.parse(JSON.stringify(config));
  if (clone.connection) clone.connection.token = '';
  return clone;
}

/**
 * Quita el token de cualquier texto antes de mostrarlo o registrarlo.
 *
 * El token viaja dentro de la URL de la Events API, asi que se cuela en los
 * errores de fetch ("Failed to parse URL from ...") y de ahi al detalle que la
 * insignia de conexion pinta en OBS. Se enmascara aqui y no en cada llamador:
 * un punto unico de salida no se puede saltar por olvido.
 *
 * Se cubre tambien la forma codificada porque un token pegado dentro de una URL
 * llega codificado. replaceAll con cadenas, no regex, para no escapar nada.
 *
 * Sin token configurado devuelve el texto intacto: replaceAll('', ...) insertaria
 * los asteriscos entre cada caracter de todos los mensajes.
 */
function scrub(text) {
  const value = String(text ?? '');
  const token = String(config?.connection?.token || '');
  if (!token) return value;
  return value.replaceAll(token, '***').replaceAll(encodeURIComponent(token), '***');
}

function connectionSignature(cfg) {
  const c = cfg.connection || {};
  return JSON.stringify([c.username, c.token, c.testbed, c.pollTimeout]);
}

// ---------------------------------------------------------------- upstream

/**
 * Estado del long-poll. Una sola lectura contra la API, ManyEventSource para el resto.
 */
const hub = {
  clients: new Set(),
  running: false,
  nextUrl: null,
  inFlight: false,
  stopRequested: false,
  consecutiveErrors: 0,
  status: { state: 'idle', detail: '', since: Date.now(), connectedAt: null, eventsSeen: 0 },
  recent: []
};

function setStatus(state, detail = '') {
  hub.status.state = state;
  hub.status.detail = scrub(detail);
  hub.status.since = Date.now();
  if (state === 'live') hub.status.connectedAt = Date.now();
  broadcast({ type: 'status', status: { ...hub.status } });
}

/**
 * Guarda los ultimos eventos en memoria para poder inspeccionarlos.
 * Sin esto no hay forma de saber si un mensaje no aparece porque la API no
 * lo entrego o porque el overlay lo filtro. Se expone en /api/events/recent.
 */
function recordEvent(ev) {
  const user = ev?.object?.user || {};
  hub.recent.push({
    at: Date.now(),
    method: ev?.method || '(desconocido)',
    user: user.username || '',
    isOwner: !!user.isOwner,
    colorGroup: user.colorGroup || '',
    text: String(ev?.object?.message?.message ?? ev?.object?.message?.orig ?? ev?.object?.tip?.message ?? '').slice(0, 120)
  });
  if (hub.recent.length > 40) hub.recent.shift();
}

function broadcast(payload) {
  const frame = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of hub.clients) {
    try {
      res.write(frame);
    } catch {
      hub.clients.delete(res);
    }
  }
}

function eventsBase(cfg) {
  return cfg.connection.testbed ? TESTBED_HOST : `https://${EVENTS_HOST}`;
}

function buildEventsUrl(cfg) {
  return `${eventsBase(cfg)}/events/${encodeURIComponent(cfg.connection.username)}/${encodeURIComponent(cfg.connection.token)}/?timeout=${Number(cfg.connection.pollTimeout) || 10}`;
}

/** El nextUrl lo decide el servidor: solo permitimos el host oficial, sin puerto raro. */
function isTrustedNextUrl(value, cfg) {
  if (typeof value !== 'string' || !value.startsWith('https://')) return false;
  try {
    const u = new URL(value);
    return u.hostname === new URL(eventsBase(cfg)).hostname && u.port === '';
  } catch {
    return false;
  }
}

async function pollOnce(cfg) {
  const url = isTrustedNextUrl(hub.nextUrl, cfg) ? hub.nextUrl : buildEventsUrl(cfg);
  const timeoutSec = Number(cfg.connection.pollTimeout) || 10;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), (timeoutSec + 20) * 1000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'chaturbate-obs-overlay/1.0', Accept: 'application/json' }
    });
    const text = await res.text();

    if (res.status === 401 || res.status === 403) {
      setStatus('auth-error', `Token rechazado (HTTP ${res.status}). Revisa usuario y token.`);
      hub.stopRequested = true;
      return;
    }

    // Un 400 con nextUrl es la continuacion normal cuando el long-poll expira.
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (data && typeof data.nextUrl === 'string' && isTrustedNextUrl(data.nextUrl, cfg)) {
      hub.nextUrl = data.nextUrl;
    } else {
      hub.nextUrl = null;
    }

    if (res.status === 400 && hub.nextUrl) {
      return;
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${scrub(text).slice(0, 200)}`);
    }

    hub.consecutiveErrors = 0;
    if (hub.status.state !== 'live') setStatus('live', 'Conectado a la Events API.');

    const events = Array.isArray(data?.events) ? data.events : [];
    for (const ev of events) {
      hub.status.eventsSeen += 1;
      recordEvent(ev);
      broadcast({ type: 'event', event: ev });
    }
    if (config.advanced?.debug) {
      for (const ev of events) console.log('[event]', ev?.method, scrub(JSON.stringify(ev?.object ?? {})).slice(0, 300));
    }
    if (events.length === 0 && !hub.nextUrl) await sleep(500);
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pollLoop() {
  if (hub.running) return;
  hub.running = true;
  hub.stopRequested = false;
  hub.consecutiveErrors = 0;

  try {
    const cfg = config;
    if (!cfg.connection?.token) {
      setStatus('no-token', 'Falta el token de la Events API. Anadelo en el editor.');
      return;
    }
    if (!cfg.connection?.username) {
      setStatus('no-user', 'Falta el usuario de Chaturbate.');
      return;
    }

    setStatus('connecting', 'Abriendo la Events API...');

    while (!hub.stopRequested && !config.__restart) {
      hub.inFlight = true;
      try {
        await pollOnce(cfg);
      } catch (err) {
        if (err.name === 'AbortError') {
          // Expirar el long-poll es lo normal, no un fallo: no acumular errores.
          hub.consecutiveErrors = 0;
          setStatus('retrying', 'El long-poll expiro, reintentando...');
        } else {
          hub.consecutiveErrors += 1;
          setStatus('error', `Error de red: ${err.message}`);
          // Si el cursor queda viejo el servidor lo rechaza: lo soltamos.
          if (hub.consecutiveErrors >= 5) hub.nextUrl = null;
        }
        const wait = Math.max(500, Number(config.connection.reconnectMs) || 3000);
        await sleep(Math.min(wait * hub.consecutiveErrors, 15000));
      } finally {
        hub.inFlight = false;
      }
    }
  } finally {
    hub.running = false;
    const restart = config.__restart === true;
    delete config.__restart;
    if (restart) setImmediate(runPollLoop);
  }
}

/**
 * Lanza el bucle de sondeo sin dejar rechazos sin capturar. En Node 15+ un
 * rechazo sin catch termina el proceso, y el servidor se evaporaba en silencio
 * a mitad de un guardado.
 */
function runPollLoop() {
  Promise.resolve()
    .then(pollLoop)
    .catch((err) => {
      console.error('[poll] el bucle de sondeo fallo:', scrub(err?.message || err));
      hub.running = false;
      setTimeout(runPollLoop, 3000);
    });
}

function restartPolling() {
  hub.nextUrl = null;
  hub.consecutiveErrors = 0;
  hub.stopRequested = false;
  // Si el bucle esta vivo se le pide que pare y se relance solo al salir.
  if (hub.running) {
    config.__restart = true;
    return;
  }
  runPollLoop();
}

// ---------------------------------------------------------------- emotes

async function resolveEmote(slug, room) {
  const key = String(slug || '').trim();
  if (!key) return null;
  const cacheFile = path.join(EMOTES_DIR, (key.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'x') + '.json');

  try {
    const cached = JSON.parse(await fsp.readFile(cacheFile, 'utf8'));
    return cached;
  } catch { /* sin cache */ }

  const endpoint = `https://chaturbate.com/api/ts/emoticons/autocomplete/?slug=${encodeURIComponent(key)}&room=${encodeURIComponent(room || '')}`;
  let result = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(endpoint, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', Referer: 'https://chaturbate.com/' }
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data?.emoticons) ? data.emoticons : [];
      const want = key.toLowerCase();
      // Chaturbite devuelve coincidencias aproximadas: gana la exacta (ignorando mayusculas).
      const exact = list.find((e) => String(e.slug).toLowerCase() === want) || list[0];
      if (exact?.url) {
        result = { slug: exact.slug, url: exact.url, width: exact.width || 0, height: exact.height || 0 };
        await fsp.writeFile(cacheFile, JSON.stringify(result), 'utf8').catch(() => {});
      }
    }
  } catch { /* sin emote */ }

  return result;
}

// ---------------------------------------------------------------- utilidades HTTP

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(body);
}

function readBody(req, limit = MAX_UPLOAD_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('Cuerpo demasiado grande'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function sendFile(res, filePath, { cache = false } = {}) {
  try {
    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) throw new Error('no es un archivo');
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': cache ? 'public, max-age=86400' : 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
    return true;
  } catch {
    return false;
  }
}

/** Sirve un archivo dentro de un directorio evitando salir de el con .. */
function safeJoin(baseDir, relative) {
  const target = path.resolve(baseDir, '.' + path.posix.normalize('/' + relative));
  const base = path.resolve(baseDir);
  if (target !== base && !target.startsWith(base + path.sep)) return null;
  return target;
}

async function listAssets() {
  try {
    const names = await fsp.readdir(ASSETS_DIR);
    const out = [];
    for (const name of names) {
      const ext = path.extname(name).toLowerCase();
      if (!ALLOWED_IMAGE_EXT.has(ext)) continue;
      const stat = await fsp.stat(path.join(ASSETS_DIR, name));
      out.push({ name, url: `/assets/${name}`, bytes: stat.size, mtime: stat.mtimeMs });
    }
    out.sort((a, b) => b.mtime - a.mtime);
    return out;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------- rutas

async function handleApi(req, res, url) {
  const { pathname } = url;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return true;
  }

  if (pathname === '/api/config' && req.method === 'GET') {
    const view = url.searchParams.get('view');
    sendJson(res, 200, view === 'source' ? configForSource() : config);
    return true;
  }

  if (pathname === '/api/config' && (req.method === 'PUT' || req.method === 'POST')) {
    try {
      const body = JSON.parse((await readBody(req, 4 * 1024 * 1024)).toString('utf8') || '{}');
      const before = connectionSignature(config);
      await saveConfig(body);
      if (lastSaveError) {
        sendJson(res, 500, { ok: false, error: 'No se pudo guardar en disco: ' + lastSaveError.message });
        return true;
      }
      const after = connectionSignature(config);
      if (before !== after) restartPolling();
      sendJson(res, 200, { ok: true, restarted: before !== after });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
    }
    return true;
  }

  if (pathname === '/api/status') {
    sendJson(res, 200, { ...hub.status, clients: hub.clients.size, saveError: lastSaveError?.message || null });
    return true;
  }

  // Ultimos eventos recibidos, para diagnosticar "no me sale mi mensaje".
  if (pathname === '/api/events/recent') {
    sendJson(res, 200, { events: [...hub.recent].reverse() });
    return true;
  }

  if (pathname === '/api/events/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no'
    });
    res.write('retry: 2000\n\n');
    res.write(`data: ${JSON.stringify({ type: 'status', status: { ...hub.status } })}\n\n`);
    hub.clients.add(res);

    const heartbeat = setInterval(() => {
      try { res.write(': ping\n\n'); } catch { /* cerrado */ }
    }, 15000);

    const cleanup = () => {
      clearInterval(heartbeat);
      hub.clients.delete(res);
    };
    req.on('close', cleanup);
    req.on('error', cleanup);

    // Si no habia ningun lector, nadie habia arrancado el loop de sondeo.
    if (!hub.running) runPollLoop();
    return true;
  }

  if (pathname === '/api/emote' && req.method === 'GET') {
    const slug = url.searchParams.get('slug') || '';
    const result = await resolveEmote(slug, config.connection?.username);
    sendJson(res, result ? 200 : 404, result || { error: 'emote no encontrado' });
    return true;
  }

  if (pathname === '/api/assets' && req.method === 'GET') {
    sendJson(res, 200, { assets: await listAssets() });
    return true;
  }

  if (pathname === '/api/assets' && req.method === 'POST') {
    try {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      const dataUrl = String(body.dataUrl || '');
      const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg|gif|webp));base64,(.+)$/i);
      if (!match) {
        sendJson(res, 400, { ok: false, error: 'Formato de imagen no válido (usa PNG, JPG, GIF o WEBP).' });
        return true;
      }
      const buffer = Buffer.from(match[3], 'base64');
      if (buffer.length > MAX_UPLOAD_BYTES) {
        sendJson(res, 413, { ok: false, error: 'La imagen supera el límite de 12 MB.' });
        return true;
      }
      const ext = match[2].toLowerCase() === 'jpeg' ? '.jpg' : '.' + match[2].toLowerCase();
      const base = String(body.name || 'imagen')
        .replace(/\.[^.]+$/, '')
        .normalize('NFD').replace(/[^\w\s-]/g, '').trim()
        .replace(/\s+/g, '-').toLowerCase().slice(0, 48) || 'imagen';
      const fileName = `${base}-${crypto.randomBytes(4).toString('hex')}${ext}`;
      await fsp.writeFile(path.join(ASSETS_DIR, fileName), buffer);
      sendJson(res, 200, { ok: true, name: fileName, url: `/assets/${fileName}`, bytes: buffer.length });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
    }
    return true;
  }

  const delMatch = pathname.match(/^\/api\/assets\/([^/]+)$/);
  if (delMatch && req.method === 'DELETE') {
    const target = safeJoin(ASSETS_DIR, delMatch[1]);
    if (!target) {
      sendJson(res, 400, { ok: false, error: 'ruta no válida' });
      return true;
    }
    await fsp.unlink(target).catch(() => {});
    sendJson(res, 200, { ok: true });
    return true;
  }

  return false;
}

// ---------------------------------------------------------------- servidor

const server = http.createServer(async (req, res) => {
  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  } catch {
    res.writeHead(400).end('URL inválida');
    return;
  }

  try {
    if (url.pathname.startsWith('/api/')) {
      if (await handleApi(req, res, url)) return;
      sendJson(res, 404, { error: 'endpoint no encontrado' });
      return;
    }

    if (url.pathname.startsWith('/assets/')) {
      const target = safeJoin(ASSETS_DIR, url.pathname.slice('/assets/'.length));
      if (target && await sendFile(res, target, { cache: true })) return;
      res.writeHead(404).end('no encontrado');
      return;
    }

    if (url.pathname === '/' || url.pathname === '/editor') {
      if (await sendFile(res, path.join(PUBLIC_DIR, 'editor.html'))) return;
      res.writeHead(404).end('falta editor.html');
      return;
    }

    if (url.pathname === '/source' || url.pathname === '/chat') {
      if (await sendFile(res, path.join(PUBLIC_DIR, 'source.html'))) return;
      res.writeHead(404).end('falta source.html');
      return;
    }

    const target = safeJoin(PUBLIC_DIR, url.pathname);
    if (target && await sendFile(res, target)) return;

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404');
  } catch (err) {
    console.error('[server]', err);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('error interno');
  }
});

// ---------------------------------------------------------------- arranque

/** Abre el editor en el navegador por defecto (solo con OPEN=1). */
function openBrowser(url) {
  const cmd = process.platform === 'win32'
    ? `start "" "${url}"`
    : process.platform === 'darwin'
      ? `open "${url}"`
      : `xdg-open "${url}"`;
  exec(cmd, () => { /* si no hay navegador, se ignora */ });
}

function onListening(port) {
  const shown = HOST === '0.0.0.0' ? 'localhost' : HOST;
  console.log('');
  console.log('  Chaturbate OBS Overlay');
  console.log('  ------------------------');
  console.log(`  Editor      : http://${shown}:${port}/`);
  console.log(`  Fuente OBS  : http://${shown}:${port}/source`);
  console.log(`  Usuario     : ${config.connection?.username || '(sin definir)'}`);
  console.log(`  Token       : ${config.connection?.token ? 'configurado' : 'FALTA GENERARLO'}`);
  console.log('');
  if (config.connection?.token) runPollLoop();
  if (OPEN_BROWSER) openBrowser(`http://${shown}:${port}/`);
}

/**
 * Escucha en `port` y, si esta ocupado, prueba el siguiente hasta agotar
 * PORT_TRIES. Se usa `once` para que el reintento no quede atrapado por el
 * manejador anterior.
 */
function listen(port, remaining) {
  // Se registran a mano (no como callback de listen) para poder quitarlos: si
  // el intento falla, el listener de 'listening' quedaria vivo y el banner
  // saldria dos veces al acertar con el puerto siguiente.
  const onReady = () => {
    server.off('error', onError);
    server.on('error', (err) => console.error('[server]', err));
    onListening(port);
  };

  const onError = (err) => {
    server.off('listening', onReady);
    if (err.code === 'EADDRINUSE' && remaining > 0) {
      console.log(`[puerto] ${port} ocupado, probando ${port + 1}...`);
      listen(port + 1, remaining - 1);
      return;
    }
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[error] No hay puerto libre entre ${PORT} y ${port}.`);
      console.error('        Cierra el otro proceso o arranca con otro puerto:  set PORT=8018  &&  node server.mjs\n');
    } else {
      console.error('[error]', err);
    }
    process.exit(1);
  };

  server.once('error', onError);
  server.once('listening', onReady);
  server.listen(port, HOST);
}

async function main() {
  await fsp.mkdir(ASSETS_DIR, { recursive: true });
  await fsp.mkdir(EMOTES_DIR, { recursive: true });
  loadConfig();
  listen(PORT, PORT_TRIES);
}

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log('\n[cerrando]');
    for (const client of hub.clients) {
      try { client.end(); } catch { /* ignorado */ }
    }
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1500);
  });
}

// Sin esto, cualquier rechazo o excepcion fuera de una promesa deja el proceso
// muerto sin explicacion: el servidor disappears y parece un fallo de OBS.
process.on('unhandledRejection', (reason) => {
  console.error('[server] rechazo sin capturar:', scrub(reason?.message || reason));
});
process.on('uncaughtException', (err) => {
  console.error('[server] excepcion sin capturar:', scrub(err?.message || err));
});

main();
