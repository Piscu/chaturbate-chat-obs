/**
 * Arranque de la fuente de OBS.
 *
 * Recibe los eventos por SSE desde el servidor local (que a su vez mantiene una
 * unica conexion long-poll contra la Events API) y los pinta en el chat.
 * Tambien vigila la configuracion para reflejar los cambios del editor sin
 * necesidad de recargar la fuente a mano.
 */

import { getPath, mergeDefaults, buildColor } from './config.mjs';
import { EmoteResolver } from './emotes.mjs';
import { ChatView } from './chat.mjs';
import { TipMarquee } from './marquee.mjs';

const el = {
  stage: document.getElementById('stage'),
  panel: document.getElementById('panel'),
  liveBadge: document.getElementById('liveBadge'),
  liveLabel: document.getElementById('liveLabel'),
  header: document.getElementById('header'),
  headerTitle: document.getElementById('headerTitle'),
  logo: document.getElementById('logo'),
  connBadge: document.getElementById('connBadge'),
  chat: document.getElementById('chat'),
  marquee: document.getElementById('marquee'),
  marqueeEmpty: document.getElementById('marqueeEmpty'),
  debug: document.getElementById('debug')
};

let cfg = null;
let isLive = false;
let statusState = 'idle';

const resolver = new EmoteResolver(true);
const chat = new ChatView(el.chat, resolver);
const marquee = new TipMarquee(el.marquee, el.marqueeEmpty);

const debugLines = [];
function log(...parts) {
  const line = parts.map((p) => (typeof p === 'string' ? p : JSON.stringify(p))).join(' ');
  debugLines.push(new Date().toLocaleTimeString() + ' ' + line);
  if (debugLines.length > 12) debugLines.shift();
  if (cfg?.advanced?.debug) el.debug.textContent = debugLines.join('\n');
}

// ------------------------------------------------------------------ estilos

// Normaliza un porcentaje 0-100 a factor 0-1 acotado.
const pct = (v) => Math.max(0, Math.min(100, Number(v) || 0)) / 100;

// Activa exactamente una clase de un grupo tipo "prefijo-valor".
function setOneClass(node, prefix, options, value) {
  for (const opt of options) node.classList.toggle(prefix + '-' + opt, opt === value);
}

function applyStyles(next) {
  const root = document.documentElement.style;
  const set = (k, v) => root.setProperty(k, v);

  set('--text-color', next.theme.textColor);
  set('--font-family', next.theme.fontFamily);
  set('--accent-color', next.theme.accentColor);
  set('--panel-bg', next.theme.panelBg);
  set('--panel-border', next.theme.panelBorder);
  set('--panel-radius', next.theme.panelRadius + 'px');
  set('--backdrop-blur', next.theme.backdropBlur + 'px');
  set('--panel-gap', next.layout.gap + 'px');

  set('--chat-font-size', next.chat.fontSize + 'px');
  set('--chat-line-height', next.chat.lineHeight);
  set('--chat-font-weight', String(next.chat.fontWeight));
  set('--user-color', next.chat.usernameColor);
  set('--message-color', next.chat.messageColor);
  set('--notice-color', getPath(next, 'events.notices.color', '#ffffff'));
  set('--badge-gap', next.chat.badgeGap + 'px');
  set('--chat-gap', next.chat.gap + 'px');
  set('--emote-size', next.chat.emoteSize + 'px');
  set('--avatar-size', next.chat.avatarSize + 'px');
  set('--badge-size', next.chat.badgeSize + 'px');
  set('--tip-accent', next.theme.accentColor);

  // Estilo de los mensajes: variables + una clase por grupo de opciones.
  set('--msg-bg', next.chat.messageBg);
  set('--msg-radius', next.chat.messageRadius + 'px');
  set('--msg-pad-x', next.chat.messagePaddingX + 'px');
  set('--msg-pad-y', next.chat.messagePaddingY + 'px');
  // Halo del estilo "sable": sale del color de acento, nunca de un dorado fijo.
  set('--msg-glow', buildColor(next.theme.accentColor, 0.38));
  setOneClass(el.chat, 'style', ['plain', 'bubble', 'card', 'glass', 'zebra', 'outline', 'saber'], next.chat.messageStyle);
  setOneClass(el.chat, 'username', ['normal', 'bold', 'uppercase', 'italic', 'outline'], next.chat.usernameStyle);
  setOneClass(el.chat, 'avatar', ['circle', 'rounded', 'square'], next.chat.avatarShape);
  el.chat.classList.toggle('username-glow', !!next.chat.usernameGlow);
  el.chat.classList.toggle('username-stroke', !!next.chat.usernameStroke);
  el.chat.classList.toggle('text-shadow', !!next.chat.textShadow);
  el.chat.classList.toggle('dividers', !!next.chat.showDividers);

  set('--marquee-height', next.tipMenu.height + 'px');
  set('--marquee-font-size', next.tipMenu.fontSize + 'px');
  set('--marquee-font-weight', String(next.tipMenu.fontWeight));
  set('--marquee-color', next.tipMenu.color);
  set('--marquee-bg', next.tipMenu.bg);
  set('--marquee-item-gap', next.tipMenu.itemGap + 'px');

  // Fondo: imagen en la capa ::before y opacidad solo sobre esa capa,
  // de modo que el chat nunca se atenúa con el fondo.
  if (next.assets.backgroundImage) {
    el.stage.style.setProperty('--bg-image', `url("${next.assets.backgroundImage}")`);
    el.stage.style.setProperty('--bg-fit', next.assets.backgroundFit || 'cover');
    el.stage.style.setProperty('--bg-opacity', String(pct(next.assets.backgroundOpacity)));
  } else {
    el.stage.style.removeProperty('--bg-image');
    el.stage.style.removeProperty('--bg-fit');
    el.stage.style.setProperty('--bg-opacity', '1');
  }

  // Opacidad global del panel (multiplica la transparencia de panelBg).
  el.panel.style.opacity = String(pct(next.theme.panelOpacity));

  // Logo
  if (next.assets.logo) {
    el.logo.style.display = '';
    el.logo.src = next.assets.logo;
    if (next.assets.logoWidth > 0) el.logo.style.width = next.assets.logoWidth + 'px';
    else el.logo.style.width = '';
  } else {
    el.logo.style.display = 'none';
    el.logo.removeAttribute('src');
  }

  el.header.classList.toggle('on', !!next.header.enabled);
  el.headerTitle.textContent = next.header.title || '';
  el.liveBadge.classList.toggle('on', !!next.events.status.showLiveIndicator);
  el.connBadge.classList.toggle('on', !!next.advanced.showConnectionBadge);
  el.debug.classList.toggle('on', !!next.advanced.debug);
  el.chat.classList.toggle('off', !next.chat.enabled);
}

