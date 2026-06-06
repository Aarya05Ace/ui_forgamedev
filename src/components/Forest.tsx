/**
 * Forest.tsx — a dense stylized forest ringing the arena, built from Kenney's
 * CC0 "Nature Kit" (low-poly, vertex-colored GLBs, ~8KB each). Replaces the old
 * Egyptian tomb-temple + dead-forest ring.
 *
 * Each Kenney GLB has 2 primitives (e.g. trunk + foliage) with their own colored
 * materials, so we instance EVERY primitive (not just the first) — each becomes one
 * GPU InstancedMesh sharing one transform set. ~20 models => ~40 draw calls for a
 * forest of several hundred props, comfortably 60fps. Height is auto-normalized so
 * placement/scale is predictable regardless of each model's authored size.
 *
 * No collision in this game (movement is server-side proximity), so trees only need
 * to sit OUTSIDE the play radius for sightlines; small undergrowth can sprinkle inward.
 */
import { useMemo, useRef, useLayoutEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const K = '/models/forest/kenney';

interface Xform { x: number; z: number; ry: number; s: number }

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// seeded scatter in an annulus [rMin,rMax]
function scatter(seed: number, n: number, rMin: number, rMax: number, sMin: number, sMax: number): Xform[] {
  const rnd = mulberry32(seed);
  const out: Xform[] = [];
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    // bias toward the outer edge so density grows with distance (depth)
    const r = rMin + Math.pow(rnd(), 0.7) * (rMax - rMin);
    out.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, ry: rnd() * Math.PI * 2, s: sMin + rnd() * (sMax - sMin) });
  }
  return out;
}

interface Part { geometry: THREE.BufferGeometry; material: THREE.Material }

// Load a GLB, bake world matrices, and return every primitive + its normalized scale/offset.
function useParts(url: string) {
  const { scene } = useGLTF(url) as any;
  return useMemo(() => {
    const parts: Part[] = [];
    const box = new THREE.Box3();
    scene.updateWorldMatrix(true, true);
    scene.traverse((o: any) => {
      if (o.isMesh && o.geometry) {
        const g = o.geometry.clone();
        g.applyMatrix4(o.matrixWorld);
        g.computeBoundingBox();
        box.union(g.boundingBox!);
        const m = (o.material as THREE.Material);
        (m as any).fog = true;
        parts.push({ geometry: g, material: m });
      }
    });
    const size = new THREE.Vector3(); box.getSize(size);
    return { parts, height: size.y || 1, minY: box.min.y };
  }, [scene]);
}

function InstancedModel({ url, transforms, targetH }: { url: string; transforms: Xform[]; targetH: number }) {
  const { parts, height, minY } = useParts(url);
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const norm = targetH / height; // uniform scale so the model is ~targetH tall

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    refs.current.forEach((inst) => {
      if (!inst) return;
      transforms.forEach((t, i) => {
        const s = norm * t.s;
        dummy.position.set(t.x, -minY * s, t.z); // sit base on the ground
        dummy.rotation.set(0, t.ry, 0);
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
      });
      inst.instanceMatrix.needsUpdate = true;
      inst.computeBoundingSphere();
    });
  }, [parts, transforms, norm, minY]);

  return (
    <>
      {parts.map((p, idx) => (
        <instancedMesh
          key={idx}
          ref={(el) => { refs.current[idx] = el; }}
          args={[p.geometry, p.material, transforms.length]}
          castShadow={false}
          receiveShadow={false}
          frustumCulled={false}
        />
      ))}
    </>
  );
}

