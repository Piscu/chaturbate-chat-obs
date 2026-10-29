/**
 * Esquema de configuracion compartido entre el editor, la fuente de OBS y el servidor.
 *
 * El editor se construye automaticamente a partir de SCHEMA, de modo que cualquier
 * opcion anadida aqui aparece en la interfaz sin tocar el HTML del editor.
 *
 * Tipos de campo soportados: bool, number, range, text, password, textarea,
 * select, color, image, list.
 */

export const CONFIG_VERSION = 1;

export const DEFAULT_CONFIG = {
  version: CONFIG_VERSION,

  connection: {
    username: '',
    token: '',
    testbed: false,
    pollTimeout: 10,
    reconnectMs: 3000
  },

  theme: {
    preset: 'neon',
    fontFamily: "'Segoe UI', 'Inter', system-ui, sans-serif",
    textColor: '#e9e9f5',
    accentColor: '#ff2e88',
    panelBg: 'rgba(12, 12, 24, 0.72)',
    panelBorder: 'rgba(255, 255, 255, 0.10)',
    panelRadius: 14,
    panelOpacity: 100,
    backdropBlur: 8
  },

  layout: {
    width: 420,
    height: 560,
    position: 'bottom-left',
    offsetX: 24,
    offsetY: 24,
    gap: 12
  },

  header: {
    enabled: true,
    title: 'Chat'
  },

  chat: {
    enabled: true,
    maxMessages: 50,
    gap: 6,
    fontSize: 18,
    lineHeight: 1.45,
    fontWeight: 600,
    usernameColor: '#ffffff',
    messageColor: '#dcdce8',
    messageStyle: 'plain',
    messageBg: 'rgba(255, 255, 255, 0.07)',
    messageRadius: 12,
    messagePaddingX: 12,
    messagePaddingY: 6,
    showDividers: false,
    usernameStyle: 'bold',
    usernameGlow: false,
    usernameStroke: false,
    textShadow: false,
    avatarShape: 'circle',
    badgeGap: 5,
    showBadges: true,
    showFollowerBadge: true,
    badgeSize: 15,
    showTimestamps: false,
    timestampFormat: 'HH:mm',
    avatarStyle: 'letter',
    avatarSize: 26,
    emoteSize: 22,
    emoteVerticalAlign: true,
    emoteFallback: 'code',
    newMessageAnimation: 'slide',
    lifetimeSec: 0,
    collapseRepeated: true,
    hideEmptyMessages: true,
    showOwnMessages: false,
    blockedWords: '',
    userColors: {
      owner: '#ff2e88',
      mod: '#00e08a',
      fanclub: '#ffb02e',
      l: '#b06bff',
      p: '#e07bff',
      tr: '#5b8cff',
      t: '#66d9ff',
      g: '#9a9ab0'
    }
  },

  events: {
    tips: { enabled: true, minTokens: 1, durationMs: 9000, showMessage: true, showAnon: true },
    media: { enabled: true, durationMs: 9000 },
    notices: { enabled: true, colors: 'app', color: '#ffffff' },
    privateMessages: { enabled: false },
    joins: { enabled: false, showFollowersOnly: true },
    leaves: { enabled: false },
    follows: { enabled: false },
    fanclub: { enabled: true },
    status: { showLiveIndicator: true, labelOffline: 'OFFLINE', labelLive: 'EN DIRECTO' }
  },

  tipMenu: {
    enabled: true,
    separator: '•',
    amountPrefix: '🎟️',
    direction: 'left',
    speed: 55,
    height: 46,
    fontSize: 17,
    fontWeight: 600,
    color: '#ffffff',
    bg: 'rgba(12, 12, 24, 0.85)',
    itemGap: 36,
    loop: true,
    pauseOnHover: false,
    fadeEdges: true,
    labelPosition: 'before',
    items: []
  },

  assets: {
    backgroundImage: '',
    backgroundOpacity: 25,
    backgroundFit: 'cover',
    logo: '',
    logoWidth: 0
  },

  advanced: {
    debug: false,
    showConnectionBadge: false,
    emoteResolver: 'inline'
  }
};

