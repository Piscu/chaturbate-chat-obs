/**
 * Editor de configuracion.
 *
 * El formulario se construye entero a partir de SCHEMA: cualquier opcion nueva
 * que se anada a public/js/config.mjs aparece aqui sin tocar este archivo.
 *
 * La vista previa es la propia pagina de la fuente cargada en un iframe, a la que
 * se le manda la configuracion en borrador por postMessage. Asi lo que ves es
 * exactamente lo que se vera en OBS.
 */

import {
  SCHEMA, THEME_PRESETS, mergeDefaults, getPath, setPath,
  colorToHex, colorToAlpha, buildColor
} from './config.mjs';
import { parseTipMenuText } from './marquee.mjs';

const $ = (sel) => document.querySelector(sel);

const el = {
  tabs: $('#tabs'),
  panes: $('#panes'),
  save: $('#btnSave'),
  reset: $('#btnReset'),
  obs: $('#btnObs'),
  hint: $('#saveHint'),
  statusDot: $('#statusDot'),
  statusText: $('#statusText'),
  frame: $('#previewFrame'),
  stage: $('#previewStage'),
  gridBg: $('#gridBg'),
  previewSize: $('#previewSize'),
  previewGrid: $('#previewGrid'),
  replay: $('#btnReplay'),
  obsDialog: $('#obsDialog'),
  obsUrl: $('#obsUrl'),
  obsUrl2: $('#obsUrl2'),
  obsSize: $('#obsSize'),
  btnCopyUrl: $('#btnCopyUrl'),
  btnCloseObs: $('#btnCloseObs'),
  assetDialog: $('#assetDialog'),
  assetGrid: $('#assetGrid'),
  assetUpload: $('#assetUpload'),
  btnCloseAssets: $('#btnCloseAssets'),
  search: $('#search'),
  toast: $('#toast')
};

let cfg = mergeDefaults({});
let dirty = false;
let assets = [];
let activeTab = SCHEMA[0].id;
let assetPickerCallback = null;
let demoTimer = null;
let demoIndex = 0;

/** Mensajes de ejemplo con la misma forma que los eventos reales de la API. */
const DEMO_EVENTS = [
  {
    method: 'chatMessage',
    object: { user: { username: 'bradisfun2', colorGroup: 'tr', isFollower: true }, message: { message: 'hola :D buen stream' } }
  },
  {
    method: 'chatMessage',
    object: {
      user: { username: 'tara_joi', colorGroup: 'f', inFanclub: true, isFollower: true },
      message: { message: '%%%[emoticon Applause|https://static-pub.highwebmedia.com/uploads/avatar/2013/03/07/vjhbxUQiBIHxL.jpg|240|240|/emoticon_report/Applause/]%%% %%%[emoticon BigMoney|https://static-pub.highwebmedia.com/uploads/avatar/2017/09/05/09/25/952654b9b0ab6baf56f5d7722461d4ff8223e5af.jpg|500|199|/emoticon_report/BigMoney/]%%%' }
    }
  },
  {
    method: 'chatMessage',
    object: { user: { username: 'luna_kit' }, message: { message: 'kawaii :D a que velocidad vas hoy' } }
  },
  {
    method: 'tip',
    object: { user: { username: 'tara_joi', inFanclub: true }, tip: { tokens: 500, isAnon: false, message: 'mmm que crack eres' } }
  },
  {
    method: 'chatMessage',
    object: { user: { username: 'zz_top10', isMod: true }, message: { message: 'reporte +1' } }
  },
  {
    method: 'userEnter',
    object: { user: { username: 'nuevo_espectador', isFollower: true } }
  },
  {
    method: 'chatMessage',
    object: { user: { username: 'bradisfun2' }, message: { message: 'mmm la tip menu esta muy clara' } }
  },
  {
    method: 'follow',
    object: { user: { username: 'devi_92' } }
  },
  {
    method: 'chatMessage',
    object: {
      user: { username: 'tu_canal', isOwner: true },
      message: { message: 'Gracias a todos por acompanarme', bgColor: '#2a0f3d', color: '#ffffff', font: 'bold' }
    }
  },
  {
    method: 'mediaPurchase',
    object: { user: { username: 'luna_kit' }, media: { id: '1', name: 'Pack de fotos', type: 'photos', tokens: 200 } }
  },
  {
    method: 'chatMessage',
    object: { user: { username: 'mimi_23', isFollower: true }, message: { message: 'llego tarde, que me he perdido' } }
  }
];