function applyPosition(next) {
  const panel = el.panel;
  const p = next.layout;
  const ox = Math.max(0, Number(p.offsetX) || 0);
  const oy = Math.max(0, Number(p.offsetY) || 0);
  const width = Math.max(80, Number(p.width) || 420);
  const height = Math.max(80, Number(p.height) || 560);

  // "top-center" -> v=top, h=center ;  "center" -> v=center, h=center
  const parts = String(p.position || 'bottom-left').split('-');
  const v = parts[0];
  const h = parts[1] || 'center';

  panel.style.transform = '';
  panel.style.left = panel.style.right = panel.style.top = panel.style.bottom = '';

  if (v === 'center') {
    panel.style.top = '50%';
    panel.style.bottom = 'auto';
    panel.style.transform = 'translateY(-50%)';
  } else if (v === 'top') {
    panel.style.top = oy + 'px';
    panel.style.bottom = 'auto';
  } else {
    panel.style.bottom = oy + 'px';
    panel.style.top = 'auto';
  }

  if (h === 'left') {
    panel.style.left = ox + 'px';
    panel.style.right = 'auto';
  } else if (h === 'right') {
    panel.style.right = ox + 'px';
    panel.style.left = 'auto';
  } else {
    panel.style.left = '50%';
    panel.style.right = 'auto';
    panel.style.transform += ' translateX(-50%)';
  }

  // En los laterales el panel ocupa lo que digas; centrado, se estira hasta el
  // ancho maximo configurado para que la marquesina cruce la fuente.
  if (h === 'center') {
    panel.style.width = '100%';
    panel.style.maxWidth = width + 'px';
  } else {
    panel.style.width = width + 'px';
    panel.style.maxWidth = 'none';
  }

  // El alto es el limite del bloque de chat: el resto (cabecera y marquesina)
  // se lo reparte el flexbox.
  panel.style.maxHeight = height + 'px';
}

// ------------------------------------------------------------------ estado

function setStatus(state, detail) {
  statusState = state;
  el.connBadge.className = 'on ' + (state === 'live' ? 'live' : ['error', 'auth-error', 'no-token', 'no-user'].includes(state) ? 'error' : '');
  const labels = {
    live: 'CONECTADO',
    connecting: 'CONECTANDO',
    retrying: 'REINTENTANDO',
    error: 'ERROR',
    'auth-error': 'TOKEN INVALIDO',
    'no-token': 'SIN TOKEN',
    'no-user': 'SIN USUARIO',
    idle: 'INACTIVO'
  };
  el.connBadge.textContent = labels[state] || state;
  el.connBadge.title = detail || '';
  log('estado:', state, detail || '');
}