export const THEME_PRESETS = {
  neon: {
    label: 'Neon',
    theme: {
      fontFamily: "'Segoe UI', 'Inter', system-ui, sans-serif",
      textColor: '#e9e9f5',
      accentColor: '#ff2e88',
      panelBg: 'rgba(12, 12, 24, 0.72)',
      panelBorder: 'rgba(255, 46, 136, 0.35)'
    }
  },
  gothic: {
    label: 'Gothic',
    theme: {
      fontFamily: "'Georgia', 'Times New Roman', serif",
      textColor: '#ded9d0',
      accentColor: '#b08bff',
      panelBg: 'rgba(10, 8, 12, 0.82)',
      panelBorder: 'rgba(176, 139, 255, 0.35)'
    }
  },
  cute: {
    label: 'Cute',
    theme: {
      fontFamily: "'Comic Sans MS', 'Baloo 2', system-ui, sans-serif",
      textColor: '#4a3b52',
      accentColor: '#ff7eb6',
      panelBg: 'rgba(255, 240, 246, 0.90)',
      panelBorder: 'rgba(255, 126, 182, 0.45)'
    }
  },
  minimal: {
    label: 'Minimal',
    theme: {
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      textColor: '#f2f2f2',
      accentColor: '#ffffff',
      panelBg: 'rgba(0, 0, 0, 0.55)',
      panelBorder: 'rgba(255, 255, 255, 0.14)'
    }
  },
  retro: {
    label: 'Retro',
    theme: {
      fontFamily: "'Courier New', monospace",
      textColor: '#7dfcb0',
      accentColor: '#00ff9c',
      panelBg: 'rgba(0, 20, 10, 0.88)',
      panelBorder: 'rgba(0, 255, 156, 0.40)'
    }
  },
  ocean: {
    label: 'Oceano',
    theme: {
      fontFamily: "'Segoe UI', 'Inter', system-ui, sans-serif",
      textColor: '#e6f7ff',
      accentColor: '#22d3ee',
      panelBg: 'rgba(6, 20, 34, 0.74)',
      panelBorder: 'rgba(34, 211, 238, 0.38)'
    }
  },
  sunset: {
    label: 'Atardecer',
    theme: {
      fontFamily: "'Segoe UI', 'Inter', system-ui, sans-serif",
      textColor: '#fff3e6',
      accentColor: '#ff8a3d',
      panelBg: 'rgba(30, 12, 20, 0.76)',
      panelBorder: 'rgba(255, 138, 61, 0.40)'
    }
  },
  cyber: {
    label: 'Cyber',
    theme: {
      fontFamily: "'Consolas', 'JetBrains Mono', monospace",
      textColor: '#eafcff',
      accentColor: '#00f0ff',
      panelBg: 'rgba(8, 6, 24, 0.80)',
      panelBorder: 'rgba(255, 0, 200, 0.42)'
    }
  },
  candy: {
    label: 'Caramelo',
    theme: {
      fontFamily: "'Baloo 2', 'Comic Sans MS', system-ui, sans-serif",
      textColor: '#3d2b45',
      accentColor: '#ff5fa2',
      panelBg: 'rgba(255, 241, 249, 0.90)',
      panelBorder: 'rgba(255, 95, 162, 0.45)'
    }
  },
  midnight: {
    label: 'Medianoche',
    theme: {
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      textColor: '#dfe3ee',
      accentColor: '#8b97ff',
      panelBg: 'rgba(10, 13, 26, 0.82)',
      panelBorder: 'rgba(139, 151, 255, 0.34)'
    }
  },
  // Inspirado en el crawl de Star Wars: negro espacio, amarillo y esquinas
  // rectas. El bloque chat hace que el preset cambie tambien el aspecto de las
  // lineas, no solo la paleta (ver buildPresetControl en editor.mjs).
  saber: {
    label: 'Sable de luz',
    theme: {
      fontFamily: "'Trebuchet MS', 'Segoe UI', system-ui, sans-serif",
      textColor: '#f2e9c9',
      accentColor: '#ffe81f',
      panelBg: 'rgba(5, 7, 12, 0.88)',
      panelBorder: 'rgba(255, 232, 31, 0.30)',
      panelRadius: 6,
      backdropBlur: 4
    },
    chat: {
      messageStyle: 'saber',
      messageBg: 'rgba(255, 232, 31, 0.05)',
      messageRadius: 4,
      usernameStyle: 'uppercase',
      usernameGlow: true,
      usernameStroke: true,
      textShadow: true
    }
  }
};