// ------------------------------------------------------------------ utilidades

function toast(message, kind = '') {
  el.toast.textContent = message;
  el.toast.className = 'toast on ' + kind;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.toast.className = 'toast ' + kind; }, 2600);
}

function markDirty() {
  dirty = true;
  el.hint.classList.add('on');
  sendConfig();
}

function markClean() {
  dirty = false;
  el.hint.classList.remove('on');
}

function make(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child) node.append(child);
  }
  return node;
}

// ------------------------------------------------------------------ controles

/** Envoltorio estandar: etiqueta a la izquierda, control a la derecha. */
function fieldRow(label, help, control, { stack = false, wide = false } = {}) {
  const classes = ['field'];
  if (stack) classes.push('stack');
  if (wide) classes.push('wide');
  const left = make('label', {}, [label]);
  if (help) left.append(make('span', { class: 'help', text: help }));
  return make('div', { class: classes.join(' ') }, [left, make('div', { class: 'control' }, [].concat(control))]);
}

function buildControl(spec, accessor) {
  const { type } = spec;
  const { get, set } = accessor;

  switch (type) {
    case 'bool': {
      const input = make('input', { type: 'checkbox' });
      input.checked = !!get();
      input.addEventListener('change', () => { set(input.checked); });
      return { node: make('label', { class: 'chk' }, [input, make('span', { text: spec.onLabel || 'Si' })]), sync: () => { input.checked = !!get(); } };
    }

    case 'number': {
      const input = make('input', { type: 'number' });
      if (spec.min !== undefined) input.min = spec.min;
      if (spec.max !== undefined) input.max = spec.max;
      input.value = get() ?? 0;
      input.addEventListener('input', () => {
        const value = input.value === '' ? 0 : Number(input.value);
        if (!Number.isNaN(value)) set(value);
      });
      return { node: input, sync: () => { input.value = get() ?? 0; } };
    }

    case 'range': {
      const input = make('input', { type: 'range' });
      input.min = spec.min ?? 0;
      input.max = spec.max ?? 100;
      input.step = spec.step ?? 1;
      input.value = get() ?? input.min;
      const out = make('span', { class: 'range-value', text: String(get()) });
      input.addEventListener('input', () => { out.textContent = input.value; set(Number(input.value)); });
      return { node: make('div', { style: 'display:flex;align-items:center;gap:9px;width:100%' }, [input, out]),
        sync: () => { input.value = get(); out.textContent = String(get()); } };
    }

    case 'text': {
      const input = make('input', { type: 'text' });
      input.value = get() ?? '';
      input.addEventListener('input', () => set(input.value));
      return { node: input, sync: () => { input.value = get() ?? ''; } };
    }

    case 'password': {
      const input = make('input', { type: 'password', placeholder: 'pega aqui tu token' });
      input.value = get() ?? '';
      const toggle = make('button', { class: 'btn icon', type: 'button', text: 'Ver' });
      toggle.addEventListener('click', () => {
        const hidden = input.type === 'password';
        input.type = hidden ? 'text' : 'password';
        toggle.textContent = hidden ? 'Ocultar' : 'Ver';
      });
      input.addEventListener('input', () => set(input.value));
      return { node: make('div', { style: 'display:flex;gap:6px;width:100%' }, [input, toggle]),
        sync: () => { input.value = get() ?? ''; } };
    }

    case 'textarea': {
      const input = make('textarea', { rows: 4 });
      input.value = get() ?? '';
      input.addEventListener('input', () => set(input.value));
      return { node: input, sync: () => { input.value = get() ?? ''; } };
    }

    case 'select': {
      const select = make('select');
      for (const opt of spec.options || []) {
        const option = make('option', { value: String(opt.value) });
        option.textContent = opt.label;
        select.append(option);
      }
      select.value = String(get());
      select.addEventListener('change', () => {
        const chosen = (spec.options || []).find((o) => String(o.value) === select.value);
        set(chosen ? chosen.value : select.value);
      });
      return { node: select, sync: () => { select.value = String(get()); } };
    }

    case 'color': return buildColorControl(spec, accessor);
    case 'image': return buildImageControl(spec, accessor);
    case 'preset': return buildPresetControl(spec, accessor);

    default: {
      const input = make('input', { type: 'text' });
      input.value = get() ?? '';
      input.addEventListener('input', () => set(input.value));
      return { node: input, sync: () => { input.value = get() ?? ''; } };
    }
  }
}

