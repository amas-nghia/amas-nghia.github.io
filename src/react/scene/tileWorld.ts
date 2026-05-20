export type BlockKind = 'earth' | 'grass' | 'tree' | 'wall' | 'path' | 'water';
export type BlockFamily = 'ground' | 'foliage' | 'wall' | 'path' | 'water';

export type TileCell = {
  kind: BlockKind;
  family: BlockFamily;
  solid: boolean;
};

export type TileVariant = {
  isolated: string;
  endN: string;
  endE: string;
  endS: string;
  endW: string;
  straightNS: string;
  straightEW: string;
  cornerNE: string;
  cornerNW: string;
  cornerSE: string;
  cornerSW: string;
  teeN: string;
  teeE: string;
  teeS: string;
  teeW: string;
  cross: string;
  side: string;
};

export type TileDef = {
  family: BlockFamily;
  side: string;
  variants: TileVariant;
  tint?: string;
  topOffset?: number;
};

export const TILE_SIZE = 1;
export const BLOCK_HEIGHT = 1;
export const WORLD_WIDTH = 25;
export const WORLD_DEPTH = 25;

const tileBaseUrl = './assets/kenney_desert-shooter-pack_1.0/PNG/Tiles/Tiles';
const tile = (index: number) => `${tileBaseUrl}/tile_${String(index).padStart(4, '0')}.png`;

const groundVariants: TileVariant = {
  isolated: tile(54),
  endN: tile(55),
  endE: tile(56),
  endS: tile(57),
  endW: tile(58),
  straightNS: tile(59),
  straightEW: tile(60),
  cornerNE: tile(61),
  cornerNW: tile(62),
  cornerSE: tile(63),
  cornerSW: tile(64),
  teeN: tile(65),
  teeE: tile(66),
  teeS: tile(67),
  teeW: tile(68),
  cross: tile(69),
  side: tile(72)
};

const grassVariants: TileVariant = {
  isolated: tile(95),
  endN: tile(96),
  endE: tile(97),
  endS: tile(98),
  endW: tile(99),
  straightNS: tile(113),
  straightEW: tile(114),
  cornerNE: tile(115),
  cornerNW: tile(116),
  cornerSE: tile(117),
  cornerSW: tile(118),
  teeN: tile(131),
  teeE: tile(132),
  teeS: tile(133),
  teeW: tile(134),
  cross: tile(135),
  side: tile(94)
};

const wallVariants: TileVariant = {
  isolated: tile(170),
  endN: tile(171),
  endE: tile(172),
  endS: tile(173),
  endW: tile(174),
  straightNS: tile(186),
  straightEW: tile(187),
  cornerNE: tile(188),
  cornerNW: tile(189),
  cornerSE: tile(190),
  cornerSW: tile(191),
  teeN: tile(203),
  teeE: tile(204),
  teeS: tile(205),
  teeW: tile(206),
  cross: tile(207),
  side: tile(169)
};

const pathVariants: TileVariant = {
  isolated: tile(154),
  endN: tile(155),
  endE: tile(156),
  endS: tile(157),
  endW: tile(158),
  straightNS: tile(172),
  straightEW: tile(173),
  cornerNE: tile(174),
  cornerNW: tile(175),
  cornerSE: tile(176),
  cornerSW: tile(177),
  teeN: tile(190),
  teeE: tile(191),
  teeS: tile(192),
  teeW: tile(193),
  cross: tile(194),
  side: tile(153)
};

const waterVariants: TileVariant = {
  isolated: tile(113),
  endN: tile(114),
  endE: tile(115),
  endS: tile(116),
  endW: tile(117),
  straightNS: tile(131),
  straightEW: tile(132),
  cornerNE: tile(133),
  cornerNW: tile(134),
  cornerSE: tile(135),
  cornerSW: tile(136),
  teeN: tile(149),
  teeE: tile(150),
  teeS: tile(151),
  teeW: tile(152),
  cross: tile(153),
  side: tile(112)
};

const treeVariants: TileVariant = {
  isolated: tile(80),
  endN: tile(81),
  endE: tile(82),
  endS: tile(83),
  endW: tile(84),
  straightNS: tile(85),
  straightEW: tile(86),
  cornerNE: tile(87),
  cornerNW: tile(88),
  cornerSE: tile(89),
  cornerSW: tile(90),
  teeN: tile(91),
  teeE: tile(92),
  teeS: tile(93),
  teeW: tile(94),
  cross: tile(95),
  side: tile(79)
};

export const tileDefs: Record<BlockKind, TileDef> = {
  earth: { family: 'ground', side: tile(72), variants: groundVariants },
  grass: { family: 'foliage', side: tile(94), variants: grassVariants },
  tree: { family: 'foliage', side: tile(79), variants: treeVariants, topOffset: 0.02 },
  wall: { family: 'wall', side: tile(169), variants: wallVariants },
  path: { family: 'path', side: tile(153), variants: pathVariants },
  water: { family: 'water', side: tile(112), variants: waterVariants }
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

      let kind: BlockKind = 'earth';
      if (Math.abs(dx) <= 1 || Math.abs(dz) <= 1 || Math.abs(dx - dz) <= 1 || Math.abs(dx + dz) <= 1) {
        kind = 'path';
      }
      if (distance > 9.8) {
        kind = 'wall';
      }
      if ((x > 3 && x < 8 && z > 16 && z < 22) || (x > 17 && x < 22 && z > 3 && z < 8)) {
        kind = 'water';
      }
      if ((x > 4 && x < 10 && z > 4 && z < 9) || (x > 14 && x < 20 && z > 14 && z < 20)) {
        kind = 'grass';
      }
      if ((x === 6 && z === 6) || (x === 8 && z === 7) || (x === 17 && z === 17) || (x === 18 && z === 15)) {
        kind = 'tree';
      }

      row.push({
        kind,
        family: tileDefs[kind].family,
        solid: kind !== 'water'
      });
    }
    map.push(row);
  }

  return map;
}

export function gridToWorld(x: number, z: number) {
  return {
    x: x - Math.floor(WORLD_WIDTH / 2),
    z: z - Math.floor(WORLD_DEPTH / 2)
  };
}

export function getTopTextureForCell(map: TileCell[][], x: number, z: number): string {
  const cell = map[z]?.[x];
  if (!cell) {
    return tileDefs.earth.variants.isolated;
  }

  const variants = tileDefs[cell.kind].variants;
  const same = (tx: number, tz: number) => map[tz]?.[tx]?.kind === cell.kind;
  const n = same(x, z - 1);
  const e = same(x + 1, z);
  const s = same(x, z + 1);
  const w = same(x - 1, z);
  const count = Number(n) + Number(e) + Number(s) + Number(w);

  if (count === 0) return variants.isolated;
  if (count === 4) return variants.cross;

  if (count === 1) {
    if (n) return variants.endN;
    if (e) return variants.endE;
    if (s) return variants.endS;
    return variants.endW;
  }

  if (count === 2) {
    if (n && s) return variants.straightNS;
    if (e && w) return variants.straightEW;
    if (n && e) return variants.cornerNE;
    if (n && w) return variants.cornerNW;
    if (s && e) return variants.cornerSE;
    return variants.cornerSW;
  }

  if (!n) return variants.teeN;
  if (!e) return variants.teeE;
  if (!s) return variants.teeS;
  return variants.teeW;
}