const LAYOUT_POSITIONS = [
  { value: 'top-left', label: 'Arriba izq.' },
  { value: 'top-center', label: 'Arriba centro' },
  { value: 'top-right', label: 'Arriba der.' },
  { value: 'center-left', label: 'Centro izq.' },
  { value: 'center', label: 'Centro' },
  { value: 'center-right', label: 'Centro der.' },
  { value: 'bottom-left', label: 'Abajo izq.' },
  { value: 'bottom-center', label: 'Abajo centro' },
  { value: 'bottom-right', label: 'Abajo der.' }
];

const ANIMATIONS = [
  { value: 'none', label: 'Ninguna' },
  { value: 'fade', label: 'Fundido' },
  { value: 'slide', label: 'Deslizar' },
  { value: 'pop', label: 'Pop' },
  { value: 'bounce', label: 'Rebote' }
];

const MESSAGE_STYLES = [
  { value: 'plain', label: 'Plano (sin fondo)' },
  { value: 'bubble', label: 'Burbuja' },
  { value: 'card', label: 'Tarjeta con borde' },
  { value: 'glass', label: 'Cristal (desenfoque)' },
  { value: 'zebra', label: 'Filas alternas' },
  { value: 'outline', label: 'Barra lateral de acento' },
  { value: 'saber', label: 'Sable de luz (barra luminosa)' }
];

const USERNAME_STYLES = [
  { value: 'normal', label: 'Normal' },
  { value: 'bold', label: 'Negrita' },
  { value: 'uppercase', label: 'Mayusculas' },
  { value: 'italic', label: 'Cursiva' },
  { value: 'outline', label: 'Contorno' }
];

const AVATAR_SHAPES = [
  { value: 'circle', label: 'Circulo' },
  { value: 'rounded', label: 'Redondeado' },
  { value: 'square', label: 'Cuadrado' }
];

const TIP_LABEL_POSITIONS = [
  { value: 'before', label: 'Cantidad primero (100 - Saludo)' },
  { value: 'after', label: 'Etiqueta primero (Saludo - 100)' }
];

const EMOTE_FALLBACKS = [
  { value: 'code', label: 'Mostrar el código :CODE:' },
  { value: 'hidden', label: 'Ocultar' }
];

const EMOTE_RESOLVERS = [
  { value: 'inline', label: 'Solo markup inline (sin peticiones)' },
  { value: 'api', label: 'Inline + API de Chaturbate (resuelve códigos sueltos)' }
];

const BG_FIT = [
  { value: 'cover', label: 'Cubrir' },
  { value: 'contain', label: 'Contener' },
  { value: '100% 100%', label: 'Estirar' }
];