function buildColorControl(spec, accessor) {
  const { get, set } = accessor;
  const picker = make('input', { type: 'color', title: 'Elige un color' });
  const hex = make('input', { type: 'text', class: 'hex' });
  const alpha = make('input', { type: 'range', min: 0, max: 1, step: 0.05, title: 'Transparencia' });
  const alphaVal = make('span', { class: 'alpha-val' });

  const sync = () => {
    const value = get();
    picker.value = colorToHex(value);
    hex.value = colorToHex(value).replace('#', '');
    const a = colorToAlpha(value);
    alpha.value = a;
    alphaVal.textContent = Math.round(a * 100) + '%';
  };

  const commit = (newHex, newAlpha) => set(buildColor(newHex, newAlpha));

  picker.addEventListener('input', () => { commit(picker.value, Number(alpha.value)); sync(); });
  alpha.addEventListener('input', () => { commit(picker.value, Number(alpha.value)); sync(); });
  hex.addEventListener('input', () => {
    const clean = hex.value.trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{3}$/.test(clean)) commit('#' + clean.split('').map((c) => c + c).join(''), Number(alpha.value));
    else if (/^[0-9a-fA-F]{6}$/.test(clean)) commit('#' + clean, Number(alpha.value));
    sync();
  });

  sync();
  const node = make('div', { class: 'color-ctl' }, [
    picker, hex,
    make('div', { class: 'alpha-wrap' }, [alpha, alphaVal])
  ]);
  return { node, sync };
}

function buildImageControl(spec, accessor) {
  const { get, set } = accessor;
  const thumb = make('div', { class: 'thumb' });
  const path = make('span', { class: 'path' });

  const fileInput = make('input', { type: 'file', accept: 'image/*' });
  fileInput.hidden = true;
  fileInput.addEventListener('change', () => {
    if (fileInput.files?.[0]) uploadImage(fileInput.files[0], (url) => { set(url); sync(); });
    fileInput.value = '';
  });

  const btnUpload = make('button', { class: 'btn tiny', type: 'button', text: 'Subir', onclick: () => fileInput.click() });
  const btnLib = make('button', { class: 'btn tiny', type: 'button', text: 'Biblioteca', onclick: () => openAssetDialog((url) => { set(url); sync(); }) });
  const btnClear = make('button', { class: 'btn tiny danger', type: 'button', text: 'X', onclick: () => { set(''); sync(); } });

  const sync = () => {
    const value = get() || '';
    thumb.textContent = '';
    if (value) {
      const img = make('img', { src: value, alt: '' });
      img.addEventListener('error', () => { thumb.textContent = '?'; }, { once: true });
      thumb.append(img);
    } else {
      thumb.append(make('span', { class: 'none', text: 'sin' }));
    }
    path.textContent = value || '—';
    btnClear.style.display = value ? '' : 'none';
  };
  sync();

  return {
    node: make('div', { class: 'image-ctl' }, [thumb, path, btnUpload, btnLib, btnClear, fileInput]),
    sync
  };
}

function buildPresetControl(spec, accessor) {
  const row = make('div', { class: 'preset-row' });
  for (const [key, preset] of Object.entries(THEME_PRESETS)) {
    const chip = make('button', { class: 'preset-chip', type: 'button' }, [
      make('span', { class: 'swatch', style: `background:${preset.theme.accentColor}` }),
      make('span', { text: preset.label })
    ]);
    chip.addEventListener('click', () => {
      // Un preset puede traer varias secciones (theme, chat...). Solo se
      // escriben las que ya existen en la config: mergeDefaults no sabe
      // fusionar claves desconocidas y la fuente no debe romperse.
      for (const [section, values] of Object.entries(preset)) {
        if (section === 'label' || !values || typeof values !== 'object') continue;
        if (!cfg[section] || typeof cfg[section] !== 'object') continue;
        Object.assign(cfg[section], values);
      }
      setPath(cfg, spec.key, key);
      markDirty();
      rebuild();
      toast('Tema aplicado: ' + preset.label, 'ok');
    });
    row.append(chip);
  }
  return { node: row, sync: () => {} };
}

