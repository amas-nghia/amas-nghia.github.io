import * as THREE from 'three';
import { BLOCK_HEIGHT, TILE_SIZE, type TileCell } from './tileWorld';

type TileBlockProps = {
  cell: TileCell;
  x: number;
  z: number;
  materials: THREE.Material[];
};

export function TileBlock({ cell, x, z, materials }: TileBlockProps) {
  return (
    <mesh position={[x, BLOCK_HEIGHT / 2 - 0.5, z]} castShadow={cell.solid} receiveShadow material={materials}>
      <boxGeometry args={[TILE_SIZE, BLOCK_HEIGHT, TILE_SIZE]} />
    </mesh>
  );
}