/** Cada hoja es una pestana del editor. */
export const SCHEMA = [
  {
    id: 'connection',
    label: 'Conexion',
    icon: 'link',
    hint: 'El token se genera en https://chaturbate.com/statsapi/authtoken/ con el permiso "Events API". Usa un token privado para ver tips y mensajes privados.',
    fields: [
      { key: 'connection.username', label: 'Usuario de Chaturbate', type: 'text' },
      { key: 'connection.token', label: 'Token de la Events API', type: 'password' },
      { key: 'connection.testbed', label: 'Usar servidor de pruebas', type: 'bool', help: 'Marca la casilla "Use testbed" al crear el token.' },
      { key: 'connection.pollTimeout', label: 'Espera del long-poll (s)', type: 'range', min: 1, max: 30, step: 1 },
      { key: 'connection.reconnectMs', label: 'Reintento tras error (ms)', type: 'range', min: 500, max: 15000, step: 500 }
    ]
  },
  {
    id: 'layout',
    label: 'Diseno y tamano',
    icon: 'layout',
    hint: 'Pon el tamano exacto de la fuente en OBS y el panel se colocara dentro con esta posicion.',
    fields: [
      {
        key: 'theme',
        label: 'Tema',
        type: 'group',
        fields: [
          { key: 'theme.preset', label: 'Preset rapido', type: 'preset' },
          { key: 'theme.fontFamily', label: 'Fuente', type: 'text' },
          { key: 'theme.textColor', label: 'Color de texto', type: 'color' },
          { key: 'theme.accentColor', label: 'Color de acento', type: 'color' },
          { key: 'theme.panelBg', label: 'Fondo del panel', type: 'color' },
          { key: 'theme.panelBorder', label: 'Borde del panel', type: 'color' },
          { key: 'theme.panelRadius', label: 'Redondeo (px)', type: 'range', min: 0, max: 40, step: 1 },
          { key: 'theme.panelOpacity', label: 'Opacidad del panel (%)', type: 'range', min: 0, max: 100, step: 1 },
          { key: 'theme.backdropBlur', label: 'Desenfoque de fondo (px)', type: 'range', min: 0, max: 30, step: 1 }
        ]
      },
      {
        key: 'layout',
        label: 'Lienzo y posicion',
        type: 'group',
        fields: [
          { key: 'layout.width', label: 'Ancho de la fuente (px)', type: 'range', min: 120, max: 1600, step: 10 },
          { key: 'layout.height', label: 'Alto de la fuente (px)', type: 'range', min: 120, max: 1200, step: 10 },
          { key: 'layout.position', label: 'Posicion dentro del lienzo', type: 'select', options: LAYOUT_POSITIONS },
          { key: 'layout.offsetX', label: 'Separacion X (px)', type: 'range', min: 0, max: 300, step: 2 },
          { key: 'layout.offsetY', label: 'Separacion Y (px)', type: 'range', min: 0, max: 300, step: 2 },
          { key: 'layout.gap', label: 'Separacion entre bloques (px)', type: 'range', min: 0, max: 60, step: 1 }
        ]
      },
      {
        key: 'header',
        label: 'Cabecera',
        type: 'group',
        fields: [
          { key: 'header.enabled', label: 'Mostrar cabecera', type: 'bool' },
          { key: 'header.title', label: 'Titulo', type: 'text' }
        ]
      }
    ]
  },
  {
    id: 'chat',
    label: 'Chat',
    icon: 'chat',
    fields: [
      { key: 'chat.enabled', label: 'Mostrar chat', type: 'bool' },
      { key: 'chat.maxMessages', label: 'Mensajes maximos', type: 'range', min: 5, max: 300, step: 5 },
      { key: 'chat.gap', label: 'Separacion entre mensajes (px)', type: 'range', min: 0, max: 40, step: 1 },
      { key: 'chat.fontSize', label: 'Tamano de fuente (px)', type: 'range', min: 8, max: 48, step: 1 },
      { key: 'chat.lineHeight', label: 'Interlineado', type: 'range', min: 1, max: 2.5, step: 0.05 },
      { key: 'chat.fontWeight', label: 'Grosor', type: 'select', options: [
        { value: 300, label: 'Fino' }, { value: 400, label: 'Normal' }, { value: 500, label: 'Medio' },
        { value: 600, label: 'Semibold' }, { value: 700, label: 'Negrita' }, { value: 800, label: 'Black' }
      ] },
      { key: 'chat.usernameColor', label: 'Color de usuario', type: 'color', help: 'Solo se aplica a quien no tiene un color propio por grupo.' },
      { key: 'chat.messageColor', label: 'Color del mensaje', type: 'color' },
      {
        key: 'chatLook',
        label: 'Estilo de los mensajes',
        type: 'group',
        fields: [
          { key: 'chat.messageStyle', label: 'Estilo', type: 'select', options: MESSAGE_STYLES },
          { key: 'chat.messageBg', label: 'Fondo de los mensajes', type: 'color', help: 'Se usa en burbuja, tarjeta, cristal y filas alternas.' },
          { key: 'chat.messageRadius', label: 'Redondeo (px)', type: 'range', min: 0, max: 40, step: 1 },
          { key: 'chat.messagePaddingX', label: 'Relleno horizontal (px)', type: 'range', min: 0, max: 40, step: 1 },
          { key: 'chat.messagePaddingY', label: 'Relleno vertical (px)', type: 'range', min: 0, max: 30, step: 1 },
          { key: 'chat.showDividers', label: 'Separadores entre mensajes', type: 'bool' },
          { key: 'chat.usernameStyle', label: 'Estilo del nombre', type: 'select', options: USERNAME_STYLES },
          { key: 'chat.usernameGlow', label: 'Brillo en el nombre', type: 'bool', help: 'Anade un halo con el color de cada usuario.' },
          { key: 'chat.usernameStroke', label: 'Borde negro en el nombre', type: 'bool', help: 'Contorno oscuro para que el nombre se lea sobre cualquier video.' },
          { key: 'chat.textShadow', label: 'Sombra del texto', type: 'bool', help: 'Mejora la legibilidad sobre video claro.' }
        ]
      },
      { key: 'chat.showTimestamps', label: 'Mostrar hora', type: 'bool' },
      { key: 'chat.timestampFormat', label: 'Formato de hora', type: 'text', help: 'Usa HH:mm en 24h o hh:mm A en 12h.' },
      { key: 'chat.newMessageAnimation', label: 'Animacion de entrada', type: 'select', options: ANIMATIONS },
      { key: 'chat.lifetimeSec', label: 'Borrar tras (s, 0 = nunca)', type: 'range', min: 0, max: 300, step: 5 },
      { key: 'chat.collapseRepeated', label: 'Agrupar mensajes seguidos', type: 'bool', help: 'Unifica lineas del mismo usuario en una sola entrada.' },
      { key: 'chat.showOwnMessages', label: 'Mostrar mis mensajes', type: 'bool', help: 'Tus mensajes normales se ocultan para no repetir tu propio chat en directo. Activalo para probar el overlay.' },
      { key: 'chat.hideEmptyMessages', label: 'Ocultar mensajes vacios', type: 'bool' },
      { key: 'chat.blockedWords', label: 'Palabras bloqueadas', type: 'textarea', help: 'Una por linea. El mensaje se oculta si contiene alguna.' }
    ]
  },
  {
    id: 'badges',
    label: 'Insignias y emotes',
    icon: 'badge',
    fields: [
      { key: 'chat.badgeGap', label: 'Separacion de insignias (px)', type: 'range', min: 0, max: 20, step: 1 },
      { key: 'chat.showBadges', label: 'Insignias de mod y dueño', type: 'bool' },
      { key: 'chat.showFollowerBadge', label: 'Insignia de seguidor', type: 'bool' },
      { key: 'chat.badgeSize', label: 'Tamano de insignia (px)', type: 'range', min: 8, max: 40, step: 1 },
      { key: 'chat.avatarStyle', label: 'Avatar', type: 'select', options: [
        { value: 'none', label: 'Sin avatar' },
        { value: 'letter', label: 'Burbuja con la inicial (como Chaturbate)' },
        { value: 'photo', label: 'Foto publica del usuario' }
      ] },
      { key: 'chat.avatarSize', label: 'Tamano de avatar (px)', type: 'range', min: 12, max: 80, step: 2 },
      { key: 'chat.avatarShape', label: 'Forma del avatar', type: 'select', options: AVATAR_SHAPES },
      { key: 'chat.emoteSize', label: 'Tamano de emote (px)', type: 'range', min: 10, max: 80, step: 1 },
      { key: 'chat.emoteVerticalAlign', label: 'Alinear emotes con la linea base', type: 'bool' },
      { key: 'chat.emoteFallback', label: 'Si no se puede cargar un emote', type: 'select', options: EMOTE_FALLBACKS },
      { key: 'advanced.emoteResolver', label: 'Resolucion de emotes', type: 'select', options: EMOTE_RESOLVERS },
      { key: 'chat.userColors', label: 'Colores por grupo', type: 'group', help: 'Si el usuario pertenece a uno de estos grupos, su color gana sobre el color de usuario.', fields: [
        { key: 'chat.userColors.owner', label: 'Dueño (o)', type: 'color' },
        { key: 'chat.userColors.mod', label: 'Mod (m)', type: 'color' },
        { key: 'chat.userColors.fanclub', label: 'Fanclub (f)', type: 'color' },
        { key: 'chat.userColors.l', label: 'Morado oscuro (l)', type: 'color' },
        { key: 'chat.userColors.p', label: 'Morado claro (p)', type: 'color' },
        { key: 'chat.userColors.tr', label: 'Azul oscuro (tr)', type: 'color' },
        { key: 'chat.userColors.t', label: 'Azul claro (t)', type: 'color' },
        { key: 'chat.userColors.g', label: 'Gris (g)', type: 'color' }
      ] }
    ]
  },
  {
    id: 'events',
    label: 'Eventos',
    icon: 'star',
    hint: 'La Events API no envia el numero de viewers, asi que no se puede mostrar un contador automatico.',
    fields: [
      { key: 'events.tips', label: 'Tips', type: 'group', fields: [
        { key: 'events.tips.enabled', label: 'Mostrar tips', type: 'bool' },
        { key: 'events.tips.minTokens', label: 'Tokens minimos', type: 'number', min: 0 },
        { key: 'events.tips.durationMs', label: 'Duracion (ms)', type: 'range', min: 1000, max: 60000, step: 500 },
        { key: 'events.tips.showMessage', label: 'Mostrar el mensaje del donante', type: 'bool' },
        { key: 'events.tips.showAnon', label: 'Mostrar tips anonimos', type: 'bool' }
      ] },
      { key: 'events.media', label: 'Media', type: 'group', fields: [
        { key: 'events.media.enabled', label: 'Mostrar compras de media', type: 'bool' },
        { key: 'events.media.durationMs', label: 'Duracion (ms)', type: 'range', min: 1000, max: 60000, step: 500 }
      ] },
      { key: 'events.notices', label: 'Avisos', type: 'group', fields: [
        { key: 'events.notices.enabled', label: 'Mostrar avisos del broadcaster', type: 'bool' },
        { key: 'events.notices.colors', label: 'Colores del aviso', type: 'select', help: 'Los avisos del broadcaster llegan con su propio color de fondo y de texto.', options: [
          { value: 'app', label: 'Los de esta app (usa el color de abajo)' },
          { value: 'chaturbate', label: 'Los de Chaturbate (respeta los del aviso)' }
        ] },
        { key: 'events.notices.color', label: 'Color del texto del aviso', type: 'color' }
      ] },
      { key: 'events.privateMessages', label: 'Mensajes privados', type: 'group', fields: [
        { key: 'events.privateMessages.enabled', label: 'Mostrar mensajes privados en directo', type: 'bool',
          help: 'Desactivado por defecto: los DM son privados, no los publiques sin querer.' }
      ] },
      { key: 'events.joins', label: 'Entradas', type: 'group', fields: [
        { key: 'events.joins.enabled', label: 'Mostrar entradas', type: 'bool' },
        { key: 'events.joins.showFollowersOnly', label: 'Solo seguidores', type: 'bool' }
      ] },
      { key: 'events.leaves', label: 'Salidas', type: 'group', fields: [
        { key: 'events.leaves.enabled', label: 'Mostrar salidas', type: 'bool' }
      ] },
      { key: 'events.follows', label: 'Follows', type: 'group', fields: [
        { key: 'events.follows.enabled', label: 'Mostrar nuevos seguidores', type: 'bool' }
      ] },
      { key: 'events.fanclub', label: 'Fanclub', type: 'group', fields: [
        { key: 'events.fanclub.enabled', label: 'Mostrar entradas al fanclub', type: 'bool' }
      ] },
      { key: 'events.status', label: 'Estado', type: 'group', fields: [
        { key: 'events.status.showLiveIndicator', label: 'Mostrar indicador de directo', type: 'bool' },
        { key: 'events.status.labelLive', label: 'Texto "en directo"', type: 'text' },
        { key: 'events.status.labelOffline', label: 'Texto "offline"', type: 'text' }
      ] }
    ]
  },
  {
    id: 'tipmenu',
    label: 'Marquesina tip menu',
    icon: 'menu',
    hint: 'Chaturbate no expone el tip menu por API, asi que defines aqui los Same items y la marquesina los recorre.',
    fields: [
      { key: 'tipMenu.enabled', label: 'Mostrar marquesina', type: 'bool' },
      { key: 'tipMenu.separator', label: 'Separador entre items', type: 'text' },
      { key: 'tipMenu.amountPrefix', label: 'Icono antes de la cantidad', type: 'text' },
      { key: 'tipMenu.labelPosition', label: 'Orden del texto', type: 'select', options: TIP_LABEL_POSITIONS },
      { key: 'tipMenu.direction', label: 'Direccion', type: 'select', options: [
        { value: 'left', label: 'Hacia la izquierda' }, { value: 'right', label: 'Hacia la derecha' }
      ] },
      { key: 'tipMenu.speed', label: 'Velocidad (px/s)', type: 'range', min: 5, max: 300, step: 1 },
      { key: 'tipMenu.loop', label: 'Repetir en bucle', type: 'bool' },
      { key: 'tipMenu.pauseOnHover', label: 'Pausar al pasar el raton', type: 'bool' },
      { key: 'tipMenu.height', label: 'Alto (px)', type: 'range', min: 20, max: 140, step: 1 },
      { key: 'tipMenu.fontSize', label: 'Tamano de fuente (px)', type: 'range', min: 8, max: 48, step: 1 },
      { key: 'tipMenu.fontWeight', label: 'Grosor', type: 'select', options: [
        { value: 400, label: 'Normal' }, { value: 500, label: 'Medio' },
        { value: 600, label: 'Semibold' }, { value: 700, label: 'Negrita' }
      ] },
      { key: 'tipMenu.color', label: 'Color del texto', type: 'color' },
      { key: 'tipMenu.bg', label: 'Fondo de la marquesina', type: 'color' },
      { key: 'tipMenu.itemGap', label: 'Separacion entre items (px)', type: 'range', min: 4, max: 200, step: 2 },
      { key: 'tipMenu.fadeEdges', label: 'Desvanecer en los bordes', type: 'bool' },
      { key: 'tipMenu.items', label: 'Items del tip menu', type: 'list', itemLabel: 'Item',
        fields: [
          { key: 'amount', label: 'Tokens', type: 'number', min: 0 },
          { key: 'label', label: 'Etiqueta', type: 'text' },
          { key: 'image', label: 'PNG / icono', type: 'image' },
          { key: 'color', label: 'Color propio', type: 'color' }
        ]
      },
      { key: 'tipMenu.importer', label: 'Importar desde texto', type: 'importer' }
    ]
  },
  {
    id: 'assets',
    label: 'PNGs y fondos',
    icon: 'image',
    fields: [
      { key: 'assets.backgroundImage', label: 'Fondo del panel', type: 'image' },
      { key: 'assets.backgroundOpacity', label: 'Opacidad del fondo (%)', type: 'range', min: 0, max: 100, step: 1 },
      { key: 'assets.backgroundFit', label: 'Ajuste del fondo', type: 'select', options: BG_FIT },
      { key: 'assets.logo', label: 'Logo (PNG)', type: 'image' },
      { key: 'assets.logoWidth', label: 'Ancho del logo (0 = auto)', type: 'range', min: 0, max: 800, step: 5 },
      { key: 'assets.library', label: 'Biblioteca de imagenes', type: 'assetlib' }
    ]
  },
  {
    id: 'advanced',
    label: 'Avanzado',
    icon: 'gear',
    fields: [
      { key: 'advanced.showConnectionBadge', label: 'Mostrar estado de conexion', type: 'bool' },
      { key: 'advanced.debug', label: 'Registro de depuracion', type: 'bool' }
    ]
  }
];