// ------------------------------------------------------------------ listas

function buildList(spec, accessor) {
  const { get, set } = accessor;
  const wrap = make('div', { class: 'list-items' });

  const sync = () => {
    wrap.textContent = '';
    const items = get() || [];
    if (!items.length) {
      wrap.append(make('div', { class: 'list-empty', text: 'Todavia no hay items. Anade el primero o pega el tip menu.' }));
    }

    items.forEach((item, index) => {
      const rowAccessors = {};
      for (const sub of spec.fields) {
        rowAccessors[sub.key] = {
          get: () => item[sub.key],
          set: (value) => { item[sub.key] = value; markDirty(); if (sub.key === 'amount') amountInput.value = value; }
        };
      }

      const amountInput = buildControl({ type: 'number', min: 0 }, rowAccessors.amount).node;
      const labelInput = buildControl({ type: 'text' }, rowAccessors.label).node;
      const colorCtl = buildColorControl({}, rowAccessors.color);
      const imageCtl = buildImageControl({}, rowAccessors.image);

      const move = (delta) => {
        const list = get();
        const target = index + delta;
        if (target < 0 || target >= list.length) return;
        [list[index], list[target]] = [list[target], list[index]];
        markDirty();
        sync();
      };

      const row = make('div', { class: 'list-row' }, [
        amountInput,
        make('div', { style: 'display:flex;gap:6px;align-items:center;min-width:0' }, [labelInput, imageCtl.node]),
        make('div', { class: 'cell-color' }, [colorCtl.node.querySelector('input[type=color]')]),
        make('div', { class: 'row-actions' }, [
          make('button', { class: 'btn icon', type: 'button', text: '↑', onclick: () => move(-1) }),
          make('button', { class: 'btn icon', type: 'button', text: '↓', onclick: () => move(1) }),
          make('button', { class: 'btn icon danger', type: 'button', text: 'X', onclick: () => { get().splice(index, 1); markDirty(); sync(); } })
        ])
      ]);
      wrap.append(row);
    });
  };

  const add = make('button', {
    class: 'btn list-add', type: 'button', text: '+ ' + (spec.addLabel || 'Anadir item'),
    onclick: () => {
      let list = get();
      if (!Array.isArray(list)) { set([]); list = get(); }
      list.push({ amount: 100, label: 'Nuevo item', image: '', color: '' });
      markDirty();
      sync();
    }
  });

  sync();
  return { node: make('div', {}, [wrap, add]), sync };
}

function buildImporter(accessor) {
  const area = make('textarea', {
    rows: 5,
    placeholder: 'Pega aqui el tip menu del panel de Chaturbate.\nEjemplo:\n\n100 - Saludo\n250 - Prueba de strip\n500 tokens: Video privado\n1.000 - Pack de fotos'
  });
  const out = make('div', { class: 'parsed' });
  const btnParse = make('button', { class: 'btn', type: 'button', text: 'Analizar texto' });
  const btnAppend = make('button', { class: 'btn primary', type: 'button', text: 'Anadir al tip menu' });
  const btnReplace = make('button', { class: 'btn ghost', type: 'button', text: 'Reemplazar todo' });

  let parsed = [];
  const refresh = () => {
    out.textContent = '';
    if (!parsed.length) return;
    out.append(make('div', { class: 'help', text: `${parsed.length} item(s) detectados:` }));
    for (const item of parsed) {
      out.append(make('div', { class: 'row' }, [
        make('b', { text: String(item.amount) }),
        make('span', { text: item.label })
      ]));
    }
  };

  btnParse.addEventListener('click', () => {
    parsed = parseTipMenuText(area.value);
    refresh();
    if (!parsed.length) toast('No se detecto ningun item', 'err');
  });

  const apply = (replace) => {
    if (!parsed.length) { parsed = parseTipMenuText(area.value); refresh(); }
    if (!parsed.length) return;
    const current = accessor.get() || [];
    accessor.set(replace ? parsed : current.concat(parsed));
    markDirty();
    rebuild();
    toast(replace ? 'Tip menu reemplazado' : 'Items anadidos', 'ok');
  };
  btnAppend.addEventListener('click', () => apply(false));
  btnReplace.addEventListener('click', () => apply(true));

  return make('div', { class: 'importer' }, [area, make('div', { style: 'display:flex;gap:8px;margin-top:10px;flex-wrap:wrap' }, [btnParse, btnAppend, btnReplace]), out]);
}

