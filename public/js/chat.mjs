/**
 * Vista de chat: construye el DOM de cada entrada, gestiona emotes, insignias,
 * agrupado de mensajes, caducidad y limite de mensajes.
 */

import { tokenize, expandCodes } from './emotes.mjs';

const BADGES = {
  owner: { emoji: '\u{1F451}', title: 'Dueño del canal' },
  mod: { emoji: '\u{1F6E1}', title: 'Moderador' },
  fanclub: { emoji: '⭐', title: 'Fanclub' },
  follower: { emoji: '\u{1F49C}', title: 'Seguidor' }
};

const PHOTO_AVATAR = (username) => `https://thumb.live.mmcdn.com/ri/${encodeURIComponent(username)}.jpg`;

/** Formatea la hora a partir de un patron tipo HH:mm / hh:mm A. */
export function formatTime(date, pattern) {
  const fmt = String(pattern || 'HH:mm');
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const h12 = String(hours % 12 === 0 ? 12 : hours % 12).padStart(2, '0');
  return fmt
    .replace('HH', String(hours).padStart(2, '0'))
    .replace('hh', h12)
    .replace('mm', minutes)
    .replace(/A/g, hours >= 12 ? 'PM' : 'AM');
}

export class ChatView {
  constructor(root, resolver) {
    this.root = root;
    this.resolver = resolver;
    this.cfg = null;
    this.nodes = [];
    this.timers = new Set();
    this.lastChat = null;
  }

  setConfig(cfg) {
    this.cfg = cfg;
  }

  /** Resuelve el color de un usuario segun su grupo de color de Chaturbate. */
  userColor(user) {
    const colors = this.cfg.chat.userColors || {};
    if (user?.isOwner) return colors.owner;
    if (user?.isMod) return colors.mod;
    if (user?.colorGroup && colors[user.colorGroup]) return colors[user.colorGroup];
    if (user?.inFanclub) return colors.fanclub;
    if (user?.isFollower) return colors.l || this.cfg.chat.usernameColor;
    return this.cfg.chat.usernameColor;
  }

  badgesFor(user) {
    if (!user || !this.cfg.chat.showBadges) return [];
    const out = [];
    if (user.isOwner) out.push(BADGES.owner);
    if (user.isMod) out.push(BADGES.mod);
    if (user.inFanclub) out.push(BADGES.fanclub);
    else if (user.isFollower && this.cfg.chat.showFollowerBadge) out.push(BADGES.follower);
    return out;
  }

  isBlocked(text) {
    const raw = String(this.cfg.chat.blockedWords || '').trim();
    if (!raw) return false;
    const haystack = String(text).toLowerCase();
    return raw.split('\n').map((w) => w.trim().toLowerCase()).filter(Boolean).some((w) => haystack.includes(w));
  }

  /**
   * Inserta un texto con sus emotes ya resueltos en un elemento.
   * Los emotes que fallan al cargar caen al comportamiento configurado.
   */
  renderRichText(parent, text) {
    const cfg = this.cfg;
    const useApi = cfg.advanced.emoteResolver === 'api';
    const tokens = tokenize(text);

    for (const token of tokens) {
      if (token.type === 'text') {
        // El texto plano puede traer codigos :CODE: sueltos, que solo se
        // resuelven si el usuario ha elegido el resolutor por API.
        if (useApi && token.value.includes(':')) {
          const parts = expandCodes(token.value, (slug) => this.resolver.peek(slug));
          for (const part of parts) {
            if (part.type === 'text') parent.append(document.createTextNode(part.value));
            else this.appendEmote(parent, part);
          }
        } else {
          parent.append(document.createTextNode(token.value));
        }
        continue;
      }
      this.appendEmote(parent, token);
    }
  }