/** Lee un valor por ruta con puntos: getPath(cfg, 'chat.fontSize'). */
export function getPath(obj, path, fallback = undefined) {
  let cur = obj;
  for (const part of String(path).split('.')) {
    if (cur === null || cur === undefined) return fallback;
    cur = cur[part];
  }
  return cur === undefined ? fallback : cur;
}

/** Escribe un valor por ruta con puntos. Crea los objetos intermedios si faltan. */
export function setPath(obj, path, value) {
  const parts = String(path).split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (typeof cur[p] !== 'object' || cur[p] === null) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
  return obj;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Fusiona sobre DEFAULT_CONFIG respetando el tipo declarado en los defaults.
 * Asi una config corrupta o incompleta nunca rompe la fuente.
 */
export function mergeDefaults(value, base = DEFAULT_CONFIG) {
  if (!isPlainObject(value)) return clone(base);
  const out = clone(base);
  for (const key of Object.keys(value)) {
    const incoming = value[key];
    const fallback = base[key];
    if (Array.isArray(fallback)) {
      out[key] = Array.isArray(incoming) ? clone(incoming) : clone(fallback);
    } else if (isPlainObject(fallback)) {
      out[key] = mergeDefaults(isPlainObject(incoming) ? incoming : {}, fallback);
    } else if (incoming === undefined || incoming === null) {
      out[key] = clone(fallback);
    } else if (typeof incoming !== typeof fallback) {
      out[key] = clone(fallback);
    } else {
      out[key] = incoming;
    }
  }
  return out;
}

/** Convierte "#rrggbb" o "rgba(r,g,b,a)" a un color plano para <input type="color">. */
export function colorToHex(value) {
  if (typeof value !== 'string') return '#000000';
  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split('').map((c) => c + c).join('') : hex[1];
    return '#' + h.toLowerCase();
  }
  const rgb = value.trim().match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (rgb) {
    const to2 = (n) => Math.max(0, Math.min(255, Math.round(Number(n)))).toString(16).padStart(2, '0');
    return '#' + to2(rgb[1]) + to2(rgb[2]) + to2(rgb[3]);
  }
  return '#000000';
}

/** Extrae el canal alpha de un color (1 si es opaco). */
export function colorToAlpha(value) {
  if (typeof value !== 'string') return 1;
  const m = value.match(/^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/i);
  return m ? Math.max(0, Math.min(1, Number(m[1]))) : 1;
}

const hexToRgb = (hex) => {
  const h = colorToHex(hex).slice(1);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

/** Devuelve "#rrggbb" o "rgba(r,g,b,a)" segun el alpha. */
export function buildColor(hex, alpha) {
  const a = Math.max(0, Math.min(1, Number(alpha)));
  if (a >= 0.999) return colorToHex(hex);
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`;
}