// ------------------------------------------------------------------ biblioteca

async function refreshAssets() {
  try {
    const res = await fetch('/api/assets');
    const data = await res.json();
    assets = data.assets || [];
  } catch {
    assets = [];
  }
}

function renderLibrary(container) {
  container.textContent = '';
  if (!assets.length) {
    container.append(make('div', { class: 'assetlib-empty', text: 'Todavia no has subido ninguna imagen.' }));
    return;
  }
  for (const asset of assets) {
    const item = make('div', { class: 'lib-item', title: asset.name }, [make('img', { src: asset.url, alt: '' })]);
    if (assetPickerCallback) {
      item.addEventListener('click', () => {
        assetPickerCallback(asset.url);
        assetPickerCallback = null;
        el.assetDialog.close();
        rebuild();
      });
    }
    const del = make('button', { class: 'del', type: 'button', text: '×', title: 'Borrar' });
    del.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`¿Borrar ${asset.name}?`)) return;
      await fetch('/api/assets/' + encodeURIComponent(asset.name), { method: 'DELETE' });
      await refreshAssets();
      renderLibrary(container);
    });
    item.append(del);
    container.append(item);
  }
}

function openAssetDialog(onPick) {
  assetPickerCallback = onPick;
  renderLibrary(el.assetGrid);
  el.assetDialog.showModal();
}

async function uploadImage(file, onDone) {
  if (file.size > 12 * 1024 * 1024) {
    toast('La imagen supera 12 MB', 'err');
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, dataUrl: reader.result })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'fallo al subir');
      await refreshAssets();
      onDone(data.url);
      rebuild();
      toast('Imagen subida', 'ok');
    } catch (err) {
      toast('No se pudo subir: ' + err.message, 'err');
    }
  };
  reader.readAsDataURL(file);
}

// ------------------------------------------------------------------ formulario

function renderField(spec) {
  if (spec.type === 'group') {
    const card = make('details', { class: 'card', open: spec.key.endsWith('theme') || spec.key === 'layout' || spec.key === 'events.tips' || spec.key === 'chatLook' });
    const body = make('div', { class: 'card-body' });
    for (const sub of spec.fields) body.append(renderField(sub));
    card.append(make('summary', { text: spec.label }), body);
    return card;
  }

  if (spec.type === 'importer') {
    return fieldRow(spec.label, spec.help, buildImporter({ get: () => cfg.tipMenu.items, set: (v) => { cfg.tipMenu.items = v; } }), { stack: true, wide: true });
  }

  if (spec.type === 'assetlib') {
    const grid = make('div', { class: 'lib-grid' });
    renderLibrary(grid);
    return fieldRow(spec.label, spec.help, grid, { stack: true, wide: true });
  }

  if (spec.type === 'list') {
    const listCtl = buildList(spec, { get: () => getPath(cfg, spec.key, []), set: (v) => setPath(cfg, spec.key, v) });
    return fieldRow(spec.label, spec.help, listCtl.node, { stack: true, wide: true });
  }

  const accessor = {
    get: () => getPath(cfg, spec.key),
    set: (value) => { setPath(cfg, spec.key, value); markDirty(); }
  };
  const control = buildControl(spec, accessor);
  return fieldRow(spec.label, spec.help, control.node);
}

