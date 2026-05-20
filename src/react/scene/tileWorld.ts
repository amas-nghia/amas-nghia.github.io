export type TileKind = 'sand' | 'rock' | 'path' | 'plateau' | 'wall' | 'crate' | 'water';

export type TileCell = {
  kind: TileKind;
  height: number;
};

export type TileDef = {
  top: string;
  side: string;
  height: number;
  tint?: string;
};

export const TILE_SIZE = 1.5;
export const WORLD_WIDTH = 25;
export const WORLD_DEPTH = 25;

const tileBaseUrl = './assets/kenney_desert-shooter-pack_1.0/PNG/Tiles/Tiles';

export const tileDefs: Record<TileKind, TileDef> = {
  sand: { top: `${tileBaseUrl}/tile_0054.png`, side: `${tileBaseUrl}/tile_0072.png`, height: 0.34 },
  rock: { top: `${tileBaseUrl}/tile_0118.png`, side: `${tileBaseUrl}/tile_0051.png`, height: 0.5 },
  path: { top: `${tileBaseUrl}/tile_0154.png`, side: `${tileBaseUrl}/tile_0072.png`, height: 0.36 },
  plateau: { top: `${tileBaseUrl}/tile_0172.png`, side: `${tileBaseUrl}/tile_0074.png`, height: 0.68 },
  wall: { top: `${tileBaseUrl}/tile_0170.png`, side: `${tileBaseUrl}/tile_0186.png`, height: 1.45 },
  crate: { top: `${tileBaseUrl}/tile_0220.png`, side: `${tileBaseUrl}/tile_0221.png`, height: 0.95 },
  water: { top: `${tileBaseUrl}/tile_0113.png`, side: `${tileBaseUrl}/tile_0095.png`, height: 0.26 }
};

export function createWorldMap(): TileCell[][] {
  const map: TileCell[][] = [];
  const centerX = Math.floor(WORLD_WIDTH / 2);
  const centerZ = Math.floor(WORLD_DEPTH / 2);

  for (let z = 0; z < WORLD_DEPTH; z += 1) {
    const row: TileCell[] = [];
    for (let x = 0; x < WORLD_WIDTH; x += 1) {
      const dx = x - centerX;
      const dz = z - centerZ;
      const distance = Math.hypot(dx, dz);
      let kind: TileKind = 'sand';

      if (Math.abs(dx) <= 1 || Math.abs(dz) <= 1 || Math.abs(dx - dz) <= 1 || Math.abs(dx + dz) <= 1) {
        kind = 'path';
      }

      if (distance > 11.2) {
        kind = 'rock';
      }

      if ((x === 3 && z > 3 && z < 10) || (z === 4 && x > 15 && x < 22) || (x === 21 && z > 14 && z < 21)) {
        kind = 'wall';
      }

      if ((x === 6 && z === 17) || (x === 17 && z === 6) || (x === 18 && z === 18) || (x === 8 && z === 7)) {
        kind = 'crate';
      }

      if ((x > 4 && x < 8 && z > 19 && z < 23) || (x > 18 && x < 22 && z > 2 && z < 5)) {
        kind = 'water';
      }

      if (distance < 3.2) {
        kind = 'plateau';
      }

      row.push({ kind, height: tileDefs[kind].height });
    }
    map.push(row);
  }

  return map;
}

export function gridToWorld(x: number, z: number) {
  return {
    x: (x - Math.floor(WORLD_WIDTH / 2)) * TILE_SIZE,
    z: (z - Math.floor(WORLD_DEPTH / 2)) * TILE_SIZE
  };
}
