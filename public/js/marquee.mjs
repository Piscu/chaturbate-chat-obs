/**
 * Marquesina del tip menu.
 *
 * Chaturbate no expone el tip menu por API, asi que los items se definen en el
 * editor. La marquesina duplica el grupo de items y anima el desplazamiento con
 * una duracion calculada a partir de la velocidad en px/s, de modo que el ritmo
 * es independiente del ancho de la fuente.
 */

const SEPARATOR_DEFAULTS = {
  '': '',
  '|': ' | ',
  '•': ' • ',
  '·': ' · ',
  '❤': ' ❤ ',
  '♥': ' ♥ ',
  '/': ' / ',
  '-': ' - ',
  ',': ', ',
  '★': ' ★ ',
  '🔥': ' 🔥 ',
  '💜': ' 💜 '
};

function decorate(value) {
  if (value === undefined || value === null || value === '') return '';
  return SEPARATOR_DEFAULTS[value] !== undefined ? SEPARATOR_DEFAULTS[value] : ` ${value} `;
}

export class TipMarquee {
  constructor(root, emptyLabel) {
    this.root = root;
    this.track = root.querySelector('.mq-track');
    this.emptyLabel = emptyLabel;
    this.cfg = null;
    this.signature = '';
  }

  setConfig(cfg) {
    this.cfg = cfg;
  }

  buildGroup() {
    const tip = this.cfg.tipMenu;
    const group = document.createElement('div');
    group.className = 'mq-group';
    const items = Array.isArray(tip.items) ? tip.items : [];

    items.forEach((item, index) => {
      if (index > 0) {
        const sep = document.createElement('span');
        sep.className = 'mq-sep';
        sep.textContent = decorate(tip.separator);
        group.append(sep);
      }

      const el = document.createElement('span');
      el.className = 'mq-item';
      if (item.color) el.style.color = item.color;

      if (item.image) {
        const img = document.createElement('img');
        img.alt = '';
        img.src = item.image;
        img.addEventListener('error', () => img.remove(), { once: true });
        el.append(img);
      }

      const amount = document.createElement('span');
      amount.className = 'amount';
      amount.textContent = `${tip.amountPrefix || ''}${item.amount ?? 0}`.trim();
      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = item.label || '';

      if (tip.labelPosition === 'after') {
        el.append(label, amount);
      } else {
        el.append(amount, label);
      }
      group.append(el);
    });

    return group;
  }

  /** Reconstruye la marquesina. No hace nada si la config no cambio. */
  render(force = false) {
    const tip = this.cfg.tipMenu;
    this.root.classList.toggle('on', !!tip.enabled);

    const items = (tip.items || []).map((i) => [i.amount, i.label, i.image, i.color].join('~')).join('|');
    const signature = [items, tip.separator, tip.amountPrefix, tip.labelPosition, tip.direction, tip.loop].join('##');

    if (!tip.enabled || !(tip.items || []).length) {
      this.root.classList.add('empty');
      if (this.emptyLabel) this.emptyLabel.textContent = 'Anade items al tip menu en el editor';
      if (force || this.signature !== signature) {
        this.track.textContent = '';
        this.signature = signature;
      }
      return;
    }

    this.root.classList.remove('empty');
    if (!force && this.signature === signature) {
      // El contenido no cambio, pero la velocidad o el ancho pueden haberlo
      // hecho: recalcula la duracion sin tirar el DOM.
      this.restart();
      return;
    }
    this.signature = signature;

    this.root.classList.toggle('right', tip.direction === 'right');
    this.root.classList.toggle('noloop', !tip.loop);
    this.root.classList.toggle('pausable', !!tip.pauseOnHover);
    this.root.classList.toggle('fade-edges', !!tip.fadeEdges);

    this.track.textContent = '';
    // Dos copias identicas: al desplazar -50% el bucle queda perfecto.
    this.track.append(this.buildGroup(), this.buildGroup());
    this.restart();
  }

  /** Recalcula la duracion para que la velocidad sea siempre px/s. */
  restart() {
    const tip = this.cfg.tipMenu;
    const group = this.track.querySelector('.mq-group');
    if (!group) return;

    const width = group.getBoundingClientRect().width;
    if (!width) {
      // aun sin medir: se reintenta en el siguiente frame
      requestAnimationFrame(() => this.restart());
      return;
    }
    const speed = Math.max(5, Number(tip.speed) || 55);
    this.track.style.animationDuration = (width / speed).toFixed(3) + 's';
  }
}

/**
 * Interpreta una cantidad escrita como la muestra el panel de Chaturbate.
 * Alli el punto es separador de miles ("1.000" = 1000 tokens), no decimal.
 */
function parseAmount(raw) {
  const text = String(raw).trim();
  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(text)) return Number(text.replace(/[.,]/g, ''));
  const asDecimal = Number(text.replace(',', '.'));
  return Number.isFinite(asDecimal) ? asDecimal : 0;
}

const TRIM_EDGES = /^[\s\-–—:|·>»~]+|[\s\-–—:|·>»~]+$/g;

/**
 * Convierte texto pegado desde el dashboard en items del tip menu.
 * Acepta lineas como "100 - Saludo", "Saludo (100tk)", "100 tokens: Strip"...
 */
export function parseTipMenuText(text) {
  const lines = String(text || '').split(/\r?\n/);
  const items = [];
  const seen = new Set();
  const number = '(\\d[\\d.,]*)';

  for (const rawLine of lines) {
    let line = rawLine.replace(/%%%\s*\[.*?\]\s*%%%/gs, '').trim();
    if (!line) continue;
    // Descarta cabeceras tipicas del dashboard.
    if (/^(tip\s*menu|menu|opciones|options)\b/i.test(line)) continue;

    let amount = 0;
    let label = '';

    // 1) Numero al principio: "100 - Saludo", "100 tokens Saludo", "100: Saludo"
    const leading = new RegExp('^' + number + '\\s*(?:tokens?|tk|tks)?\\s*[-–—:|·]?\\s*(.+)$', 'i').exec(line);
    // 2) Numero al final: "Saludo - 100", "Saludo (100tk)", "Saludo 100"
    const trailing = new RegExp('^(.+?)\\s*[-–—:|·]?\\s*\\(?\\s*' + number + '\\s*(?:tokens?|tk|tks)?\\s*\\)?$', 'i').exec(line);

    if (leading) {
      amount = parseAmount(leading[1]);
      label = leading[2];
    } else if (trailing) {
      label = trailing[1];
      amount = parseAmount(trailing[2]);
    } else {
      // Sin numero reconocible: se conserva como item de texto libre.
      label = line;
    }

    label = label.replace(TRIM_EDGES, '').replace(/\s{2,}/g, ' ').trim();
    if (!label) continue;

    const key = `${amount}|${label.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ amount, label, image: '', color: '' });
  }

  return items;
}
