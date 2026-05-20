import React, { useMemo } from 'react';
import * as THREE from 'three';
import { FurnitureItem } from '@/lib/floorplan';
import {
  createDoorWoodTexture, createDoorWoodNormal,
  createFabricTexture, createFabricNormal,
  createMarbleTexture,
} from './materials';

interface Props {
  item: FurnitureItem;
  isNight?: boolean;
}

// Shared procedural textures (built lazily, once)
let _woodMap: THREE.Texture | null = null;
let _woodNormal: THREE.Texture | null = null;
let _marbleMap: THREE.Texture | null = null;
let _linenMap: THREE.Texture | null = null;
let _linenNormal: THREE.Texture | null = null;
let _greyFabricMap: THREE.Texture | null = null;
let _navyFabricMap: THREE.Texture | null = null;
let _beigeFabricMap: THREE.Texture | null = null;

const sharedWood = () => {
  if (!_woodMap) _woodMap = createDoorWoodTexture(1, 1);
  return _woodMap;
};
const sharedWoodNormal = () => {
  if (!_woodNormal) _woodNormal = createDoorWoodNormal(1, 1);
  return _woodNormal;
};
const sharedMarble = () => {
  if (!_marbleMap) _marbleMap = createMarbleTexture(1, 1);
  return _marbleMap;
};
const sharedLinen = () => {
  if (!_linenMap) _linenMap = createFabricTexture([240, 236, 226], 2, 2);
  return _linenMap;
};
const sharedLinenNormal = () => {
  if (!_linenNormal) _linenNormal = createFabricNormal(2, 2);
  return _linenNormal;
};
const sharedGreyFabric = () => {
  if (!_greyFabricMap) _greyFabricMap = createFabricTexture([130, 132, 138], 2, 2);
  return _greyFabricMap;
};
const sharedNavyFabric = () => {
  if (!_navyFabricMap) _navyFabricMap = createFabricTexture([60, 78, 102], 2, 2);
  return _navyFabricMap;
};
const sharedBeigeFabric = () => {
  if (!_beigeFabricMap) _beigeFabricMap = createFabricTexture([198, 178, 148], 2, 2);
  return _beigeFabricMap;
};

