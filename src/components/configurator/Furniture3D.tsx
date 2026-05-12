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
      const isFlower = type === 'flower_pot';
      const isTall = type === 'tall_plant';
      
      // Use item.id to derive stable but unique variations
      const seed = (parseInt(item.id?.replace(/\D/g, '') || '1')) * 997;
      const pseudoRandom = (s: number) => {
        const x = Math.sin(s) * 10000;
        return x - Math.floor(x);
      };

      const variant = Math.floor(pseudoRandom(seed) * 4);
      const potColor = ["#d4cdbf", "#8b4513", "#2a2a2a", "#5a5a5a"][variant];
      const flowerColor = ["#ff5555", "#ffaa55", "#ffcc00", "#ff66cc", "#9966ff"][variant % 5];
      const leafColor = ["#3d6b3a", "#4a7a44", "#2f5f2f", "#5b8c5a"][variant];

      return (
        <group>
          {/* Planter/Pot */}
          <mesh position={[0, isFlower ? 0.35 : 0.9, 0]} castShadow receiveShadow>
            {isFlower ? (
              <cylinderGeometry args={[0.5, 0.35, 0.7, 12]} />
            ) : isTall ? (
              <cylinderGeometry args={[0.7, 0.55, 2.2, 18]} />
            ) : (
              <cylinderGeometry args={[0.65, 0.5, 1.8, 18]} />
            )}
            <meshStandardMaterial color={potColor} roughness={0.6} metalness={0.1} />
          </mesh>
          {/* Soil */}
          <mesh position={[0, isFlower ? 0.65 : isTall ? 1.95 : 1.78, 0]}>
            <cylinderGeometry args={[isFlower ? 0.45 : 0.6, isFlower ? 0.45 : 0.6, 0.08, 12]} />
            <meshStandardMaterial color="#3a2418" roughness={0.95} />
          </mesh>

          {/* Foliage / Flowers */}
          {isFlower ? (
            <group position={[0, 0.8, 0]}>
              {/* Main green bush */}
              <mesh castShadow>
                <sphereGeometry args={[0.45, 12, 10]} />
                <meshStandardMaterial color="#3d6b3a" roughness={0.9} />
              </mesh>
              {/* Clustered Blossoms */}
              {Array.from({ length: 6 }).map((_, i) => {
                const ang = i * (Math.PI * 2 / 6);
                const r = 0.3 + pseudoRandom(seed + i) * 0.2;
                return (
                  <mesh key={i} position={[Math.cos(ang) * r, 0.2 + pseudoRandom(seed + i) * 0.3, Math.sin(ang) * r]} castShadow>
                    <sphereGeometry args={[0.15, 8, 8]} />
                    <meshStandardMaterial color={["#ff5555", "#ffaa55", "#ffcc00", "#ff66cc", "#9966ff"][(variant + i) % 5]} />
                  </mesh>
                );
              })}
            </group>
          ) : isTall ? (
            <group position={[0, 2.2, 0]}>
              {/* Conical Cypress-style */}
              {Array.from({ length: 3 }).map((_, i) => (
                <mesh key={i} position={[0, i * 1.2, 0]} castShadow>
                  <coneGeometry args={[1.5 - i * 0.4, 2.5, 12]} />
                  <meshStandardMaterial color={leafColor} roughness={0.9} />
                </mesh>
              ))}
              {/* Random colored "berries" or accents */}
              {variant > 2 && Array.from({ length: 8 }).map((_, i) => (
                <mesh key={`b-${i}`} position={[Math.cos(i) * 0.8, 2.5 + i * 0.2, Math.sin(i) * 0.8]} castShadow>
                  <sphereGeometry args={[0.1, 6, 6]} />
                  <meshStandardMaterial color="#ff3333" emissive="#aa0000" emissiveIntensity={0.2} />
                </mesh>
              ))}
            </group>
          ) : variant === 0 ? (
            /* Broad-leaf Tropical style */
            <group position={[0, 2.2, 0]}>
              {Array.from({ length: 5 }).map((_, i) => (
                <mesh key={i} position={[0, 0, 0]} rotation={[0.4, i * (Math.PI * 2 / 5), 0]} castShadow>
                  <boxGeometry args={[0.1, 3.5, 1.2]} />
                  <meshStandardMaterial color="#2d5a2d" roughness={0.8} />
                </mesh>
              ))}
            </group>
          ) : variant === 1 ? (
            /* Fern / Wispy style */
            <group position={[0, 1.8, 0]}>
              {Array.from({ length: 12 }).map((_, i) => (
                <mesh key={i} position={[0, 0.5, 0]} rotation={[1.1, i * (Math.PI * 2 / 12), 0.2]} castShadow>
                  <cylinderGeometry args={[0.02, 0.05, 3.5, 6]} />
                  <meshStandardMaterial color="#4a7a44" roughness={0.9} />
                </mesh>
              ))}
            </group>
          ) : (
            /* Classic Rounded/Tiered Bush */
            <group position={[0, 2.6, 0]}>
              <mesh castShadow><sphereGeometry args={[1.2, 14, 12]} /><meshStandardMaterial color={leafColor} roughness={0.92} /></mesh>
              <mesh position={[0.4, 0.8, 0.2]} castShadow><sphereGeometry args={[0.9, 12, 10]} /><meshStandardMaterial color={leafColor} roughness={0.92} /></mesh>
              <mesh position={[-0.3, 1.1, -0.1]} castShadow><sphereGeometry args={[0.7, 10, 8]} /><meshStandardMaterial color={leafColor} roughness={0.92} /></mesh>
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

    default:
      return (
        <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, 3, h]} />
          <meshStandardMaterial color="#aaa" roughness={0.8} />
        </mesh>
      );
  }
};