function rebuild() {
  el.tabs.textContent = '';
  el.panes.textContent = '';

  for (const sheet of SCHEMA) {
    const tab = make('button', { class: 'tab' + (sheet.id === activeTab ? ' active' : ''), type: 'button', text: sheet.label });
    tab.addEventListener('click', () => {
      activeTab = sheet.id;
      rebuild();
    });
    el.tabs.append(tab);

    const pane = make('div', { class: 'pane' + (sheet.id === activeTab ? ' active' : '') });
    if (sheet.hint) pane.append(make('p', { class: 'hint', html: sheet.hint }));
    for (const field of sheet.fields) pane.append(renderField(field));
    el.panes.append(pane);
  }
}

// ------------------------------------------------------------------ busqueda

/** Recorre el esquema y recoge los campos hoja que coinciden con la busqueda. */
function collectLeaves(spec, query, out, trail = '') {
  const hay = (trail + ' ' + spec.label + ' ' + (spec.help || '') + ' ' + spec.key).toLowerCase();
  if (spec.type === 'group') {
    const groupHay = (trail + ' ' + spec.label + ' ' + spec.key).toLowerCase();
    if (groupHay.includes(query)) {
      for (const sub of spec.fields) collectLeaves(sub, '', out, trail + ' ' + spec.label);
    } else {
      for (const sub of spec.fields) collectLeaves(sub, query, out, trail + ' ' + spec.label);
    }
    return;
  }
  if (hay.includes(query)) out.push(spec);
}

/** Muestra en una unica lista los ajustes que coinciden, agrupados por pestana. */
function renderSearch(query) {
  const q = query.trim().toLowerCase();
  el.tabs.textContent = '';
  el.panes.textContent = '';
  const pane = make('div', { class: 'pane active' });
  let total = 0;

  for (const sheet of SCHEMA) {
    const matches = [];
    for (const field of sheet.fields) collectLeaves(field, q, matches);
    if (!matches.length) continue;
    pane.append(make('div', { class: 'search-group', text: sheet.label }));
    for (const field of matches) {
      pane.append(renderField(field));
      total += 1;
    }
  }

  if (!total) pane.append(make('p', { class: 'hint', text: 'No hay ajustes que coincidan con la busqueda.' }));
  el.panes.append(pane);
}

function applySearch() {
  if (el.search.value.trim()) renderSearch(el.search.value);
  else rebuild();
}

// ------------------------------------------------------------------ preview

function sendConfig() {
  if (!el.frame.contentWindow) return;
  el.frame.contentWindow.postMessage({ type: 'cb-preview-config', config: JSON.parse(JSON.stringify(cfg)) }, '*');
}

function sendDemo() {
  if (!el.frame.contentWindow) return;
  const event = DEMO_EVENTS[demoIndex % DEMO_EVENTS.length];
  demoIndex += 1;
  el.frame.contentWindow.postMessage({ type: 'cb-preview-demo', event }, '*');
}

function startDemo() {
  clearInterval(demoTimer);
  demoIndex = 0;
  demoTimer = setInterval(sendDemo, 2200);
  setTimeout(sendDemo, 350);
}

window.addEventListener('message', (event) => {
  if (event.data?.type === 'cb-preview-ready') {
    sendConfig();
    startDemo();
  }
});

function fitPreview() {
  const [w, h] = el.previewSize.value.split('x').map(Number);
  el.frame.style.width = w + 'px';
  el.frame.style.height = h + 'px';

  // Se reduce si no cabe en la columna, para que la relacion de aspecto sea real.
  const available = el.stage.clientWidth - 40;
  const scale = Math.min(1, available / w);
  el.frame.style.transform = `scale(${scale})`;
  el.frame.style.height = h * scale + 'px';
  el.stage.style.minHeight = Math.max(300, h * scale + 40) + 'px';
}

// ------------------------------------------------------------------ estado

const STATUS_LABELS = {
  live: 'Conectado al chat',
  connecting: 'Conectando con Chaturbate...',
  retrying: 'Reintentando...',
  error: 'Error de red',
  'auth-error': 'Token rechazado',
  'no-token': 'Falta el token',
  'no-user': 'Falta el usuario',
  idle: 'Sin datos'
};
const STATUS_KIND = {
  live: 'live', connecting: 'busy', retrying: 'busy', error: 'error', 'auth-error': 'error', 'no-token': 'error', 'no-user': 'error'
};

