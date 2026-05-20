import { useMemo } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { TileBlock } from './TileBlock';
import { createWorldMap, getTopTextureForCell, gridToWorld, tileDefs } from './tileWorld';

export function VoxelWorld() {
  const map = useMemo(() => createWorldMap(), []);
  const textureUrls = useMemo(() => {
    const urls = new Set<string>();
    Object.values(tileDefs).forEach((def) => {
      urls.add(def.side);
      Object.values(def.variants).forEach((url) => urls.add(url));
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

    const cache = new Map<string, THREE.Material[]>();
    for (const [kind, def] of Object.entries(tileDefs)) {
      const sideTexture = textureMap.get(def.side);
      const side = new THREE.MeshStandardMaterial({ map: sideTexture, roughness: 0.94 });
      Object.values(def.variants).forEach((topUrl) => {
        const topTexture = textureMap.get(topUrl);
        const top = new THREE.MeshStandardMaterial({ map: topTexture, roughness: 0.9 });
        const bottom = new THREE.MeshStandardMaterial({ map: sideTexture, roughness: 0.96 });
        cache.set(`${kind}:${topUrl}`, [side, side, top, bottom, side, side]);
      });
    }
    return cache;
  }, [textureUrls, textures]);

  return (
    <group name="KenneyVoxelWorld">
      {map.map((row, z) =>
        row.map((cell, x) => {
          const position = gridToWorld(x, z);
          const topTexture = getTopTextureForCell(map, x, z);
          const materials = materialCache.get(`${cell.kind}:${topTexture}`);
          if (!materials) {
            return null;
          }
          return <TileBlock key={`${x}:${z}`} cell={cell} x={position.x} z={position.z} materials={materials} />;
        })
      )}
    </group>
  );
}