function setLive(live) {
  isLive = live;
  el.liveBadge.classList.toggle('offline', !live);
  el.liveLabel.textContent = live
    ? (cfg?.events?.status?.labelLive || 'EN DIRECTO')
    : (cfg?.events?.status?.labelOffline || 'OFFLINE');
}

// ------------------------------------------------------------------ eventos

const now = () => new Date();

/** El broadcaster se detecta por el flag del API y, por si acaso, por su nombre. */
function isBroadcaster(user) {
  if (!user) return false;
  if (user.isOwner) return true;
  const owner = String(cfg?.connection?.username || '').toLowerCase();
  return !!owner && String(user.username || '').toLowerCase() === owner;
}

function onTip(ev) {
  const t = getPath(cfg, 'events.tips', {});
  if (!t.enabled) return;
  const tip = ev.object?.tip;
  if (!tip) return;
  if (isBroadcaster(ev.object?.user)) return; // tu propio tip no se anuncia
  if (t.showAnon === false && tip.isAnon) return;
  const tokens = Number(tip.tokens) || 0;
  if (tokens < (Number(t.minTokens) || 0)) return;

  chat.push({
    kind: 'tip',
    user: ev.object?.user,
    tokens,
    text: t.showMessage ? (tip.message || '') : '',
    at: now(),
    ttl: Number(t.durationMs) || 0
  });
}

function onMedia(ev) {
  const m = getPath(cfg, 'events.media', {});
  if (!m.enabled || !ev.object?.media) return;
  const name = ev.object.media.name || 'contenido';
  chat.push({
    kind: 'media',
    user: ev.object?.user,
    text: `${ev.object.media.tokens} tokens - ${name}`,
    at: now(),
    ttl: Number(m.durationMs) || 0
  });
}

function onMessage(ev) {
  const message = ev.object?.message;
  if (!message) return;
  const user = ev.object?.user;
  const body = message.message || message.orig || '';

  // Aviso del broadcaster: lleva color de fondo/texto explicito.
  const looksLikeNotice = isBroadcaster(user) && (message.bgColor || message.color || message.font);
  if (looksLikeNotice) {
    if (!getPath(cfg, 'events.notices.enabled')) return;
    // La deteccion siempre usa los valores crudos, pero el estilo solo se
    // respeta si el usuario eligio "Los de Chaturbate". En modo app los
    // avisos se pintan con la paleta de la fuente.
    const fromChaturbate = getPath(cfg, 'events.notices.colors') === 'chaturbate';
    chat.push({
      kind: 'notice',
      text: body,
      noticeText: true,
      bgColor: fromChaturbate ? (message.bgColor || '') : '',
      fgColor: fromChaturbate ? (message.color || '') : '',
      font: fromChaturbate ? (message.font || '') : '',
      at: now(),
      ttl: 0
    });
    return;
  }

  // Tus mensajes normales se ocultan salvo que se activen, para no repetir tu
  // propio chat en el stream. Los que llevan formato ya se han tratado arriba.
  if (isBroadcaster(user) && !getPath(cfg, 'chat.showOwnMessages')) return;

  chat.push({ kind: 'chat', user, text: body, at: now(), ttl: (Number(cfg.chat.lifetimeSec) || 0) * 1000 });
}

function onPrivateMessage(ev) {
  if (!getPath(cfg, 'events.privateMessages.enabled')) return;
  const message = ev.object?.message;
  if (!message) return;
  chat.push({
    kind: 'private',
    user: ev.object?.user,
    text: message.message || '',
    at: now(),
    ttl: 0
  });
}

function onSystem(ev, key, tone, template) {
  const settings = getPath(cfg, `events.${key}`, {});
  if (!settings.enabled) return;
  const user = ev.object?.user;
  if (settings.showFollowersOnly && !user?.isFollower) return;
  chat.push({
    kind: 'system',
    tone,
    text: template.replace('%s', user?.username || '?'),
    at: now(),
    ttl: (Number(cfg.chat.lifetimeSec) || 0) * 1000
  });
}

function handleEvent(ev) {
  if (!ev || typeof ev.method !== 'string') return;

  switch (ev.method) {
    case 'chatMessage': onMessage(ev); break;
    case 'privateMessage': onPrivateMessage(ev); break;
    case 'tip': onTip(ev); break;
    case 'mediaPurchase': onMedia(ev); break;
    case 'userEnter': onSystem(ev, 'joins', 'join', '→ %s'); break;
    case 'userLeave': onSystem(ev, 'leaves', '', '← %s'); break;
    case 'follow': onSystem(ev, 'follows', 'follow', '★ %s ahora te sigue'); break;
    case 'fanclubJoin': onSystem(ev, 'fanclub', 'fanclub', '⭐ %s entra al fanclub'); break;
    case 'broadcastStart': setLive(true); log('emision iniciada'); break;
    case 'broadcastStop': setLive(false); log('emision terminada'); break;
    case 'roomSubjectChange': {
      const subject = typeof ev.object?.subject === 'string'
        ? ev.object.subject
        : ev.object?.roomSubject?.subject;
      if (subject) log('tema de la sala:', subject);
      break;
    }
    default: log('evento ignorado:', ev.method);
  }
}