export const Furniture3D = ({ item, isNight }: Props) => {
  const { type, w, h } = item;

  switch (type) {
    case 'bed': {
      const wood = sharedWood();
      const woodNormal = sharedWoodNormal();
      const linen = sharedLinen();
      const linenN = sharedLinenNormal();
      const blanket = sharedNavyFabric();
      return (
        <group>
          {/* Bed base / box spring — walnut */}
          <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 1, h]} />
            <meshStandardMaterial color="#6a4530" map={wood} normalMap={woodNormal} normalScale={new THREE.Vector2(0.4, 0.4)} roughness={0.55} />
          </mesh>
          {/* Upholstered tufted headboard */}
          <mesh position={[0, 2.6, -h / 2 + 0.1]} castShadow receiveShadow>
            <boxGeometry args={[w + 0.1, 4.4, 0.35]} />
            <meshStandardMaterial color="#a8987f" map={sharedBeigeFabric()} normalMap={linenN} roughness={0.95} />
          </mesh>
          {/* Headboard wood trim */}
          <mesh position={[0, 4.85, -h / 2 + 0.1]} castShadow>
            <boxGeometry args={[w + 0.2, 0.18, 0.45]} />
            <meshStandardMaterial color="#4a3220" map={wood} roughness={0.5} />
          </mesh>
          {/* Mattress — thicker and rounded edge feel */}
          <mesh position={[0, 1.55, 0.1]} castShadow receiveShadow>
            <boxGeometry args={[w - 0.18, 0.95, h - 0.18]} />
            <meshStandardMaterial color="#f6f3ec" map={linen} normalMap={linenN} normalScale={new THREE.Vector2(0.3, 0.3)} roughness={0.95} />
          </mesh>
          {/* Crisp white sheet */}
          <mesh position={[0, 2.04, 0.1]} receiveShadow>
            <boxGeometry args={[w - 0.1, 0.04, h - 0.1]} />
            <meshStandardMaterial color="#fbf9f3" roughness={0.95} />
          </mesh>
          {/* Pillows — 4 stacked plump */}
          {[-1, 1].map(side => (
            <group key={`pillow-${side}`}>
              <mesh position={[side * w / 4.5, 2.25, -h / 2 + 1]} castShadow>
                <boxGeometry args={[w * 0.32, 0.45, 1.0]} />
                <meshStandardMaterial color="#fdfaf2" map={linen} normalMap={linenN} roughness={0.95} />
              </mesh>
              <mesh position={[side * w / 4.5, 2.55, -h / 2 + 1.05]} castShadow>
                <boxGeometry args={[w * 0.28, 0.3, 0.85]} />
                <meshStandardMaterial color="#f0e9d8" map={sharedBeigeFabric()} roughness={0.95} />
              </mesh>
            </group>
          ))}
          {/* Folded throw / duvet at foot */}
          <mesh position={[0, 2.18, h / 4]} castShadow receiveShadow>
            <boxGeometry args={[w - 0.05, 0.28, h / 2.4]} />
            <meshStandardMaterial color="#3a4a64" map={blanket} normalMap={linenN} roughness={0.95} />
          </mesh>
        </group>
      );
    }
      
    case 'sofa': {
      const fabric = sharedGreyFabric();
      const fabricN = sharedLinenNormal();
      const accent = sharedBeigeFabric();
      return (
        <group>
          {/* Plinth / wooden base shadow */}
          <mesh position={[0, 0.15, 0]} castShadow>
            <boxGeometry args={[w - 0.2, 0.3, h - 0.2]} />
            <meshStandardMaterial color="#2a221c" roughness={0.8} />
          </mesh>
          {/* Main upholstered body */}
          <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 1.1, h]} />
            <meshStandardMaterial color="#7e8590" map={fabric} normalMap={fabricN} normalScale={new THREE.Vector2(0.5, 0.5)} roughness={0.95} />
          </mesh>
          {/* Backrest */}
          <mesh position={[0, 2.0, -h / 2 + 0.45]} castShadow receiveShadow>
            <boxGeometry args={[w, 1.9, 0.9]} />
            <meshStandardMaterial color="#7e8590" map={fabric} normalMap={fabricN} roughness={0.95} />
          </mesh>
          {/* Armrests with rounded look (use slightly inset cubes) */}
          {[-1, 1].map(side => (
            <mesh key={`arm-${side}`} position={[side * (w / 2 - 0.4), 1.6, 0.1]} castShadow receiveShadow>
              <boxGeometry args={[0.8, 1.7, h - 0.3]} />
              <meshStandardMaterial color="#7e8590" map={fabric} normalMap={fabricN} roughness={0.95} />
            </mesh>
          ))}
          {/* Seat cushions — plump */}
          {[-1, 1].map(side => (
            <mesh key={`seat-${side}`} position={[side * (w / 4), 1.55, 0.25]} castShadow receiveShadow>
              <boxGeometry args={[w / 2 - 1.0, 0.55, h - 1.3]} />
              <meshStandardMaterial color="#a4abb6" map={fabric} normalMap={fabricN} roughness={0.95} />
            </mesh>
          ))}
          {/* Throw pillows */}
          {[-w / 3, w / 3].map((px, i) => (
            <mesh key={`pil-${i}`} position={[px, 2.05, -h / 4]} rotation={[0, 0, i ? 0.1 : -0.1]} castShadow>
              <boxGeometry args={[1.0, 1.0, 0.32]} />
              <meshStandardMaterial color={i ? '#c8b89a' : '#3a4a64'} map={i ? accent : sharedNavyFabric()} normalMap={fabricN} roughness={0.95} />
            </mesh>
          ))}
          {/* Wooden tapered legs */}
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
            <mesh key={`leg-${i}`} position={[sx * (w / 2 - 0.35), 0.15, sz * (h / 2 - 0.35)]} castShadow>
              <cylinderGeometry args={[0.06, 0.10, 0.3, 8]} />
              <meshStandardMaterial color="#3a2a1c" roughness={0.5} metalness={0.05} />
            </mesh>
          ))}
        </group>
      );
    }

    case 'dining_table': {
      const wood = sharedWood();
      const woodN = sharedWoodNormal();
      const fabric = sharedBeigeFabric();
      const fabricN = sharedLinenNormal();
      const numChairsSide = Math.max(1, Math.floor((w - 1) / 2));
      const chairs: any[] = [];
      const renderChair = (key: string, x: number, z: number, rotY: number) => (
        <group key={key} position={[x, 0, z]} rotation={[0, rotY, 0]}>
          {/* Cushion seat */}
          <mesh position={[0, 1.45, 0]} castShadow>
            <boxGeometry args={[1.15, 0.18, 1.1]} />
            <meshStandardMaterial color="#c8b89a" map={fabric} normalMap={fabricN} roughness={0.95} />
          </mesh>
          {/* Wooden seat plate */}
          <mesh position={[0, 1.34, 0]} castShadow>
            <boxGeometry args={[1.18, 0.08, 1.12]} />
            <meshStandardMaterial color="#5a3d24" map={wood} normalMap={woodN} roughness={0.45} />
          </mesh>
          {/* Backrest — slatted */}
          <mesh position={[0, 2.55, -0.5]} castShadow>
            <boxGeometry args={[1.15, 2.2, 0.1]} />
            <meshStandardMaterial color="#5a3d24" map={wood} normalMap={woodN} roughness={0.45} />
          </mesh>
          {/* Legs */}
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], li) => (
            <mesh key={`l-${li}`} position={[sx * 0.5, 0.65, sz * 0.5]} castShadow>
              <boxGeometry args={[0.1, 1.3, 0.1]} />
              <meshStandardMaterial color="#3a2818" roughness={0.5} />
            </mesh>
          ))}
        </group>
      );
      for (let i = 0; i < numChairsSide; i++) {
        const px = -w / 2 + (w / (numChairsSide + 1)) * (i + 1);
        chairs.push(renderChair(`c1-${i}`, px, -h / 2 - 0.7, 0));
        chairs.push(renderChair(`c2-${i}`, px, h / 2 + 0.7, Math.PI));
      }
      return (
        <group>
          {/* Solid wood table top with grain */}
          <mesh position={[0, 2.55, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 0.18, h]} />
            <meshStandardMaterial color="#5a3d24" map={wood} normalMap={woodN} normalScale={new THREE.Vector2(0.5, 0.5)} roughness={0.4} envMapIntensity={0.7} />
          </mesh>
          {/* Apron under top */}
          <mesh position={[0, 2.4, 0]} castShadow>
            <boxGeometry args={[w - 0.4, 0.12, h - 0.4]} />
            <meshStandardMaterial color="#4a3220" map={wood} roughness={0.5} />
          </mesh>
          {/* Tapered legs */}
          {[[-w / 2 + 0.4, -h / 2 + 0.4], [w / 2 - 0.4, -h / 2 + 0.4], [-w / 2 + 0.4, h / 2 - 0.4], [w / 2 - 0.4, h / 2 - 0.4]].map((pos, i) => (
            <mesh key={i} position={[pos[0], 1.2, pos[1]]} castShadow>
              <boxGeometry args={[0.18, 2.4, 0.18]} />
              <meshStandardMaterial color="#3a2818" map={wood} roughness={0.5} />
            </mesh>
          ))}
          {/* Centerpiece — small vase + runner */}
          <mesh position={[0, 2.66, 0]} receiveShadow>
            <boxGeometry args={[w * 0.45, 0.02, 0.8]} />
            <meshStandardMaterial color="#c8b89a" map={fabric} roughness={0.95} />
          </mesh>
          <mesh position={[0, 2.95, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.22, 0.6, 16]} />
            <meshStandardMaterial color="#9a9a9a" roughness={0.25} metalness={0.6} />
          </mesh>
          {chairs}
        </group>
      );
    }

    case 'tv': {
      const wood = sharedWood();
      return (
        <group>
          {/* TV console — floating wood unit */}
          <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 1.2, h]} />
            <meshStandardMaterial color="#3a2818" map={wood} normalMap={sharedWoodNormal()} roughness={0.5} envMapIntensity={0.7} />
          </mesh>
          {/* Drawer dividers */}
          {[-w / 4, w / 4].map((px, i) => (
            <mesh key={`drw-${i}`} position={[px, 0.7, h / 2 + 0.005]}>
              <boxGeometry args={[0.04, 1, 0.01]} />
              <meshStandardMaterial color="#1a1208" />
            </mesh>
          ))}
          {/* Brushed metal handles */}
          {[-w / 4, w / 4].map((px, i) => (
            <mesh key={`hnd-${i}`} position={[px, 0.7, h / 2 + 0.06]}>
              <boxGeometry args={[0.5, 0.05, 0.04]} />
              <meshStandardMaterial color="#cfcfcf" metalness={0.85} roughness={0.2} />
            </mesh>
          ))}
          {/* Wall-mount TV bezel */}
          <mesh position={[0, 3.4, -h / 2 + 0.1]} castShadow>
            <boxGeometry args={[w * 0.96, 3.2, 0.16]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.3} metalness={0.6} />
          </mesh>
          {/* Screen with subtle emissive */}
          <mesh position={[0, 3.4, -h / 2 + 0.21]}>
            <boxGeometry args={[w * 0.92, 3.0, 0.02]} />
            <meshStandardMaterial color="#0a0e1a" roughness={0.06} metalness={0.85} emissive={isNight ? '#1a3050' : '#0a0e1a'} emissiveIntensity={isNight ? 0.4 : 0.05} />
          </mesh>
        </group>
      );
    }

    case 'wardrobe': {
      const wood = sharedWood();
      return (
        <group>
          {/* Cabinet body */}
          <mesh position={[0, 3.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 7, h]} />
            <meshStandardMaterial color="#e8e2d6" roughness={0.65} envMapIntensity={0.4} />
          </mesh>
          {/* Wood door panels (3 sliding doors) */}
          {[-1, 0, 1].map(i => (
            <mesh key={`dr-${i}`} position={[(i * w) / 3, 3.5, h / 2 + 0.02]} castShadow>
              <boxGeometry args={[w / 3 - 0.05, 6.6, 0.06]} />
              <meshStandardMaterial color="#5a3d24" map={wood} normalMap={sharedWoodNormal()} roughness={0.5} envMapIntensity={0.6} />
            </mesh>
          ))}
          {/* Vertical metal handles */}
          {[-1, 0, 1].map(i => (
            <mesh key={`hnd-${i}`} position={[(i * w) / 3 + (w / 6 - 0.15), 3.5, h / 2 + 0.07]}>
              <cylinderGeometry args={[0.025, 0.025, 1.2, 8]} />
              <meshStandardMaterial color="#cfcfcf" metalness={0.9} roughness={0.18} />
            </mesh>
          ))}
          {/* Top trim */}
          <mesh position={[0, 7.05, 0]} castShadow>
            <boxGeometry args={[w + 0.05, 0.1, h + 0.05]} />
            <meshStandardMaterial color="#3a2818" map={wood} roughness={0.4} />
          </mesh>
        </group>
      );
    }

    case 'shower':
      return (
        <group>
          {/* Tile floor pan */}
          <mesh position={[0, 0.1, 0]} receiveShadow>
            <boxGeometry args={[w, 0.2, h]} />
            <meshStandardMaterial color="#dcdcdc" roughness={0.25} metalness={0.05} envMapIntensity={1.2} />
          </mesh>
          {/* Tile back wall */}
          <mesh position={[0, 3.5, -h / 2 + 0.05]} receiveShadow>
            <boxGeometry args={[w, 7, 0.1]} />
            <meshStandardMaterial color="#cfd1d3" roughness={0.4} envMapIntensity={0.6} />
          </mesh>
          {/* Front glass panel */}
          <mesh position={[0, 3.5, h / 2 - 0.05]} castShadow>
            <boxGeometry args={[w, 7, 0.06]} />
            <meshPhysicalMaterial color="#dde8ee" roughness={0.04} metalness={0.1} transparent opacity={0.18} transmission={0.85} ior={1.5} thickness={0.1} reflectivity={1.0} envMapIntensity={8} />
          </mesh>
          {/* Side glass */}
          <mesh position={[w / 2 - 0.05, 3.5, 0]} castShadow>
            <boxGeometry args={[0.06, 7, h]} />
            <meshPhysicalMaterial color="#dde8ee" roughness={0.04} metalness={0.1} transparent opacity={0.18} transmission={0.85} ior={1.5} thickness={0.1} reflectivity={1.0} envMapIntensity={8} />
          </mesh>
          {/* Glass top frame */}
          <mesh position={[0, 7.0, h / 2 - 0.05]}>
            <boxGeometry args={[w + 0.04, 0.08, 0.1]} />
            <meshStandardMaterial color="#9a9a9a" metalness={0.9} roughness={0.18} />
          </mesh>
          {/* Rain shower head ceiling-mount */}
          <mesh position={[-w / 4, 6.6, -h / 4]}>
            <cylinderGeometry args={[0.45, 0.45, 0.08, 24]} />
            <meshStandardMaterial color="#cfcfcf" metalness={0.95} roughness={0.12} />
          </mesh>
          {/* Drop pipe */}
          <mesh position={[-w / 4, 6.85, -h / 4]}>
            <cylinderGeometry args={[0.04, 0.04, 0.4, 12]} />
            <meshStandardMaterial color="#cfcfcf" metalness={0.95} roughness={0.15} />
          </mesh>
          {/* Mixer / hand shower bar */}
          <mesh position={[-w / 2 + 0.12, 4, 0]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 1.6, 10]} />
            <meshStandardMaterial color="#cfcfcf" metalness={0.92} roughness={0.18} />
          </mesh>
        </group>
      );

    case 'toilet':
      return (
        <group>
          {/* Bowl */}
          <mesh position={[0, 0.8, 0]} castShadow>
            <boxGeometry args={[w * 0.65, 1.4, h * 0.55]} />
            <meshStandardMaterial color="#fafafa" roughness={0.18} envMapIntensity={1.1} />
          </mesh>
          {/* Tank */}
          <mesh position={[0, 2.4, -h / 4]} castShadow>
            <boxGeometry args={[w * 0.85, 1.6, h * 0.32]} />
            <meshStandardMaterial color="#fafafa" roughness={0.18} envMapIntensity={1.1} />
          </mesh>
          {/* Seat lid */}
          <mesh position={[0, 1.55, h * 0.05]} castShadow>
            <boxGeometry args={[w * 0.7, 0.08, h * 0.6]} />
            <meshStandardMaterial color="#f0f0f0" roughness={0.25} />
          </mesh>
          {/* Flush button chrome */}
          <mesh position={[0, 3.0, -h / 4 + h * 0.16]}>
            <boxGeometry args={[0.5, 0.18, 0.04]} />
            <meshStandardMaterial color="#cfcfcf" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      );

    case 'bathtub':
      return (
        <group>
          <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 2.4, h]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.1} />
          </mesh>
          <mesh position={[0, 1.8, 0]}>
            <boxGeometry args={[w - 0.4, 1.2, h - 0.4]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.3} />
          </mesh>
        </group>
      );

    case 'sink': {
      const wood = sharedWood();
      const marble = sharedMarble();
      return (
        <group>
          {/* Wooden vanity cabinet */}
          <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 3, h]} />
            <meshStandardMaterial color="#5a3d24" map={wood} normalMap={sharedWoodNormal()} roughness={0.5} />
          </mesh>
          {/* Drawer fronts (2) */}
          {[-1, 1].map(s => (
            <mesh key={`drw-${s}`} position={[s * w / 4, 1.5, h / 2 + 0.02]} castShadow>
              <boxGeometry args={[w / 2 - 0.1, 2.7, 0.04]} />
              <meshStandardMaterial color="#3a2818" map={wood} roughness={0.5} />
            </mesh>
          ))}
          {/* Brushed metal pulls */}
          {[-1, 1].map(s => (
            <mesh key={`pull-${s}`} position={[s * w / 4, 2.3, h / 2 + 0.07]}>
              <boxGeometry args={[0.4, 0.06, 0.04]} />
              <meshStandardMaterial color="#cfcfcf" metalness={0.9} roughness={0.2} />
            </mesh>
          ))}
          {/* Marble countertop */}
          <mesh position={[0, 3.05, 0]} castShadow receiveShadow>
            <boxGeometry args={[w + 0.2, 0.18, h + 0.1]} />
            <meshStandardMaterial color="#f1ede5" map={marble} roughness={0.18} metalness={0.05} envMapIntensity={1.2} />
          </mesh>
          {/* Vessel basin */}
          <mesh position={[0, 3.3, 0]} castShadow>
            <cylinderGeometry args={[0.7, 0.5, 0.35, 24]} />
            <meshStandardMaterial color="#fafafa" roughness={0.15} envMapIntensity={1.2} />
          </mesh>
          {/* Faucet */}
          <mesh position={[0, 3.55, -0.4]}>
            <cylinderGeometry args={[0.05, 0.05, 0.7, 12]} />
            <meshStandardMaterial color="#cfcfcf" metalness={0.95} roughness={0.12} />
          </mesh>
          <mesh position={[0, 3.85, -0.2]} rotation={[Math.PI / 2.5, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.06, 0.55, 12]} />
            <meshStandardMaterial color="#cfcfcf" metalness={0.95} roughness={0.12} />
          </mesh>
          {/* Wall mirror */}
          <mesh position={[0, 5.2, -h / 2 + 0.05]} castShadow>
            <boxGeometry args={[w * 0.85, 2.8, 0.06]} />
            <meshStandardMaterial color="#3a2818" map={wood} roughness={0.5} />
          </mesh>
          <mesh position={[0, 5.2, -h / 2 + 0.085]}>
            <boxGeometry args={[w * 0.78, 2.6, 0.02]} />
            <meshStandardMaterial color="#dde6ef" roughness={0.05} metalness={1} envMapIntensity={2.0} />
          </mesh>
        </group>
      );
    }

    case 'stove':
      return (
        <group>
          {/* Stainless body */}
          <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 3, h]} />
            <meshStandardMaterial color="#dcdcdc" roughness={0.32} metalness={0.75} envMapIntensity={1.0} />
          </mesh>
          {/* Glass cooktop */}
          <mesh position={[0, 3.05, 0]} receiveShadow>
            <boxGeometry args={[w - 0.05, 0.1, h - 0.05]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.08} metalness={0.85} envMapIntensity={1.6} />
          </mesh>
          {/* Induction zones */}
          {[-w / 4, w / 4].flatMap((px, i) =>
            [-h / 4, h / 4].map((pz, j) => (
              <mesh key={`zone-${i}-${j}`} position={[px, 3.11, pz]}>
                <cylinderGeometry args={[0.45, 0.45, 0.01, 24]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.4} metalness={0.6} />
              </mesh>
            ))
          )}
          {/* Oven door window */}
          <mesh position={[0, 1.0, h / 2 + 0.01]}>
            <boxGeometry args={[w * 0.85, 1.6, 0.04]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.18} metalness={0.7} />
          </mesh>
          {/* Handle bar */}
          <mesh position={[0, 1.95, h / 2 + 0.06]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.05, 0.05, w * 0.85, 12]} />
            <meshStandardMaterial color="#cfcfcf" metalness={0.95} roughness={0.16} />
          </mesh>
          {/* Control knobs */}
          {[-1, -0.5, 0.5, 1].map((s, i) => (
            <mesh key={`knb-${i}`} position={[s * w / 3, 2.85, h / 2 + 0.02]}>
              <cylinderGeometry args={[0.08, 0.08, 0.04, 12]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.4} />
            </mesh>
          ))}
        </group>
      );

    case 'fridge':
      return (
        <group>
          {/* Body */}
          <mesh position={[0, 3.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 7, h]} />
            <meshStandardMaterial color="#dcdcdc" roughness={0.28} metalness={0.78} envMapIntensity={1.0} />
          </mesh>
          {/* Door split (freezer top, fridge bottom) */}
          <mesh position={[0, 5.5, h / 2 + 0.005]}>
            <boxGeometry args={[w - 0.05, 0.05, 0.01]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          {/* Vertical handles */}
          {[2.0, 5.5].map((py, i) => (
            <mesh key={`hnd-${i}`} position={[w / 2 - 0.1, py, h / 2 + 0.07]}>
              <cylinderGeometry args={[0.05, 0.05, 1.6, 12]} />
              <meshStandardMaterial color="#e8e8e8" metalness={0.95} roughness={0.15} />
            </mesh>
          ))}
          {/* Top vent */}
          <mesh position={[0, 7.05, 0]}>
            <boxGeometry args={[w + 0.05, 0.1, h + 0.05]} />
            <meshStandardMaterial color="#3a3a3a" roughness={0.5} />
          </mesh>
        </group>
      );

    case 'counter':
    case 'island': {
      const wood = sharedWood();
      const marble = sharedMarble();
      // Approx number of cabinet doors based on width
      const doorCount = Math.max(2, Math.floor(w / 1.6));
      const doorW = (w - 0.2) / doorCount;
      return (
        <group>
          {/* Toe kick */}
          <mesh position={[0, 0.15, 0]} castShadow>
            <boxGeometry args={[w - 0.2, 0.3, h - 0.1]} />
            <meshStandardMaterial color="#1a1208" roughness={0.7} />
          </mesh>
          {/* Cabinet body */}
          <mesh position={[0, 1.55, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 2.5, h]} />
            <meshStandardMaterial color="#e8e2d6" roughness={0.6} />
          </mesh>
          {/* Wood door fronts */}
          {Array.from({ length: doorCount }).map((_, i) => {
            const x = -w / 2 + 0.1 + doorW / 2 + i * doorW;
            return (
              <group key={`cab-${i}`}>
                <mesh position={[x, 1.55, h / 2 + 0.02]} castShadow>
                  <boxGeometry args={[doorW - 0.04, 2.3, 0.05]} />
                  <meshStandardMaterial color="#5a3d24" map={wood} normalMap={sharedWoodNormal()} roughness={0.5} />
                </mesh>
                {/* Pull */}
                <mesh position={[x, 2.55, h / 2 + 0.07]}>
                  <boxGeometry args={[doorW * 0.4, 0.04, 0.04]} />
                  <meshStandardMaterial color="#cfcfcf" metalness={0.9} roughness={0.18} />
                </mesh>
              </group>
            );
          })}
          {/* Marble countertop */}
          <mesh position={[0, 2.95, 0]} castShadow receiveShadow>
            <boxGeometry args={[w + 0.1, 0.18, h + 0.1]} />
            <meshStandardMaterial color="#f1ede5" map={marble} roughness={0.18} metalness={0.05} envMapIntensity={1.4} />
          </mesh>
          {/* Backsplash (only for wall counters, not islands) */}
          {type === 'counter' && (
            <mesh position={[0, 4.2, -h / 2 + 0.05]} receiveShadow>
              <boxGeometry args={[w, 2.4, 0.08]} />
              <meshStandardMaterial color="#eef0ef" roughness={0.25} metalness={0.05} envMapIntensity={1.0} />
            </mesh>
          )}
        </group>
      );
    }

    case 'coffee_table': {
      const wood = sharedWood();
      return (
        <group>
          {/* Wood lower shelf */}
          <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
            <boxGeometry args={[w * 0.85, 0.1, h * 0.85]} />
            <meshStandardMaterial color="#5a3d24" map={wood} normalMap={sharedWoodNormal()} roughness={0.5} />
          </mesh>
          {/* Glass top with crisp transmission */}
          <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 0.08, h]} />
            <meshPhysicalMaterial color="#dde8ee" roughness={0.04} metalness={0.1} transparent opacity={0.18} transmission={0.85} ior={1.5} thickness={0.1} reflectivity={1.0} envMapIntensity={6} />
          </mesh>
          {/* Wooden legs at corners */}
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
            <mesh key={i} position={[sx * (w / 2 - 0.15), 0.65, sz * (h / 2 - 0.15)]} castShadow>
              <boxGeometry args={[0.12, 1.3, 0.12]} />
              <meshStandardMaterial color="#3a2818" map={wood} roughness={0.5} />
            </mesh>
          ))}
          {/* Decorative books on shelf */}
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[w * 0.4, 0.18, h * 0.3]} />
            <meshStandardMaterial color="#7a6a52" roughness={0.85} />
          </mesh>
        </group>
      );
    }

    case 'plant':
    case 'tall_plant':
    case 'flower_pot': {
      const isFlower = type === 'flower_pot' || type === 'plant';
      const isTall = type === 'tall_plant';
      
      const seed = (parseInt(item.id?.replace(/\D/g, '') || '1')) * 997;
      const pseudoRandom = (s: number) => {
        const x = Math.sin(s) * 10000;
        return x - Math.floor(x);
      };

      const variant = Math.floor(pseudoRandom(seed) * 5);
      const potColor = ["#d4cdbf", "#8b4513", "#2a2a2a", "#5a5a5a", "#3d3d3d"][variant];
      const leafColor = ["#3d6b3a", "#4a7a44", "#2f5f2f", "#5b8c5a", "#385e38"][variant];

      return (
        <group>
          {/* Detailed Planter/Pot */}
          <group position={[0, isFlower ? 0.35 : 0.9, 0]}>
            <mesh castShadow receiveShadow>
              {isFlower ? (
                <cylinderGeometry args={[0.55, 0.4, 0.7, 24]} />
              ) : isTall ? (
                <cylinderGeometry args={[0.75, 0.6, 2.2, 24]} />
              ) : (
                <cylinderGeometry args={[0.7, 0.55, 1.8, 24]} />
              )}
              <meshStandardMaterial color={potColor} roughness={0.4} metalness={0.1} />
            </mesh>
            {/* Decorative Rim */}
            <mesh position={[0, isFlower ? 0.36 : isTall ? 1.11 : 0.91, 0]} castShadow>
               <cylinderGeometry args={[isFlower ? 0.62 : isTall ? 0.82 : 0.78, isFlower ? 0.58 : isTall ? 0.78 : 0.74, 0.12, 24]} />
               <meshStandardMaterial color={potColor} roughness={0.3} metalness={0.2} />
            </mesh>
          </group>

          {/* Soil with slight mound */}
          <mesh position={[0, isFlower ? 0.66 : isTall ? 1.96 : 1.79, 0]}>
            <cylinderGeometry args={[isFlower ? 0.5 : 0.65, isFlower ? 0.5 : 0.65, 0.08, 16]} />
            <meshStandardMaterial color="#2a1a12" roughness={1} />
          </mesh>

          {/* Foliage / Flowers */}
          {isFlower ? (
            <group position={[0, 0.7, 0]}>
              {variant === 0 ? (
                /* Enhanced Lavender */
                <group>
                  {Array.from({ length: 9 }).map((_, i) => {
                    const ang = i * (Math.PI * 2 / 9);
                    const r = 0.12 + pseudoRandom(seed + i) * 0.15;
                    const h = 1.0 + pseudoRandom(seed + i) * 0.4;
                    return (
                      <group key={i} rotation={[0.15, ang, 0]} position={[Math.cos(ang) * r, 0, Math.sin(ang) * r]}>
                        <mesh position={[0, h/2, 0]}><cylinderGeometry args={[0.015, 0.025, h, 6]} /><meshStandardMaterial color="#2d5a2d" /></mesh>
                        {/* Leaf blades */}
                        {Array.from({ length: 3 }).map((__, li) => (
                          <mesh key={li} position={[0, 0.2 + li * 0.15, 0]} rotation={[0.8, li * 2, 0]}>
                            <boxGeometry args={[0.01, 0.4, 0.08]} />
                            <meshStandardMaterial color="#3d6b3a" />
                          </mesh>
                        ))}
                        <mesh position={[0, h - 0.2, 0]}>
                          <cylinderGeometry args={[0.1, 0.05, 0.6, 8]} />
                          <meshStandardMaterial color="#9966ff" emissive="#6633cc" emissiveIntensity={0.3} />
                        </mesh>
                      </group>
                    );
                  })}
                </group>
              ) : variant === 1 ? (
                /* Detailed Red Roses - Multi-petal geometry */
                <group>
                  <mesh castShadow><sphereGeometry args={[0.5, 16, 14]} /><meshStandardMaterial color="#2d5a2d" roughness={0.9} /></mesh>
                  {Array.from({ length: 7 }).map((_, i) => {
                    const ang = i * (Math.PI * 2 / 7);
                    const r = 0.35 + pseudoRandom(seed + i) * 0.15;
                    const y = 0.25 + pseudoRandom(seed + i) * 0.35;
                    return (
                      <group key={i} position={[Math.cos(ang) * r, y, Math.sin(ang) * r]} rotation={[0, ang, 0]}>
                        {/* 5 Layered petals for Rose look */}
                        {Array.from({ length: 5 }).map((__, pi) => (
                          <mesh key={pi} rotation={[0.4, (pi * Math.PI * 2 / 5), 0]} position={[0, 0, 0]}>
                            <boxGeometry args={[0.18, 0.22, 0.02]} />
                            <meshStandardMaterial color="#ff1133" roughness={0.4} side={THREE.DoubleSide} />
                          </mesh>
                        ))}
                        {/* Tiny yellow center */}
                        <mesh position={[0, 0.05, 0]}><sphereGeometry args={[0.06, 6, 6]} /><meshStandardMaterial color="#ffcc00" /></mesh>
                      </group>
                    );
                  })}
                </group>
              ) : variant === 2 ? (
                /* Field Daisies - Already petal based, but adding more depth */
                <group>
                  {Array.from({ length: 8 }).map((_, i) => {
                    const ang = i * (Math.PI * 2 / 8);
                    const r = 0.18 + pseudoRandom(seed + i) * 0.25;
                    const h = 0.4 + pseudoRandom(seed + i) * 0.5;
                    return (
                      <group key={i} position={[Math.cos(ang) * r, 0, Math.sin(ang) * r]}>
                        <mesh position={[0, h/2, 0]}><cylinderGeometry args={[0.015, 0.02, h, 6]} /><meshStandardMaterial color="#3d6b3a" /></mesh>
                        <group position={[0, h, 0]} rotation={[0.2, ang, 0]}>
                          <mesh><sphereGeometry args={[0.1, 8, 8]} /><meshStandardMaterial color="#443300" /></mesh>
                          {Array.from({ length: 12 }).map((__, pi) => (
                            <mesh key={pi} rotation={[0, pi * Math.PI / 6, 0]} position={[0.2, 0, 0]}>
                              <boxGeometry args={[0.24, 0.01, 0.06]} />
                              <meshStandardMaterial color="#ffffff" roughness={0.3} />
                            </mesh>
                          ))}
                        </group>
                      </group>
                    );
                  })}
                </group>
              ) : variant === 3 ? (
                /* Lush Cherry Blossoms - Small planes for petals */
                <group>
                   <mesh castShadow><sphereGeometry args={[0.55, 20, 16]} /><meshStandardMaterial color="#386330" roughness={0.9} /></mesh>
                   {Array.from({ length: 15 }).map((_, i) => {
                    const ang = Math.random() * Math.PI * 2;
                    const phi = Math.acos(2 * Math.random() - 1);
                    const r = 0.55;
                    const px = r * Math.sin(phi) * Math.cos(ang);
                    const py = r * Math.sin(phi) * Math.sin(ang);
                    const pz = r * Math.cos(phi);
                    return (
                      <group key={i} position={[px, py, pz]} rotation={[phi, ang, 0]}>
                         {/* 4 Petals per blossom */}
                         {Array.from({ length: 4 }).map((__, pi) => (
                           <mesh key={pi} rotation={[0, pi * Math.PI / 2, 0.4]}>
                              <boxGeometry args={[0.12, 0.01, 0.1]} />
                              <meshStandardMaterial color="#ff88cc" emissive="#aa4466" emissiveIntensity={0.2} />
                           </mesh>
                         ))}
                      </group>
                    );
                  })}
                </group>
              ) : (
                /* Trumpet Lilies */
                <group>
                  {Array.from({ length: 5 }).map((_, i) => {
                    const ang = i * (Math.PI * 2 / 5);
                    const h = 0.7 + pseudoRandom(seed + i) * 0.4;
                    return (
                      <group key={i} position={[Math.cos(ang) * 0.25, 0, Math.sin(ang) * 0.25]}>
                         <mesh position={[0, h/2, 0]}><cylinderGeometry args={[0.02, 0.035, h, 6]} /><meshStandardMaterial color="#2d5a2d" /></mesh>
                         <group position={[0, h, 0]} rotation={[0.5, ang, 0]}>
                            <mesh rotation={[Math.PI, 0, 0]}>
                               <coneGeometry args={[0.25, 0.4, 12, 1, true]} />
                               <meshStandardMaterial color="#fffef0" side={THREE.DoubleSide} roughness={0.3} />
                            </mesh>
                            <mesh position={[0, 0.1, 0]}>
                               <cylinderGeometry args={[0.01, 0.01, 0.3, 6]} />
                               <meshStandardMaterial color="#ffcc00" emissive="#aa8800" emissiveIntensity={0.5} />
                            </mesh>
                         </group>
                      </group>
                    );
                  })}
                </group>
              )}
            </group>
          ) : isTall ? (
            <group position={[0, 2.2, 0]}>
              {Array.from({ length: 3 }).map((_, i) => (
                <mesh key={i} position={[0, i * 1.2, 0]} castShadow>
                  <coneGeometry args={[1.6 - i * 0.4, 2.8, 16]} />
                  <meshStandardMaterial color={leafColor} roughness={0.9} />
                </mesh>
              ))}
            </group>
          ) : (
            <group position={[0, 2.6, 0]}>
              <mesh castShadow><sphereGeometry args={[1.3, 16, 14]} /><meshStandardMaterial color={leafColor} roughness={0.9} /></mesh>
              <mesh position={[0.5, 0.9, 0.2]} castShadow><sphereGeometry args={[0.95, 14, 12]} /><meshStandardMaterial color={leafColor} roughness={0.9} /></mesh>
              <mesh position={[-0.4, 1.2, -0.2]} castShadow><sphereGeometry args={[0.75, 12, 10]} /><meshStandardMaterial color={leafColor} roughness={0.9} /></mesh>
            </group>
          )}
        </group>
      );
    }

    case 'nightstand': {
      const wood = sharedWood();
      return (
        <group>
          <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 2.4, h]} />
            <meshStandardMaterial color="#5a3d24" map={wood} normalMap={sharedWoodNormal()} roughness={0.5} />
          </mesh>
          {/* Drawer */}
          <mesh position={[0, 1.6, h / 2 + 0.02]}>
            <boxGeometry args={[w - 0.1, 0.7, 0.04]} />
            <meshStandardMaterial color="#3a2818" map={wood} roughness={0.5} />
          </mesh>
          {/* Pull */}
          <mesh position={[0, 1.6, h / 2 + 0.07]}>
            <cylinderGeometry args={[0.05, 0.05, 0.04, 12]} />
            <meshStandardMaterial color="#cfcfcf" metalness={0.9} roughness={0.18} />
          </mesh>
          {/* Lamp */}
          <mesh position={[0, 2.65, 0]}>
            <cylinderGeometry args={[0.15, 0.25, 0.1, 16]} />
            <meshStandardMaterial color="#cfcfcf" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 3.1, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.8, 12]} />
            <meshStandardMaterial color="#cfcfcf" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[0, 3.7, 0]}>
            <cylinderGeometry args={[0.4, 0.32, 0.5, 18]} />
            <meshStandardMaterial color="#fff8ec" roughness={0.9} emissive="#ffd9a0" emissiveIntensity={isNight ? 0.8 : 0.1} />
          </mesh>
        </group>
      );
    }

    case 'desk':
    case 'bookshelf':
    case 'washing_machine':
      return (
        <mesh position={[0, h > w ? 3.5 : 1.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, h > w ? 7 : 3, h]} />
          <meshStandardMaterial color={type === 'washing_machine' ? '#dadada' : '#5a3d24'} map={type === 'washing_machine' ? undefined : sharedWood()} roughness={type === 'washing_machine' ? 0.3 : 0.5} metalness={type === 'washing_machine' ? 0.6 : 0.05} />
        </mesh>
      );

    case 'rug':
      return (
        <mesh position={[0, 0.05, 0]} receiveShadow>
          <boxGeometry args={[w, 0.05, h]} />
          <meshStandardMaterial color="#c8b89a" map={sharedBeigeFabric()} normalMap={sharedLinenNormal()} normalScale={new THREE.Vector2(0.4, 0.4)} roughness={0.95} />
        </mesh>
      );

    case 'generator':
      return (
        <group>
          {/* Base */}
          <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 0.8, h]} />
            <meshStandardMaterial color="#4b5563" roughness={0.7} metalness={0.4} />
          </mesh>
          {/* Main body */}
          <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
            <boxGeometry args={[w * 0.9, 2.0, h * 0.9]} />
            <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.5} />
          </mesh>
          {/* Top cover/vent */}
          <mesh position={[0, 2.85, 0]} castShadow>
            <boxGeometry args={[w * 0.8, 0.1, h * 0.8]} />
            <meshStandardMaterial color="#1f2937" roughness={0.8} />
          </mesh>
          {/* Side panel vents */}
          {[-1, 1].map(side => (
            <mesh key={`vent-${side}`} position={[side * (w * 0.45 + 0.02), 1.8, 0]} castShadow>
              <boxGeometry args={[0.04, 1.2, h * 0.6]} />
              <meshStandardMaterial color="#111827" roughness={0.9} />
            </mesh>
          ))}
          {/* Control panel */}
          <mesh position={[0, 2.2, h * 0.45 + 0.02]} castShadow>
            <boxGeometry args={[w * 0.5, 0.4, 0.04]} />
            <meshStandardMaterial color="#1f2937" roughness={0.7} />
          </mesh>
          {/* Indicator lights */}
          <mesh position={[-w * 0.15, 2.2, h * 0.45 + 0.04]} rotation={[Math.PI / 2, 0, 0]}>
             <cylinderGeometry args={[0.04, 0.04, 0.02, 12]} />
             <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} />
          </mesh>
          <mesh position={[-w * 0.05, 2.2, h * 0.45 + 0.04]} rotation={[Math.PI / 2, 0, 0]}>
             <cylinderGeometry args={[0.04, 0.04, 0.02, 12]} />
             <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.8} />
          </mesh>
        </group>
      );

    default:
      return (
        <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, 3, h]} />
          <meshStandardMaterial color="#aaa" roughness={0.8} />
        </mesh>
      );
  }
};
