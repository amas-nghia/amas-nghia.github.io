import * as THREE from 'three';
import { TILE_SIZE, type TileCell } from './tileWorld';

type TileBlockProps = {
  cell: TileCell;
  x: number;
  z: number;
  materials: THREE.Material[];
};

export function TileBlock({ cell, x, z, materials }: TileBlockProps) {
  return (
    <mesh position={[x, cell.height / 2 - 0.28, z]} castShadow={cell.height > 0.5} receiveShadow material={materials}>
      <boxGeometry args={[TILE_SIZE, cell.height, TILE_SIZE]} />
    </mesh>
  );
}
