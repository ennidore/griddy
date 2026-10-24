// Visual definitions for cosmetics. Prices, level gates and ownership come
// from the server catalog; ids must match server/src/shop/catalog.js.

export const BACKGROUNDS = {
  light: [
    { id: 'borovnica', name: 'Borovnica', swatch: ['#f6f3ee', '#ffffff', '#6d5bff'] },
    { id: 'jabuka', name: 'Jabuka', swatch: ['#eaf5ef', '#fbfefc', '#17a173'] },
    { id: 'jagoda', name: 'Jagoda', swatch: ['#fbf1ef', '#fffafa', '#e5383b'] },
  ],
  dark: [
    { id: 'noc', name: 'Noć', swatch: ['#15171f', '#1f222d', '#8576ff'] },
    { id: 'ponoc', name: 'Ponoć', swatch: ['#0f1630', '#18213f', '#22b58a'] },
    { id: 'zar', name: 'Žar', swatch: ['#1a1214', '#261a1c', '#ff5a5f'] },
  ],
};

/**
 * Tile skins as CSS custom properties consumed by <Tile>.
 * bg / sel accept any CSS background (colours or gradients).
 */
export const TILE_SKINS = {
  klasik: {
    bg: 'var(--color-surface)',
    fg: 'var(--color-ink)',
    edge: 'var(--color-line)',
    selBg: 'var(--color-grape)',
    selFg: '#ffffff',
    selEdge: 'var(--color-grape-deep)',
  },
  tinta: {
    bg: '#262b3a',
    fg: '#f6f3ee',
    edge: '#11141c',
    selBg: '#ffc23d',
    selFg: '#1d2230',
    selEdge: '#d99a12',
  },
  bombon: {
    bg: 'linear-gradient(160deg, #ffe1ee, #ffb8d6)',
    fg: '#8a1f52',
    edge: '#e58fb6',
    selBg: 'linear-gradient(160deg, #ff6fae, #ff3d8f)',
    selFg: '#ffffff',
    selEdge: '#c41e66',
  },
  neon: {
    bg: '#0b0d18',
    fg: '#5ef2ff',
    edge: '#000000',
    glow: '0 0 10px rgb(94 242 255 / 0.85)',
    selBg: '#ff3df2',
    selFg: '#ffffff',
    selEdge: '#a3009a',
  },
  drvo: {
    bg: 'linear-gradient(160deg, #ecc995, #cf9b5f)',
    fg: '#4a2c12',
    edge: '#a06a33',
    selBg: 'linear-gradient(160deg, #8a5527, #6b3f1a)',
    selFg: '#ffe9c8',
    selEdge: '#432710',
  },
  zlato: {
    bg: 'linear-gradient(160deg, #fff3c4, #f2c443)',
    fg: '#6b4a00',
    edge: '#c3930f',
    glow: '0 1px 0 rgb(255 255 255 / 0.6)',
    selBg: 'linear-gradient(160deg, #2a2f40, #161924)',
    selFg: '#ffd84a',
    selEdge: '#000000',
  },

  // ---- Colourways
  more: {
    bg: '#1e5f8c',
    fg: '#e8f6ff',
    edge: '#123d5c',
    selBg: '#ffd166',
    selFg: '#1d2230',
    selEdge: '#c99a2e',
  },
  suma: {
    bg: '#1f4d3a',
    fg: '#e4f5ea',
    edge: '#12301f',
    selBg: '#a3d977',
    selFg: '#13301f',
    selEdge: '#6f9e45',
  },
  lavanda: {
    bg: '#ece6ff',
    fg: '#4b3a8f',
    edge: '#cfc4f2',
    selBg: '#7b61ff',
    selFg: '#ffffff',
    selEdge: '#5640d6',
  },

  // ---- Gradients
  breskva: {
    bg: 'linear-gradient(160deg, #fff1e6, #ffd3b8)',
    fg: '#7a3b16',
    edge: '#eab08c',
    selBg: 'linear-gradient(160deg, #ff9f68, #ff7b54)',
    selFg: '#ffffff',
    selEdge: '#c4552f',
  },
  zalazak: {
    bg: 'linear-gradient(160deg, #ffd29d, #ff9a8b 55%, #f7708f)',
    fg: '#5a1430',
    edge: '#d9566f',
    selBg: 'linear-gradient(160deg, #6a3093, #a044ff)',
    selFg: '#ffffff',
    selEdge: '#43205c',
  },
  aurora: {
    bg: 'linear-gradient(160deg, #0f2d3a, #1d4f5c 45%, #3b2a6b)',
    fg: '#b8fff0',
    edge: '#071820',
    glow: '0 0 8px rgb(120 255 220 / 0.6)',
    selBg: 'linear-gradient(160deg, #3ef2c7, #8a6bff)',
    selFg: '#0b1a22',
    selEdge: '#2b5a8c',
  },

  // ---- Patterns
  pruge: {
    bg: 'repeating-linear-gradient(135deg, #eaf8f2 0 7px, #d2efe2 7px 14px)',
    fg: '#14563f',
    edge: '#a9d9c4',
    selBg: 'repeating-linear-gradient(135deg, #22c39d 0 7px, #1aae8a 7px 14px)',
    selFg: '#ffffff',
    selEdge: '#137a5c',
  },
  tockice: {
    bg: 'radial-gradient(circle, #ffc2d1 2.5px, transparent 3px) 0 0 / 14px 14px, #fff0f4',
    fg: '#8a1f52',
    edge: '#f0b4c4',
    selBg: 'radial-gradient(circle, rgb(255 255 255 / 0.35) 2.5px, transparent 3px) 0 0 / 14px 14px, #ff4f8b',
    selFg: '#ffffff',
    selEdge: '#c22a62',
  },
  mreza: {
    bg:
      'linear-gradient(#cfe0f5 1px, transparent 1px) 0 0 / 10px 10px,' +
      ' linear-gradient(90deg, #cfe0f5 1px, transparent 1px) 0 0 / 10px 10px, #f7fbff',
    fg: '#1f4e8c',
    edge: '#b7cde8',
    selBg:
      'linear-gradient(rgb(255 255 255 / 0.22) 1px, transparent 1px) 0 0 / 10px 10px,' +
      ' linear-gradient(90deg, rgb(255 255 255 / 0.22) 1px, transparent 1px) 0 0 / 10px 10px, #2f6fd6',
    selFg: '#ffffff',
    selEdge: '#1f4e9c',
  },
  karo: {
    bg: 'conic-gradient(#e6ebf3 25%, #ffffff 0 50%, #e6ebf3 0 75%, #ffffff 0) 0 0 / 16px 16px',
    fg: '#1d2230',
    edge: '#c9d2df',
    selBg: 'conic-gradient(#2b3a55 25%, #36486d 0 50%, #2b3a55 0 75%, #36486d 0) 0 0 / 16px 16px',
    selFg: '#ffffff',
    selEdge: '#1a2438',
  },
  lubenica: {
    // Pink flesh with seeds; the green rind is the tile edge.
    bg:
      'radial-gradient(2px 3px at 22% 30%, #2a1a1c 95%, transparent),' +
      ' radial-gradient(2px 3px at 78% 26%, #2a1a1c 95%, transparent),' +
      ' radial-gradient(2px 3px at 70% 78%, #2a1a1c 95%, transparent),' +
      ' radial-gradient(2px 3px at 26% 74%, #2a1a1c 95%, transparent), #ff6b7f',
    fg: '#3b0a14',
    edge: '#2f9e44',
    selBg: 'linear-gradient(160deg, #3fb85a, #2f9e44)',
    selFg: '#ffffff',
    selEdge: '#1d6b2c',
  },
  retro: {
    bg: 'linear-gradient(180deg, #f6e7c8 0 62%, #e8833a 62% 72%, #f6e7c8 72% 78%, #8c4a1f 78% 88%, #f6e7c8 88%)',
    fg: '#5a2d0c',
    edge: '#c9925a',
    selBg: 'linear-gradient(180deg, #e8833a 0 62%, #f6e7c8 62% 72%, #e8833a 72% 78%, #8c4a1f 78% 88%, #e8833a 88%)',
    selFg: '#ffffff',
    selEdge: '#8c4a1f',
  },
  mramor: {
    // Thin diagonal "veins" over a soft grey sheen.
    bg:
      'linear-gradient(115deg, transparent 38%, rgb(110 110 128 / 0.28) 40%, transparent 43%),' +
      ' linear-gradient(35deg, transparent 62%, rgb(110 110 128 / 0.2) 63.5%, transparent 65.5%),' +
      ' linear-gradient(160deg, transparent 18%, rgb(110 110 128 / 0.16) 19.5%, transparent 21.5%),' +
      ' linear-gradient(125deg, #fbfbfc, #eaeaef 50%, #f6f6f8)',
    fg: '#2a2d36',
    edge: '#c4c4cc',
    selBg: 'linear-gradient(125deg, #2a2d36, #4a4f5e)',
    selFg: '#f4e7c5',
    selEdge: '#15171d',
  },
  galaksija: {
    bg:
      'radial-gradient(1px 1px at 18% 28%, #ffffff 99%, transparent),' +
      ' radial-gradient(1px 1px at 72% 18%, #ffffff 99%, transparent),' +
      ' radial-gradient(1.5px 1.5px at 40% 82%, #cfd8ff 99%, transparent),' +
      ' radial-gradient(1px 1px at 86% 66%, #ffffff 99%, transparent),' +
      ' radial-gradient(1px 1px at 12% 70%, #e2d6ff 99%, transparent),' +
      ' radial-gradient(circle at 30% 20%, #3b2a7a, #120c2e 70%)',
    fg: '#ece7ff',
    edge: '#07051a',
    glow: '0 0 8px rgb(170 150 255 / 0.8)',
    selBg: 'radial-gradient(circle at 30% 20%, #ff7ad9, #7a2aff)',
    selFg: '#ffffff',
    selEdge: '#3d0e8c',
  },
};

export const skinFor = (id) => TILE_SKINS[id] || TILE_SKINS.klasik;
