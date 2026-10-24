// Purchasable cosmetics. Visual styling lives in the client (lib/cosmetics.js),
// keyed by the same ids; the server only owns price, level gate and ownership.
// Listed in shop order: by level gate, then price.
export const TILE_SKINS = [
  { id: 'klasik', name: 'Klasik', price: 0, minLevel: 1 },
  { id: 'tinta', name: 'Tinta', price: 0, minLevel: 1 },
  { id: 'more', name: 'More', price: 200, minLevel: 1 },
  { id: 'suma', name: 'Šuma', price: 200, minLevel: 1 },
  { id: 'lavanda', name: 'Lavanda', price: 250, minLevel: 2 },
  { id: 'bombon', name: 'Bombon', price: 300, minLevel: 2 },
  { id: 'breskva', name: 'Breskva', price: 350, minLevel: 2 },
  { id: 'pruge', name: 'Pruge', price: 400, minLevel: 3 },
  { id: 'tockice', name: 'Točkice', price: 400, minLevel: 3 },
  { id: 'zalazak', name: 'Zalazak', price: 450, minLevel: 3 },
  { id: 'mreza', name: 'Mreža', price: 450, minLevel: 3 },
  { id: 'neon', name: 'Neon', price: 500, minLevel: 3 },
  { id: 'karo', name: 'Karo', price: 500, minLevel: 4 },
  { id: 'aurora', name: 'Aurora', price: 600, minLevel: 4 },
  { id: 'lubenica', name: 'Lubenica', price: 650, minLevel: 5 },
  { id: 'retro', name: 'Retro', price: 700, minLevel: 5 },
  { id: 'drvo', name: 'Drvo', price: 750, minLevel: 5 },
  { id: 'mramor', name: 'Mramor', price: 800, minLevel: 6 },
  { id: 'galaksija', name: 'Galaksija', price: 1200, minLevel: 7 },
  { id: 'zlato', name: 'Zlato', price: 1500, minLevel: 8 },
];

export const STARTER_ITEMS = TILE_SKINS.filter((s) => s.price === 0).map((s) => s.id);
export const DEFAULT_TILE = 'klasik';
export const STARTING_COINS = 100;

export const findTileSkin = (id) => TILE_SKINS.find((s) => s.id === id);