// ------------------------------------------------------------------ configuracion

function fingerprint(value) {
  return JSON.stringify(value);
}

function applyConfig(next, { force = false } = {}) {
  const changed = !cfg || fingerprint(cfg) !== fingerprint(next);
  cfg = next;

  resolver.setEnabled(getPath(next, 'advanced.emoteResolver') === 'api');
  chat.setConfig(next);
  marquee.setConfig(next);

  applyStyles(next);
  applyPosition(next);
  setLive(isLive);
  marquee.render(force);
  if (force) chat.clear();

  log('configuracion aplicada');
  return changed;
}

async function loadConfig(force = false) {
  try {
    const res = await fetch('/api/config?view=source', { cache: 'no-store' });
    if (!res.ok) return;
    const next = await res.json();
    applyConfig(next, { force });
  } catch (err) {
    log('no se pudo leer la configuracion:', err.message);
  }
}

// ------------------------------------------------------------------ arranque

function connect() {
  const source = new EventSource('/api/events/stream');

  source.addEventListener('open', () => log('stream abierto'));

  source.addEventListener('message', (message) => {
    let payload;
    try {
      payload = JSON.parse(message.data);
    } catch {
      return;
    }
    if (payload.type === 'status') {
      setStatus(payload.status?.state, payload.status?.detail);
    } else if (payload.type === 'event') {
      handleEvent(payload.event);
    }
  });

  source.addEventListener('error', () => {
    log('stream desconectado, reintentando...');
  });

  return source;
}

const params = new URLSearchParams(location.search);
const isPreview = params.has('preview');
const onlyMarquee = params.has('marquee');

/**
 * Con ?marquee=1 la fuente dibuja solo la marquesina, a lo ancho completo y
 * centrada: util para tenerla en un OBS aparte del chat.
 */
function applyMarqueeOnly() {
  el.liveBadge.style.display = 'none';
  el.header.style.display = 'none';
  el.chat.style.display = 'none';
  el.panel.style.position = 'relative';
  el.panel.style.inset = 'auto';
  el.panel.style.transform = '';
  el.panel.style.width = '100%';
  el.panel.style.maxWidth = 'none';
  el.panel.style.maxHeight = 'none';
  el.stage.style.alignItems = 'center';
  el.marquee.classList.add('only');
}

/** Con ?w= y ?h= el lienzo tiene un tamaño logico propio dentro de la fuente. */
function applyCanvasSize() {
  const w = Number(params.get('w'));
  const h = Number(params.get('h'));
  if (!w || !h) return;
  el.stage.style.width = w + 'px';
  el.stage.style.height = h + 'px';
  el.stage.style.margin = 'auto';
  el.stage.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.08)';
  document.body.style.display = 'grid';
  document.body.style.placeItems = 'center';
}

/** Modo vista previa: sin SSE, los mensajes llegan por postMessage del editor. */
function setupPreview() {
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data.type !== 'string') return;
    if (data.type === 'cb-preview-config' && data.config) {
      // Se fusiona con los valores por defecto: un borrador incompleto no puede
      // romper la fuente.
      applyConfig(mergeDefaults(data.config), { force: false });
      applyConfig(mergeDefaults(data.config), { force: false });
    } else if (data.type === 'cb-preview-demo' && data.event) {
      handleEvent(data.event);
    }
  });
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'cb-preview-ready' }, '*');
  }
}

async function main() {
  await loadConfig(true);
  if (onlyMarquee) applyMarqueeOnly();
  else applyCanvasSize();

  if (isPreview) {
    setupPreview();
  } else {
    connect();
    // Los cambios del editor se reflejan sin recargar la fuente a mano.
    setInterval(() => loadConfig(false), 2500);
  }

  // La marquesina depende de medidas reales: hay que recalcular al primer pintado.
  window.addEventListener('resize', () => marquee.restart());
  setTimeout(() => marquee.restart(), 250);
  setTimeout(() => marquee.restart(), 1200);

  // En OBS no hay raton: el pauseOnHover se decide por si el puntero esta encima.
  document.addEventListener('mousemove', (e) => {
    el.marquee.classList.toggle('paused', !!(cfg?.tipMenu?.pauseOnHover && el.marquee.contains(e.target)));
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) marquee.restart();
  });
}

main();