  appendEmote(parent, token) {
    const cfg = this.cfg;
    const size = cfg.chat.emoteSize;
    const align = cfg.chat.emoteVerticalAlign ? 'baseline' : 'text-bottom';

    const finalize = () => {
      if (cfg.chat.emoteFallback === 'hidden') return;
      const code = document.createElement('span');
      code.className = 'emote-code';
      code.textContent = `:${token.slug || token.value}:`;
      parent.append(code);
    };

    if (!token.url) {
      if (cfg.advanced.emoteResolver !== 'api') {
        finalize();
        return;
      }
      // Marcador de posicion mientras se resuelve en segundo plano.
      const placeholder = document.createComment('emote');
      parent.append(placeholder);
      this.resolver.fetch(token.slug).then((hit) => {
        if (!hit) {
          if (placeholder.isConnected) placeholder.replaceWith(document.createTextNode(`:${token.slug}:`));
          return;
        }
        const img = this.buildEmoteImg(hit, size, align, finalize);
        if (placeholder.isConnected) placeholder.replaceWith(img);
      });
      return;
    }

    parent.append(this.buildEmoteImg(token, size, align, finalize));
  }

  buildEmoteImg(token, size, align, onError) {
    const img = document.createElement('img');
    img.className = 'emote ' + align;
    img.alt = token.slug || token.value;
    img.loading = 'eager';
    img.draggable = false;
    img.addEventListener('error', () => {
      img.remove();
      onError();
    }, { once: true });
    img.src = token.url;
    if (size) {
      img.style.height = size + 'px';
      if (token.width && token.height && token.width >= token.height) img.style.width = Math.round(size * (token.width / token.height)) + 'px';
    }
    return img;
  }

  buildAvatar(user) {
    const style = this.cfg.chat.avatarStyle;
    if (style === 'none' || !user?.username) return null;
    const size = this.cfg.chat.avatarSize;

    if (style === 'photo') {
      const img = document.createElement('img');
      img.className = 'avatar';
      img.alt = '';
      img.loading = 'lazy';
      img.width = size;
      img.height = size;
      // Chaturbate no expone fotos reales de usuario: esta es su miniatura publica.
      img.addEventListener('error', () => {
        const letter = this.buildLetter(user, size);
        if (img.isConnected) img.replaceWith(letter);
      }, { once: true });
      img.src = PHOTO_AVATAR(user.username);
      return img;
    }

    return this.buildLetter(user, size);
  }

  buildLetter(user, size) {
    const span = document.createElement('span');
    span.className = 'avatar avatar-letter';
    span.style.width = size + 'px';
    span.style.height = size + 'px';
    span.style.fontSize = Math.round(size * 0.52) + 'px';
    span.style.background = this.userColor(user);
    span.textContent = String(user.username || '?').charAt(0).toUpperCase();
    return span;
  }