async function pollStatus() {
  try {
    const res = await fetch('/api/status', { cache: 'no-store' });
    const data = await res.json();
    el.statusText.textContent = STATUS_LABELS[data.state] || data.state;
    el.statusDot.className = 'dot ' + (STATUS_KIND[data.state] || '');
    el.statusDot.title = data.detail || '';
    if (data.detail && data.state !== 'live') el.statusText.textContent += ' — ' + data.detail;
  } catch {
    el.statusText.textContent = 'Servidor no disponible';
    el.statusDot.className = 'dot error';
  }
}

// ------------------------------------------------------------------ acciones

async function save() {
  el.save.disabled = true;
  try {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg)
    });
    if (!res.ok) {
      let msg = 'HTTP ' + res.status;
      try { msg = (await res.json())?.error || msg; } catch { /* sin cuerpo */ }
      throw new Error(msg);
    }
    markClean();
    toast('Guardado. La fuente de OBS ya esta actualizada.', 'ok');
    pollStatus();
  } catch (err) {
    toast('No se pudo guardar: ' + err.message, 'err');
  } finally {
    el.save.disabled = false;
  }
}

async function load() {
  const res = await fetch('/api/config', { cache: 'no-store' });
  cfg = mergeDefaults(await res.json());
  await refreshAssets();
  rebuild();
  sendConfig();
}

function resetDefaults() {
  if (!confirm('¿Restablecer todos los ajustes a los valores por defecto?\n\nSe conservan tu usuario y tu token.')) return;
  const { username, token } = cfg.connection;
  cfg = mergeDefaults({});
  cfg.connection.username = username;
  cfg.connection.token = token;
  markDirty();
  rebuild();
  toast('Ajustes restablecidos. Pulsa Guardar para aplicarlos.', 'ok');
}

function obsUrl() {
  const url = new URL('/source', location.href);
  url.searchParams.set('w', String(cfg.layout.width));
  url.searchParams.set('h', String(cfg.layout.height));
  return url.toString();
}

function openObsDialog() {
  el.obsUrl.textContent = obsUrl();
  const only = new URL(obsUrl());
  only.searchParams.set('marquee', '1');
  el.obsUrl2.textContent = only.toString();
  el.obsSize.textContent = `${cfg.layout.width} x ${cfg.layout.height}`;
  el.obsDialog.showModal();
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    toast('Copiado', 'ok');
  } catch {
    toast('Copia manual: ' + value, 'err');
  }
}

// ------------------------------------------------------------------ arranque

el.save.addEventListener('click', save);
el.reset.addEventListener('click', resetDefaults);
el.obs.addEventListener('click', openObsDialog);
el.btnCloseObs.addEventListener('click', () => el.obsDialog.close());
el.btnCopyUrl.addEventListener('click', () => copyText(obsUrl()));
el.btnCloseAssets.addEventListener('click', () => el.assetDialog.close());
el.obsUrl.addEventListener('click', () => copyText(el.obsUrl.textContent));
el.obsUrl2.addEventListener('click', () => copyText(el.obsUrl2.textContent));
el.replay.addEventListener('click', startDemo);
el.previewSize.addEventListener('change', fitPreview);
el.previewGrid.addEventListener('change', () => {
  el.stage.style.background = el.previewGrid.checked
    ? 'repeating-conic-gradient(#171b26 0% 25%, #12151e 0% 50%) 50% / 22px 22px'
    : '#0a0c11';
});

el.assetUpload.addEventListener('change', async () => {
  for (const file of el.assetUpload.files || []) await uploadImage(file, () => {});
  el.assetUpload.value = '';
  renderLibrary(el.assetGrid);
});

el.frame.addEventListener('load', () => { sendConfig(); startDemo(); });

el.search.addEventListener('input', applySearch);

window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    save();
  }
});

window.addEventListener('resize', fitPreview);

window.addEventListener('beforeunload', (e) => {
  if (dirty) { e.preventDefault(); e.returnValue = ''; }
});

await load();
fitPreview();
setInterval(pollStatus, 2000);
pollStatus();
