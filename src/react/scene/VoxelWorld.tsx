import { useMemo } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { TileBlock } from './TileBlock';
import { createWorldMap, gridToWorld, tileDefs, type TileKind } from './tileWorld';

export function VoxelWorld() {
  const map = useMemo(() => createWorldMap(), []);
  const textureUrls = useMemo(() => {
    const urls = new Set<string>();
    Object.values(tileDefs).forEach((def) => {
      urls.add(def.top);
      urls.add(def.side);
    });
    return Array.from(urls);
  }, []);
  const textures = useTexture(textureUrls);

  const materialCache = useMemo(() => {
    const textureMap = new Map<string, THREE.Texture>();
    textureUrls.forEach((url, index) => {
      const texture = textures[index];
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestMipmapNearestFilter;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.needsUpdate = true;
      textureMap.set(url, texture);
    });

    const bottom = new THREE.MeshStandardMaterial({ color: '#6d5a4f', roughness: 0.96 });
    const cache = new Map<TileKind, THREE.Material[]>();
    (Object.keys(tileDefs) as TileKind[]).forEach((kind) => {
      const def = tileDefs[kind];
      const sideTexture = textureMap.get(def.side);
      const topTexture = textureMap.get(def.top);
      const side = new THREE.MeshStandardMaterial({ map: sideTexture, roughness: 0.94 });
      const top = new THREE.MeshStandardMaterial({ map: topTexture, roughness: 0.9 });
      cache.set(kind, [side, side, top, bottom, side, side]);
    });
    return cache;
  }, [textureUrls, textures]);

  return (
    <group name="KenneyVoxelWorld">
      {map.map((row, z) =>
        row.map((cell, x) => {
          const position = gridToWorld(x, z);
          const materials = materialCache.get(cell.kind);
          if (!materials) {
            return null;
          }
          return <TileBlock key={`${x}:${z}`} cell={cell} x={position.x} z={position.z} materials={materials} />;
        })
      )}
    </group>
  );
}
