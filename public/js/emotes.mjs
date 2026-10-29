/**
 * Emotes de Chaturbate.
 *
 * Los emotes NO se sirven por un esquema de "packs": llegan dentro del propio texto
 * del mensaje como markup con la URL ya dentro:
 *
 *   %%%[emoticon nombre|urlAncho|urlAlto|urlImagen|urlAbuso]%%%      (6 campos)
 *   %%%[emoticon nombre|urlImagen|urlAncho|urlAlto|urlAbuso]%%%      (5 campos)
 *
 * El orden de los campos no es estable, asi que en lugar de fiarme de las
 * posiciones busco el campo que parece una URL de imagen. Asi el parser sobrevive
 * a los dos layouts y a cualquier variacion futura.
 *
 * Si el markup solo trae el nombre (o si el mensaje trae un :CODIGO: suelto),
 * se puede resolver contra la API de Chaturbate (/api/ts/emoticons/autocomplete).
 */

/** Marca de emote inline. El nombre puede traer espacios rarezos, por eso [^\]]+. */
const EMOTE_RE = /%%%\s*\[\s*emoticon\s+([^\]]+?)\s*\]\s*%%%/g;

/**
 * Codigo suelto de emote. Se aceptan las dos formas porque en Chaturbate el
 * dos puntos inicial es el DISPARADOR del autocompletado -- escribes ":h" y se
 * abre la lista -- mientras que el codigo que acaba en el mensaje lleva su
 * cierre. Aceptar ambos evita depender de cual de las dos se este usando.
 *
 * Chaturbate necesita poder saber donde acaba el codigo para decidir si existe;
 * sin cierre no podria distinguir ":hello" de un texto cualquiera.
 *
 * Solo se exige que empiece por letra, para no comerse horas, IPs ni URLs.
 */
const CODE_RE = /:([A-Za-z][A-Za-z0-9_'-]{1,48}):?/g;

const ABUSE_PATH = '/emoticon_report/';
const IMAGE_EXT = /\.(png|jpe?g|gif|webp)(?:[?#]|$)/i;
const ANY_URL = /^(?:https?:)?\/\//i;

const looksLikeImage = (value) => ANY_URL.test(value) && !value.includes(ABUSE_PATH);

/**
 * Normaliza una URL relativa o sin esquema a una absoluta utilizable en <img>.
 */
function normalizeUrl(value) {
  let url = String(value).trim();
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) return 'https://chaturbate.com' + url;
  return url;
}

/**
 * Extrae nombre, URL y dimensiones del cuerpo del markup de un emote.
 * No asume posiciones: busca el campo que parece una imagen.
 */
function parseEmoteFields(body) {
  const parts = String(body).split('|').map((s) => s.trim());
  const name = parts[0] || '';

  const urls = parts.filter(looksLikeImage);
  // Con dos URLs (thumb e imagen) la de menor peso suele ser la miniatura.
  const image = urls.find((u) => IMAGE_EXT.test(u)) || urls[0] || '';
  const numbers = parts.map(Number).filter((n) => Number.isFinite(n) && n > 0 && n < 5000);
  const [width, height] = numbers.length >= 2 ? numbers : [];

  return { name, url: image ? normalizeUrl(image) : '', width: width || 0, height: height || 0 };
}

/**
 * Convierte el texto de un mensaje en una lista de tokens.
 * @returns {Array<{type:'text'|'emote', value:string, url?:string, width?:number, height?:number, slug?:string}>}
 */
export function tokenize(text) {
  const source = String(text ?? '');
  const tokens = [];
  let cursor = 0;

  EMOTE_RE.lastIndex = 0;
  let match;
  while ((match = EMOTE_RE.exec(source)) !== null) {
    if (match.index > cursor) {
      tokens.push({ type: 'text', value: source.slice(cursor, match.index) });
    }
    const parsed = parseEmoteFields(match[1]);
    if (parsed.url) {
      tokens.push({ type: 'emote', value: parsed.name, url: parsed.url, width: parsed.width, height: parsed.height, slug: parsed.name });
    } else if (parsed.name) {
      // Markup sin URL: hay que resolverlo por nombre.
      tokens.push({ type: 'emote', value: parsed.name, url: '', slug: parsed.name });
    }
    cursor = match.index + match[0].length;
  }

  if (cursor < source.length) {
    tokens.push({ type: 'text', value: source.slice(cursor) });
  }

  return tokens;
}

/** Sustituye los codigos :NOMBRE: sueltos por emotes resueltos via API. */
export function expandCodes(text, resolve) {
  const source = String(text ?? '');
  if (!CODE_RE.test(source)) return [{ type: 'text', value: source }];
  CODE_RE.lastIndex = 0;

  const tokens = [];
  let cursor = 0;
  let match;
  while ((match = CODE_RE.exec(source)) !== null) {
    if (match.index > cursor) {
      tokens.push({ type: 'text', value: source.slice(cursor, match.index) });
    }
    const slug = match[1];
    const hit = resolve ? resolve(slug) : null;
    if (hit) {
      tokens.push({ type: 'emote', value: slug, url: hit.url, width: hit.width, height: hit.height, slug: hit.slug || slug });
    } else {
      // Sin emote: se deja el codigo tal cual para que el fallback decida.
      tokens.push({ type: 'text', value: match[0] });
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < source.length) {
    tokens.push({ type: 'text', value: source.slice(cursor) });
  }
  return tokens;
}

/**
 * Cliente de resolucion de emotes contra el proxy local, con cache en memoria
 * y peticiones deduplicadas.
 */
export class EmoteResolver {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.cache = new Map();
    this.pending = new Map();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /** Devuelve {url,width,height} o null. Es sincrono: solo usa la cache. */
  peek(slug) {
    return this.cache.get(String(slug).toLowerCase()) || null;
  }

  /** Lanza la peticion y cachea el resultado. Resuelve a null si no existe. */
  async fetch(slug) {
    const key = String(slug).toLowerCase();
    if (!this.enabled || !key) return null;
    if (this.cache.has(key)) return this.cache.get(key);
    if (this.pending.has(key)) return this.pending.get(key);

    const job = (async () => {
      try {
        const res = await fetch(`/api/emote?slug=${encodeURIComponent(slug)}`);
        if (!res.ok) {
          this.cache.set(key, null);
          return null;
        }
        const data = await res.json();
        const value = data && data.url ? { url: data.url, width: data.width || 0, height: data.height || 0, slug: data.slug || slug } : null;
        this.cache.set(key, value);
        return value;
      } catch {
        return null;
      } finally {
        this.pending.delete(key);
      }
    })();

    this.pending.set(key, job);
    return job;
  }
}