export function Forest() {
  const L = useMemo(() => {
    // GATE_RADIUS is 22, play limit ~28 — trees start at r=30 to keep sightlines clear.
    return {
      // dense tree belt outside the arena (sightlines stay clear)
      pineTall: scatter(101, 46, 30, 78, 0.85, 1.4),
      pineDefault: scatter(102, 38, 31, 80, 0.8, 1.3),
      pineRound: scatter(103, 30, 30, 76, 0.8, 1.25),
      oak: scatter(104, 22, 33, 82, 0.9, 1.5),
      treeDefault: scatter(105, 26, 32, 80, 0.85, 1.4),
      treeTall: scatter(106, 22, 34, 84, 0.9, 1.45),
      // undergrowth — can creep just inside the ring for foreground depth
      bush: scatter(201, 44, 24, 70, 0.8, 1.6),
      bushDetailed: scatter(202, 30, 26, 68, 0.8, 1.5),
      mushroomRed: scatter(203, 26, 20, 60, 0.7, 1.5),
      mushroomGroup: scatter(204, 16, 22, 58, 0.7, 1.3),
      mushroomTan: scatter(205, 18, 21, 60, 0.7, 1.4),
      grass: scatter(206, 70, 18, 64, 0.8, 1.8),
      grassLarge: scatter(207, 40, 20, 64, 0.8, 1.6),
      grassLeafs: scatter(208, 40, 19, 62, 0.8, 1.6),
      flowerRed: scatter(209, 22, 19, 56, 0.8, 1.4),
      flowerYellow: scatter(210, 22, 20, 56, 0.8, 1.4),
      flowerPurple: scatter(211, 18, 21, 56, 0.8, 1.4),
      log: scatter(212, 12, 26, 64, 0.9, 1.5),
      logLarge: scatter(213, 7, 28, 62, 0.9, 1.4),
      rock: scatter(214, 16, 26, 70, 0.9, 2.2),
    };
  }, []);

  return (
    <group>
      {/* trees */}
      <InstancedModel url={`${K}/tree_pineTallA_detailed.glb`} transforms={L.pineTall} targetH={11} />
      <InstancedModel url={`${K}/tree_pineDefaultA.glb`} transforms={L.pineDefault} targetH={9} />
      <InstancedModel url={`${K}/tree_pineRoundD.glb`} transforms={L.pineRound} targetH={8} />
      <InstancedModel url={`${K}/tree_oak.glb`} transforms={L.oak} targetH={8.5} />
      <InstancedModel url={`${K}/tree_default.glb`} transforms={L.treeDefault} targetH={7.5} />
      <InstancedModel url={`${K}/tree_tall.glb`} transforms={L.treeTall} targetH={10} />

      {/* shrubs + undergrowth */}
      <InstancedModel url={`${K}/plant_bush.glb`} transforms={L.bush} targetH={1.3} />
      <InstancedModel url={`${K}/plant_bushDetailed.glb`} transforms={L.bushDetailed} targetH={1.4} />
      <InstancedModel url={`${K}/grass.glb`} transforms={L.grass} targetH={0.7} />
      <InstancedModel url={`${K}/grass_large.glb`} transforms={L.grassLarge} targetH={0.9} />
      <InstancedModel url={`${K}/grass_leafs.glb`} transforms={L.grassLeafs} targetH={0.8} />

      {/* mushrooms + flowers (color pops in the gloom) */}
      <InstancedModel url={`${K}/mushroom_red.glb`} transforms={L.mushroomRed} targetH={0.7} />
      <InstancedModel url={`${K}/mushroom_redGroup.glb`} transforms={L.mushroomGroup} targetH={0.8} />
      <InstancedModel url={`${K}/mushroom_tan.glb`} transforms={L.mushroomTan} targetH={0.6} />
      <InstancedModel url={`${K}/flower_redA.glb`} transforms={L.flowerRed} targetH={0.6} />
      <InstancedModel url={`${K}/flower_yellowA.glb`} transforms={L.flowerYellow} targetH={0.6} />
      <InstancedModel url={`${K}/flower_purpleA.glb`} transforms={L.flowerPurple} targetH={0.6} />

      {/* fallen logs + mossy rocks */}
      <InstancedModel url={`${K}/log.glb`} transforms={L.log} targetH={0.7} />
      <InstancedModel url={`${K}/log_large.glb`} transforms={L.logLarge} targetH={0.9} />
      <InstancedModel url={`${K}/cliff_block_rock.glb`} transforms={L.rock} targetH={3.2} />
    </group>
  );
}

['tree_pineTallA_detailed','tree_pineDefaultA','tree_pineRoundD','tree_oak','tree_default','tree_tall',
 'plant_bush','plant_bushDetailed','grass','grass_large','grass_leafs','mushroom_red','mushroom_redGroup',
 'mushroom_tan','flower_redA','flower_yellowA','flower_purpleA','log','log_large','cliff_block_rock']
  .forEach(n => useGLTF.preload(`${K}/${n}.glb`));