  /** Crea el nodo de una entrada. kind: chat|tip|media|notice|private|system. */
  buildEntry(entry) {
    const cfg = this.cfg;
    const el = document.createElement('div');
    el.className = 'msg';
    if (entry.kind === 'chat') {
      el.classList.add('anim-' + (cfg.chat.newMessageAnimation || 'none'));
    }

    if (entry.kind === 'tip') el.classList.add('tip', 'ev');
    else if (entry.kind === 'media') el.classList.add('media', 'ev');
    else if (entry.kind === 'notice') el.classList.add('notice', 'ev');
    else if (entry.kind === 'private') el.classList.add('private', 'ev');
    else if (entry.kind === 'system') el.classList.add('system', entry.tone || '');

    const user = entry.user;
    const showUser = entry.kind === 'chat' || entry.kind === 'tip' || entry.kind === 'media' || entry.kind === 'private';

    if (entry.kind === 'system') {
      this.renderRichText(el, entry.text);
      return el;
    }

    if (cfg.chat.showTimestamps) {
      const ts = document.createElement('span');
      ts.className = 'ts';
      ts.textContent = formatTime(entry.at, cfg.chat.timestampFormat);
      el.append(ts);
    }

    if (showUser && user?.username) {
      const avatar = this.buildAvatar(user);
      if (avatar) el.append(avatar);

      for (const badge of this.badgesFor(user)) {
        const span = document.createElement('span');
        span.className = 'badge';
        span.title = badge.title;
        span.textContent = badge.emoji;
        el.append(span);
      }

      const name = document.createElement('span');
      name.className = 'user';
      name.textContent = user.username;
      name.style.color = this.userColor(user);
      el.append(name);

      const colon = document.createElement('span');
      colon.className = 'colon';
      colon.textContent = ':';
      el.append(colon);
    }

    if (entry.kind === 'tip') {
      const amount = document.createElement('span');
      amount.className = 'amount';
      amount.textContent = `${entry.tokens} tokens`;
      el.append(amount);
      if (entry.text) {
        const sep = document.createElement('span');
        sep.className = 'tip-sep';
        sep.textContent = '—';
        el.append(sep);
        const text = document.createElement('span');
        text.className = 'text';
        this.renderRichText(text, entry.text);
        el.append(text);
      }
    } else {
      const text = document.createElement('span');
      text.className = 'text';
      if (entry.noticeText) {
        text.classList.add('notice-text');
        text.textContent = entry.text;
        if (entry.bgColor) el.style.background = entry.bgColor;
        if (entry.fgColor) text.style.color = entry.fgColor;
        if (entry.font) text.style.fontWeight = entry.font === 'bold' ? '700' : entry.font === 'bolder' ? '800' : '400';
      } else {
        this.renderRichText(text, entry.text);
      }
      el.append(text);
    }

    return el;
  }

  /** Inserta una entrada aplicando agrupado, caducidad y limite. */
  push(entry) {
    const cfg = this.cfg;
    if (entry.kind === 'chat') {
      // "Vacio" es un mensaje sin texto ni emotes: un mensaje hecho solo de
      // emotes tiene contenido y debe verse.
      const hasContent = tokenize(entry.text).some((t) => t.type === 'emote' || t.value.trim());
      if (cfg.chat.hideEmptyMessages && !hasContent) return;
      if (this.isBlocked(entry.text)) return;

      // Agrupa lineas seguidas del mismo usuario.
      const now = Date.now();
      if (cfg.chat.collapseRepeated && this.lastChat
          && this.lastChat.entry.user?.username === entry.user?.username
          && now - this.lastChat.at.getTime() < 12000
          && this.lastChat.node.isConnected) {
        this.lastChat.node.classList.add('grouped');
        this.lastChat.node.classList.remove('anim-' + (cfg.chat.newMessageAnimation || 'none'));
        this.lastChat.node.classList.add('anim-none');
        const holder = this.lastChat.node.querySelector('.text');
        if (holder) {
          const br = document.createElement('br');
          holder.append(br);
          this.renderRichText(holder, entry.text);
        }
        this.lastChat.text += '\n' + entry.text;
        this.lastChat.at = new Date(now);
        this.trim();
        return;
      }
    }

    const node = this.buildEntry(entry);
    this.root.append(node);
    const record = { node, entry, at: entry.at, text: entry.text };
    this.nodes.push(record);
    if (entry.kind === 'chat') this.lastChat = record;

    const ttl = entry.ttl ?? 0;
    if (ttl > 0) {
      const timer = setTimeout(() => {
        this.timers.delete(timer);
        this.remove(record);
      }, ttl);
      this.timers.add(timer);
    }

    this.trim();
  }

  trim() {
    const max = Math.max(1, Number(this.cfg.chat.maxMessages) || 50);
    while (this.nodes.length > max) {
      this.remove(this.nodes[0]);
    }
  }

  remove(record) {
    const i = this.nodes.indexOf(record);
    if (i >= 0) this.nodes.splice(i, 1);
    if (this.lastChat && this.lastChat === record) {
      const prev = this.nodes.filter((n) => n.entry.kind === 'chat').pop();
      this.lastChat = prev || null;
    }
    record.node.remove();
  }

  clear() {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    this.nodes = [];
    this.lastChat = null;
    this.root.textContent = '';
  }
}
