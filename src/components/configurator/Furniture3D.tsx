import React, { useMemo } from 'react';
import * as THREE from 'three';
import { FurnitureItem } from '@/lib/floorplan';
import {
  createDoorWoodTexture, createDoorWoodNormal,
  createFabricTexture, createFabricNormal,
  createMarbleTexture, createTileTexture, createTileNormal,
} from './materials';

interface Props {
  item: FurnitureItem;
  isNight?: boolean;
}

/* ── Shared procedural texture cache ── */
let _woodMap: THREE.Texture | null = null;
let _woodNormal: THREE.Texture | null = null;
let _marbleMap: THREE.Texture | null = null;
let _tileMap: THREE.Texture | null = null;
let _tileNormal: THREE.Texture | null = null;
let _linenMap: THREE.Texture | null = null;
let _linenNormal: THREE.Texture | null = null;
let _greyFabricMap: THREE.Texture | null = null;
let _navyFabricMap: THREE.Texture | null = null;
let _beigeFabricMap: THREE.Texture | null = null;
let _warmFabricMap: THREE.Texture | null = null;

const sharedWood = () => { if (!_woodMap) _woodMap = createDoorWoodTexture(1, 1); return _woodMap; };
const sharedWoodNormal = () => { if (!_woodNormal) _woodNormal = createDoorWoodNormal(1, 1); return _woodNormal; };
const sharedMarble = () => { if (!_marbleMap) _marbleMap = createMarbleTexture(1, 1); return _marbleMap; };
const sharedTile = () => { if (!_tileMap) _tileMap = createTileTexture(1, 1); return _tileMap; };
const sharedTileNormal = () => { if (!_tileNormal) _tileNormal = createTileNormal(1, 1); return _tileNormal; };
const sharedLinen = () => { if (!_linenMap) _linenMap = createFabricTexture([240, 236, 226], 2, 2); return _linenMap; };
const sharedLinenNormal = () => { if (!_linenNormal) _linenNormal = createFabricNormal(2, 2); return _linenNormal; };
const sharedGreyFabric = () => { if (!_greyFabricMap) _greyFabricMap = createFabricTexture([120, 122, 128], 2, 2); return _greyFabricMap; };
const sharedNavyFabric = () => { if (!_navyFabricMap) _navyFabricMap = createFabricTexture([55, 72, 98], 2, 2); return _navyFabricMap; };
const sharedBeigeFabric = () => { if (!_beigeFabricMap) _beigeFabricMap = createFabricTexture([195, 175, 145], 2, 2); return _beigeFabricMap; };
const sharedWarmFabric = () => { if (!_warmFabricMap) _warmFabricMap = createFabricTexture([180, 140, 110], 2, 2); return _warmFabricMap; };

/* ── Shared material configs ── */
const CHROME = { color: '#e0e0e0', metalness: 0.95, roughness: 0.08, envMapIntensity: 2.5 };
const BRASS = { color: '#c8a840', metalness: 0.92, roughness: 0.12, envMapIntensity: 2.0 };
const MATTE_BLACK = { color: '#0d0d0d', metalness: 0.7, roughness: 0.35, envMapIntensity: 1.5 };

export const Furniture3D = ({ item, isNight }: Props) => {
  const { type, w, h } = item;

  switch (type) {
    // ══════════════════════════════════════════════════════════
    case 'bed': {
      const wood = sharedWood();
      const woodN = sharedWoodNormal();
      const linen = sharedLinen();
      const linenN = sharedLinenNormal();
      const blanket = sharedNavyFabric();
      const beigeF = sharedBeigeFabric();
      return (
        <group>
          {/* Bed platform base — solid walnut with chamfered look */}
          <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 0.9, h]} />
            <meshStandardMaterial color="#5c3c20" map={wood} normalMap={woodN}
              normalScale={new THREE.Vector2(0.5, 0.5)} roughness={0.45} metalness={0.02}
              envMapIntensity={0.6} />
          </mesh>
          {/* Leg cutouts illusion — dark strips at corners */}
          {[[-w/2+0.5, -h/2+0.5], [w/2-0.5, -h/2+0.5], [-w/2+0.5, h/2-0.5], [w/2-0.5, h/2-0.5]].map(([px, pz], i) => (
            <mesh key={`leg-${i}`} position={[px, 0.18, pz]} castShadow>
              <boxGeometry args={[0.35, 0.36, 0.35]} />
              <meshStandardMaterial color="#3a2410" roughness={0.6} />
            </mesh>
          ))}

          {/* Tufted upholstered headboard */}
          <mesh position={[0, 2.8, -h/2 + 0.12]} castShadow receiveShadow>
            <boxGeometry args={[w + 0.15, 4.6, 0.38]} />
            <meshStandardMaterial color="#9a8870" map={beigeF} normalMap={linenN}
              normalScale={new THREE.Vector2(0.7, 0.7)} roughness={0.92} />
          </mesh>
          {/* Tuft buttons grid */}
          {[-w/3, 0, w/3].flatMap((bx, bi) =>
            [1.8, 2.8, 3.8].map((by, bj) => (
              <mesh key={`tuft-${bi}-${bj}`} position={[bx, by, -h/2 + 0.33]}>
                <sphereGeometry args={[0.07, 8, 8]} />
                <meshStandardMaterial color="#6a5840" roughness={0.8} />
              </mesh>
            ))
          )}
          {/* Headboard solid wood top rail */}
          <mesh position={[0, 5.05, -h/2 + 0.12]} castShadow>
            <boxGeometry args={[w + 0.25, 0.22, 0.48]} />
            <meshStandardMaterial color="#3e2810" map={wood} roughness={0.38} envMapIntensity={0.7} />
          </mesh>

          {/* Mattress — thick with realistic edge radius profile */}
          <mesh position={[0, 1.62, 0.08]} castShadow receiveShadow>
            <boxGeometry args={[w - 0.15, 0.98, h - 0.15]} />
            <meshStandardMaterial color="#f4f1e8" map={linen} normalMap={linenN}
              normalScale={new THREE.Vector2(0.35, 0.35)} roughness={0.96} />
          </mesh>
          {/* Mattress piping (edge welt) */}
          <mesh position={[0, 2.11, 0.08]}>
            <boxGeometry args={[w - 0.12, 0.06, h - 0.12]} />
            <meshStandardMaterial color="#e8e4da" roughness={0.9} />
          </mesh>

          {/* Sheet — crisp hotel white */}
          <mesh position={[0, 2.17, 0.08]} receiveShadow>
            <boxGeometry args={[w - 0.08, 0.05, h - 0.08]} />
            <meshStandardMaterial color="#fafaf6" roughness={0.94} />
          </mesh>

          {/* King pillows — 4 total, stacked pairs */}
          {[-1, 1].map(side => (
            <group key={`pillow-side-${side}`}>
              {/* Back pillow */}
              <mesh position={[side * w/4.2, 2.36, -h/2 + 1.15]} castShadow>
                <boxGeometry args={[w * 0.34, 0.52, 1.05]} />
                <meshStandardMaterial color="#fdfaf0" map={linen} normalMap={linenN} roughness={0.94} />
              </mesh>
              {/* Front accent pillow */}
              <mesh position={[side * w/4.2, 2.55, -h/2 + 0.85]} castShadow>
                <boxGeometry args={[w * 0.28, 0.38, 0.82]} />
                <meshStandardMaterial color="#e8ddc8" map={beigeF} roughness={0.92} />
              </mesh>
            </group>
          ))}

          {/* Folded duvet at foot with fold crease detail */}
          <mesh position={[0, 2.24, h/4.5]} castShadow receiveShadow>
            <boxGeometry args={[w - 0.04, 0.32, h / 2.2]} />
            <meshStandardMaterial color="#2e3e58" map={blanket} normalMap={linenN} roughness={0.94} />
          </mesh>
          {/* Duvet fold crease */}
          <mesh position={[0, 2.41, h/4.5 - h/4.4 + 0.1]}>
            <boxGeometry args={[w - 0.06, 0.06, 0.06]} />
            <meshStandardMaterial color="#22304a" roughness={0.96} />
          </mesh>
        </group>
      );
    }

    // ══════════════════════════════════════════════════════════
    case 'sofa': {
      const fabric = sharedGreyFabric();
      const fabricN = sharedLinenNormal();
      const accent = sharedBeigeFabric();
      const navyF = sharedNavyFabric();
      const wood = sharedWood();

      return (
        <group>
          {/* Hardwood plinth base */}
          <mesh position={[0, 0.12, 0]} castShadow>
            <boxGeometry args={[w - 0.14, 0.24, h - 0.14]} />
            <meshStandardMaterial color="#1e160e" roughness={0.75} />
          </mesh>
          {/* Tapered solid wood legs — 4 corners */}
          {[[-w/2+0.45, -h/2+0.45], [w/2-0.45, -h/2+0.45], [-w/2+0.45, h/2-0.45], [w/2-0.45, h/2-0.45]].map(([lx, lz], i) => (
            <mesh key={`leg-${i}`} position={[lx, 0.18, lz]} castShadow>
              <cylinderGeometry args={[0.07, 0.12, 0.36, 8]} />
              <meshStandardMaterial color="#2a1c0e" map={wood} roughness={0.42} envMapIntensity={0.5} />
            </mesh>
          ))}

          {/* Main body — upholstered seat box */}
          <mesh position={[0, 0.88, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 1.14, h]} />
            <meshStandardMaterial color="#6e7580" map={fabric} normalMap={fabricN}
              normalScale={new THREE.Vector2(0.55, 0.55)} roughness={0.96} />
          </mesh>
          {/* Backrest with angle-back tilt illusion */}
          <mesh position={[0, 2.12, -h/2 + 0.52]} castShadow receiveShadow>
            <boxGeometry args={[w, 1.98, 0.92]} />
            <meshStandardMaterial color="#6e7580" map={fabric} normalMap={fabricN} roughness={0.96} />
          </mesh>
          {/* Armrests — padded rounded shape */}
          {[-1, 1].map(side => (
            <group key={`arm-${side}`}>
              <mesh position={[side * (w/2 - 0.42), 1.62, 0.1]} castShadow receiveShadow>
                <boxGeometry args={[0.84, 1.72, h - 0.28]} />
                <meshStandardMaterial color="#6e7580" map={fabric} normalMap={fabricN} roughness={0.96} />
              </mesh>
              {/* Armrest top cap — slightly lighter */}
              <mesh position={[side * (w/2 - 0.42), 2.5, 0.1]} castShadow>
                <boxGeometry args={[0.86, 0.16, h - 0.24]} />
                <meshStandardMaterial color="#82888e" roughness={0.9} />
              </mesh>
            </group>
          ))}

          {/* Individual seat cushions */}
          {(() => {
            const count = Math.max(2, Math.round(w / 2.5));
            const cw = (w - 1.72) / count;
            return Array.from({ length: count }).map((_, i) => {
              const cx = -w/2 + 0.86 + cw/2 + i * cw;
              return (
                <group key={`seat-${i}`}>
                  <mesh position={[cx, 1.6, 0.22]} castShadow receiveShadow>
                    <boxGeometry args={[cw - 0.08, 0.58, h - 1.36]} />
                    <meshStandardMaterial color="#7a8090" map={fabric} normalMap={fabricN} roughness={0.94} />
                  </mesh>
                  {/* Cushion seam */}
                  <mesh position={[cx, 1.9, 0.22]}>
                    <boxGeometry args={[cw - 0.09, 0.04, h - 1.37]} />
                    <meshStandardMaterial color="#5e6468" roughness={0.98} />
                  </mesh>
                </group>
              );
            });
          })()}

          {/* Back cushions */}
          {(() => {
            const count = Math.max(2, Math.round(w / 2.5));
            const cw = (w - 1.72) / count;
            return Array.from({ length: count }).map((_, i) => {
              const cx = -w/2 + 0.86 + cw/2 + i * cw;
              return (
                <mesh key={`back-cush-${i}`} position={[cx, 2.22, -h/2 + 0.6]} castShadow receiveShadow>
                  <boxGeometry args={[cw - 0.1, 1.6, 0.85]} />
                  <meshStandardMaterial color="#78808a" map={fabric} normalMap={fabricN} roughness={0.94} />
                </mesh>
              );
            });
          })()}

          {/* Throw pillows */}
          {[-w/3, w/3].map((px, i) => (
            <mesh key={`pil-${i}`} position={[px, 2.32, -h/4.5]}
              rotation={[0, 0, i ? 0.12 : -0.12]} castShadow>
              <boxGeometry args={[1.05, 1.05, 0.34]} />
              <meshStandardMaterial
                color={i ? '#c0a882' : '#2a3a52'}
                map={i ? accent : navyF}
                normalMap={fabricN}
                roughness={0.95}
              />
            </mesh>
          ))}
        </group>
      );
    }

    // ══════════════════════════════════════════════════════════
    case 'dining_table': {
      const wood = sharedWood();
      const woodN = sharedWoodNormal();
      const beigeF = sharedBeigeFabric();
      const fabricN = sharedLinenNormal();
      const marble = sharedMarble();
      const numChairs = Math.max(2, Math.floor((w - 0.8) / 2));

      const Chair = ({ posX, posZ, rotY }: { posX: number; posZ: number; rotY: number }) => (
        <group position={[posX, 0, posZ]} rotation={[0, rotY, 0]}>
          {/* Seat with cushion */}
          <mesh position={[0, 1.42, 0]} castShadow>
            <boxGeometry args={[1.18, 0.1, 1.14]} />
            <meshStandardMaterial color="#4a3018" map={wood} normalMap={woodN} roughness={0.44} />
          </mesh>
          <mesh position={[0, 1.52, 0]} castShadow>
            <boxGeometry args={[1.0, 0.2, 0.96]} />
            <meshStandardMaterial color="#c0aa80" map={beigeF} normalMap={fabricN} roughness={0.94} />
          </mesh>
          {/* Backrest — vertical slats */}
          <mesh position={[0, 2.6, -0.54]} castShadow>
            <boxGeometry args={[1.18, 0.12, 0.12]} />
            <meshStandardMaterial color="#4a3018" map={wood} roughness={0.44} />
          </mesh>
          {[-0.42, 0, 0.42].map((sx, si) => (
            <mesh key={`slat-${si}`} position={[sx, 2.1, -0.54]} castShadow>
              <boxGeometry args={[0.06, 1.1, 0.06]} />
              <meshStandardMaterial color="#4a3018" map={wood} roughness={0.45} />
            </mesh>
          ))}
          <mesh position={[0, 3.15, -0.54]} castShadow>
            <boxGeometry args={[1.18, 0.12, 0.12]} />
            <meshStandardMaterial color="#4a3018" map={wood} roughness={0.44} />
          </mesh>
          {/* Legs — tapered */}
          {[[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].map(([sx, sz], li) => (
            <mesh key={`l-${li}`} position={[sx, 0.68, sz]} castShadow>
              <cylinderGeometry args={[0.04, 0.07, 1.36, 8]} />
              <meshStandardMaterial color="#3a2412" roughness={0.5} />
            </mesh>
          ))}
        </group>
      );

      return (
        <group>
          {/* Table top — marble or solid wood */}
          <mesh position={[0, 2.62, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 0.18, h]} />
            <meshStandardMaterial color="#ede9e0" map={marble} roughness={0.12}
              metalness={0.04} envMapIntensity={1.8} />
          </mesh>
          {/* Apron — solid wood */}
          <mesh position={[0, 2.46, 0]} castShadow>
            <boxGeometry args={[w - 0.5, 0.14, h - 0.5]} />
            <meshStandardMaterial color="#4a3018" map={wood} normalMap={woodN} roughness={0.42} />
          </mesh>
          {/* Pedestal base legs — thick tapered */}
          {[[-w/2 + 0.55, -h/2 + 0.55], [w/2 - 0.55, -h/2 + 0.55],
            [-w/2 + 0.55, h/2 - 0.55], [w/2 - 0.55, h/2 - 0.55]].map((pos, i) => (
            <mesh key={i} position={[pos[0], 1.28, pos[1]]} castShadow>
              <boxGeometry args={[0.24, 2.56, 0.24]} />
              <meshStandardMaterial color="#3a2412" map={wood} roughness={0.46} />
            </mesh>
          ))}
          {/* Foot rails */}
          <mesh position={[0, 0.55, 0]} castShadow>
            <boxGeometry args={[w - 1.2, 0.1, 0.1]} />
            <meshStandardMaterial color="#3a2412" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.55, 0]} castShadow>
            <boxGeometry args={[0.1, 0.1, h - 1.2]} />
            <meshStandardMaterial color="#3a2412" roughness={0.5} />
          </mesh>

          {/* Centerpiece — candle + greenery */}
          <mesh position={[0, 2.80, 0]}>
            <cylinderGeometry args={[0.14, 0.18, 0.5, 16]} />
            <meshStandardMaterial color="#9a8070" roughness={0.35} metalness={0.5} envMapIntensity={1.2} />
          </mesh>
          <mesh position={[0, 3.08, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.58, 12]} />
            <meshStandardMaterial color="#f8f0e0" roughness={0.6} />
          </mesh>
          {isNight && (
            <pointLight position={[0, 3.5, 0]} intensity={4} distance={6} color="#ffd090" decay={2} />
          )}

          {/* Chairs */}
          {Array.from({ length: numChairs }).map((_, i) => {
            const px = -w/2 + (w / (numChairs + 1)) * (i + 1);
            return (
              <React.Fragment key={`chair-pair-${i}`}>
                <Chair posX={px} posZ={-h/2 - 0.82} rotY={0} />
                <Chair posX={px} posZ={h/2 + 0.82} rotY={Math.PI} />
              </React.Fragment>
            );
          })}
        </group>
      );
    }

    // ══════════════════════════════════════════════════════════
    case 'tv': {
      const wood = sharedWood();
      return (
        <group>
          {/* Floating media console */}
          <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 1.3, h]} />
            <meshStandardMaterial color="#2a1c10" map={wood} normalMap={sharedWoodNormal()}
              roughness={0.42} envMapIntensity={0.6} />
          </mesh>
          {/* Wall mount bracket */}
          <mesh position={[0, 0.18, -h/2 + 0.1]}>
            <boxGeometry args={[w * 0.6, 0.08, 0.16]} />
            <meshStandardMaterial {...MATTE_BLACK} />
          </mesh>
          {/* Cable channel */}
          <mesh position={[0, 2.2, -h/2 + 0.1]}>
            <boxGeometry args={[0.08, 2.2, 0.08]} />
            <meshStandardMaterial {...MATTE_BLACK} />
          </mesh>
          {/* TV unit — slim bezel */}
          <mesh position={[0, 3.7, -h/2 + 0.14]} castShadow>
            <boxGeometry args={[w * 0.97, 3.4, 0.18]} />
            <meshStandardMaterial color="#050505" roughness={0.25} metalness={0.7}
              envMapIntensity={1.5} />
          </mesh>
          {/* Screen — ultra-thin with emissive */}
          <mesh position={[0, 3.72, -h/2 + 0.25]}>
            <boxGeometry args={[w * 0.93, 3.2, 0.025]} />
            <meshStandardMaterial
              color="#04090e"
              roughness={0.04}
              metalness={0.9}
              emissive={isNight ? '#0e1e38' : '#080c12'}
              emissiveIntensity={isNight ? 0.6 : 0.08}
              envMapIntensity={2}
            />
          </mesh>
          {/* Screen glow on floor/wall at night */}
          {isNight && (
            <pointLight position={[0, 3.7, -h/2 + 1]} intensity={1.5} distance={8}
              color="#2040a0" decay={2} />
          )}
          {/* Soundbar */}
          <mesh position={[0, 1.6, -h/2 + 0.18]} castShadow>
            <boxGeometry args={[w * 0.72, 0.32, 0.2]} />
            <meshStandardMaterial {...MATTE_BLACK} />
          </mesh>
          {/* Speaker grille dots */}
          {Array.from({ length: 12 }).map((_, i) => (
            <mesh key={`dot-${i}`} position={[-w * 0.3 + i * (w * 0.72 / 12), 1.6, -h/2 + 0.29]}>
              <sphereGeometry args={[0.012, 6, 6]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
            </mesh>
          ))}
        </group>
      );
    }

    // ══════════════════════════════════════════════════════════
    case 'wardrobe': {
      const wood = sharedWood();
      return (
        <group>
          {/* Cabinet carcass */}
          <mesh position={[0, 3.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 7, h]} />
            <meshStandardMaterial color="#e2ddd4" roughness={0.62} envMapIntensity={0.3} />
          </mesh>
          {/* Sliding door panels */}
          {[-1, 0, 1].map(i => (
            <mesh key={`dr-${i}`} position={[i * w / 3, 3.5, h/2 + 0.025]} castShadow>
              <boxGeometry args={[w/3 - 0.04, 6.7, 0.07]} />
              <meshStandardMaterial color="#4a3218" map={wood} normalMap={sharedWoodNormal()}
                roughness={0.42} envMapIntensity={0.7} />
            </mesh>
          ))}
          {/* Door track top rail */}
          <mesh position={[0, 7.08, h/2 + 0.025]}>
            <boxGeometry args={[w + 0.06, 0.12, 0.1]} />
            <meshStandardMaterial {...CHROME} />
          </mesh>
          {/* Door track bottom */}
          <mesh position={[0, 0.08, h/2 + 0.025]}>
            <boxGeometry args={[w + 0.06, 0.06, 0.1]} />
            <meshStandardMaterial {...CHROME} />
          </mesh>
          {/* Vertical handles */}
          {[-1, 0, 1].map(i => (
            <group key={`hnd-${i}`} position={[i * w / 3 + w/6 - 0.2, 3.5, h/2 + 0.1]}>
              <mesh>
                <cylinderGeometry args={[0.022, 0.022, 1.4, 10]} />
                <meshStandardMaterial {...CHROME} />
              </mesh>
              {/* Handle end caps */}
              {[-0.7, 0.7].map((y, ci) => (
                <mesh key={ci} position={[0, y, 0]} rotation={[Math.PI/2, 0, 0]}>
                  <cylinderGeometry args={[0.03, 0.022, 0.05, 10]} />
                  <meshStandardMaterial {...CHROME} />
                </mesh>
              ))}
            </group>
          ))}
          {/* Top crown moulding */}
          <mesh position={[0, 7.06, 0]} castShadow>
            <boxGeometry args={[w + 0.08, 0.12, h + 0.08]} />
            <meshStandardMaterial color="#2e1e0c" map={wood} roughness={0.36} envMapIntensity={0.6} />
          </mesh>
          {/* Base plinth */}
          <mesh position={[0, 0.1, 0]} castShadow>
            <boxGeometry args={[w + 0.04, 0.2, h + 0.04]} />
            <meshStandardMaterial color="#1e1208" roughness={0.65} />
          </mesh>
        </group>
      );
    }

    // ══════════════════════════════════════════════════════════
    case 'shower': {
      const tileMap = sharedTile();
      const tileN = sharedTileNormal();
      return (
        <group>
          {/* Tiled floor pan with drain */}
          <mesh position={[0, 0.12, 0]} receiveShadow>
            <boxGeometry args={[w, 0.24, h]} />
            <meshStandardMaterial color="#d8dcda" map={tileMap} normalMap={tileN}
              roughness={0.22} metalness={0.04} envMapIntensity={1.3} />
          </mesh>
          {/* Drain */}
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.04, 20]} />
            <meshStandardMaterial {...CHROME} />
          </mesh>
          {/* Tiled back wall */}
          <mesh position={[0, 4.0, -h/2 + 0.06]} receiveShadow>
            <boxGeometry args={[w, 8, 0.12]} />
            <meshStandardMaterial color="#cdd0d0" map={tileMap} normalMap={tileN}
              roughness={0.28} metalness={0.03} envMapIntensity={0.8} />
          </mesh>
          {/* Side tiled wall */}
          <mesh position={[w/2 - 0.06, 4.0, 0]} receiveShadow>
            <boxGeometry args={[0.12, 8, h]} />
            <meshStandardMaterial color="#cdd0d0" map={tileMap} normalMap={tileN}
              roughness={0.28} metalness={0.03} />
          </mesh>
          {/* Frameless glass panel — physical material */}
          <mesh position={[0, 4.0, h/2 - 0.04]} castShadow>
            <boxGeometry args={[w, 8, 0.07]} />
            <meshPhysicalMaterial color="#d8eef2" roughness={0.0} metalness={0.05}
              transparent opacity={0.14} transmission={0.88} ior={1.52}
              thickness={0.07} reflectivity={1.0} envMapIntensity={10} clearcoat={1} />
          </mesh>
          {/* Glass chrome trim rail top */}
          <mesh position={[0, 8.04, h/2 - 0.04]}>
            <boxGeometry args={[w + 0.06, 0.1, 0.12]} />
            <meshStandardMaterial {...CHROME} />
          </mesh>
          {/* Side glass */}
          <mesh position={[w/2 - 0.06, 4.0, 0]} castShadow>
            <boxGeometry args={[0.07, 8, h]} />
            <meshPhysicalMaterial color="#d8eef2" roughness={0.0} metalness={0.05}
              transparent opacity={0.14} transmission={0.88} ior={1.52}
              thickness={0.07} reflectivity={1.0} envMapIntensity={10} clearcoat={1} />
          </mesh>
          {/* Ceiling-mount rain head */}
          <mesh position={[-w/4, 7.5, -h/4]}>
            <cylinderGeometry args={[0.48, 0.48, 0.1, 28]} />
            <meshStandardMaterial {...CHROME} />
          </mesh>
          {/* Rain head face — perforated */}
          <mesh position={[-w/4, 7.44, -h/4]}>
            <cylinderGeometry args={[0.45, 0.45, 0.02, 28]} />
            <meshStandardMaterial color="#c8c8c8" roughness={0.4} metalness={0.8} />
          </mesh>
          {/* Drop arm */}
          <mesh position={[-w/4, 7.76, -h/4]}>
            <cylinderGeometry args={[0.04, 0.04, 0.52, 10]} />
            <meshStandardMaterial {...CHROME} />
          </mesh>
          {/* Thermostatic mixer bar */}
          <mesh position={[-w/2 + 0.16, 4.5, -h/4]} rotation={[0, 0, Math.PI/2]}>
            <cylinderGeometry args={[0.06, 0.06, 1.1, 12]} />
            <meshStandardMaterial {...CHROME} />
          </mesh>
          {/* Mixer handle */}
          <mesh position={[-w/2 + 0.16, 4.5, -h/4 + 0.12]} rotation={[Math.PI/2, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.24, 10]} />
            <meshStandardMaterial {...CHROME} />
          </mesh>
          {/* Shower niche in back wall */}
          <mesh position={[w/4, 5.5, -h/2 + 0.01]}>
            <boxGeometry args={[0.6, 0.9, 0.16]} />
            <meshStandardMaterial color="#bcc0be" roughness={0.18} envMapIntensity={1} />
          </mesh>
          {/* Niche shelf */}
          <mesh position={[w/4, 5.5, -h/2 + 0.09]}>
            <boxGeometry args={[0.56, 0.04, 0.18]} />
            <meshStandardMaterial {...CHROME} />
          </mesh>
        </group>
      );
    }

    // ══════════════════════════════════════════════════════════
    case 'toilet':
      return (
        <group>
          {/* Base / floor fixing */}
          <mesh position={[0, 0.06, h * 0.05]}>
            <cylinderGeometry args={[w * 0.28, w * 0.28, 0.12, 20]} />
            <meshStandardMaterial color="#f0f0f0" roughness={0.2} envMapIntensity={0.8} />
          </mesh>
          {/* Pedestal bowl — sculpted profile */}
          <mesh position={[0, 0.72, h * 0.05]} castShadow>
            <boxGeometry args={[w * 0.62, 1.24, h * 0.52]} />
            <meshStandardMaterial color="#fafafa" roughness={0.14} envMapIntensity={1.2} />
          </mesh>
          {/* Bowl rim */}
          <mesh position={[0, 1.35, h * 0.05]} castShadow>
            <boxGeometry args={[w * 0.64, 0.12, h * 0.54]} />
            <meshStandardMaterial color="#f5f5f5" roughness={0.12} envMapIntensity={1.0} />
          </mesh>
          {/* Cistern tank */}
          <mesh position={[0, 2.65, -h * 0.22]} castShadow>
            <boxGeometry args={[w * 0.84, 1.8, h * 0.3]} />
            <meshStandardMaterial color="#fafafa" roughness={0.14} envMapIntensity={1.1} />
          </mesh>
          {/* Tank lid with rounded profile */}
          <mesh position={[0, 3.55, -h * 0.22]}>
            <boxGeometry args={[w * 0.82, 0.1, h * 0.28]} />
            <meshStandardMaterial color="#f8f8f8" roughness={0.1} envMapIntensity={0.9} />
          </mesh>
          {/* Chrome flush button */}
          <mesh position={[0, 3.6, -h * 0.22 + h * 0.14]}>
            <cylinderGeometry args={[0.18, 0.18, 0.06, 16]} />
            <meshStandardMaterial {...CHROME} />
          </mesh>
          {/* Seat */}
          <mesh position={[0, 1.42, h * 0.06]} castShadow>
            <boxGeometry args={[w * 0.66, 0.1, h * 0.56]} />
            <meshStandardMaterial color="#f0f0ec" roughness={0.28} />
          </mesh>
          {/* Seat hinge chrome */}
          {[-0.12, 0.12].map((ox, i) => (
            <mesh key={i} position={[ox, 1.48, -h * 0.18]}>
              <cylinderGeometry args={[0.04, 0.04, 0.08, 8]} />
              <meshStandardMaterial {...CHROME} />
            </mesh>
          ))}
        </group>
      );

    // ══════════════════════════════════════════════════════════
    case 'bathtub':
      return (
        <group>
          {/* Outer shell — freestanding with carved underside */}
          <mesh position={[0, 1.28, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 2.56, h]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.08} metalness={0.02}
              envMapIntensity={1.6} />
          </mesh>
          {/* Inner basin */}
          <mesh position={[0, 2.0, 0]}>
            <boxGeometry args={[w - 0.45, 1.2, h - 0.45]} />
            <meshStandardMaterial color="#edf2f6" roughness={0.12} envMapIntensity={1.2} />
          </mesh>
          {/* Chrome rim */}
          <mesh position={[0, 2.58, 0]}>
            <boxGeometry args={[w + 0.05, 0.09, h + 0.05]} />
            <meshStandardMaterial {...CHROME} />
          </mesh>
          {/* Tub feet — 4 claw-feet style */}
          {[[-w/2+0.4, -h/2+0.4], [w/2-0.4, -h/2+0.4], [-w/2+0.4, h/2-0.4], [w/2-0.4, h/2-0.4]].map(([fx, fz], i) => (
            <mesh key={`foot-${i}`} position={[fx, 0.1, fz]} castShadow>
              <sphereGeometry args={[0.18, 10, 8]} />
              <meshStandardMaterial {...CHROME} />
            </mesh>
          ))}
          {/* Floor-mount faucet */}
          <mesh position={[w/2 - 0.1, 2.6, 0]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.8, 12]} />
            <meshStandardMaterial {...CHROME} />
          </mesh>
          <mesh position={[w/2 - 0.1, 3.0, 0.18]} rotation={[Math.PI * 0.15, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.06, 0.55, 12]} />
            <meshStandardMaterial {...CHROME} />
          </mesh>
          {/* Water shimmer */}
          <mesh position={[0, 2.4, 0]}>
            <boxGeometry args={[w - 0.5, 0.04, h - 0.5]} />
            <meshPhysicalMaterial color="#b0d8e8" roughness={0.0} metalness={0.0}
              transparent opacity={0.7} transmission={0.4} ior={1.33}
              envMapIntensity={3} />
          </mesh>
        </group>
      );

    // ══════════════════════════════════════════════════════════
    case 'sink': {
      const wood = sharedWood();
      const marble = sharedMarble();
      return (
        <group>
          {/* Vanity cabinet body */}
          <mesh position={[0, 1.55, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 3.1, h]} />
            <meshStandardMaterial color="#4a3218" map={wood} normalMap={sharedWoodNormal()}
              roughness={0.44} envMapIntensity={0.6} />
          </mesh>
          {/* Drawer fronts */}
          {[-1, 1].map(s => (
            <mesh key={`drw-${s}`} position={[s * w/4, 1.55, h/2 + 0.02]} castShadow>
              <boxGeometry args={[w/2 - 0.08, 2.8, 0.05]} />
              <meshStandardMaterial color="#3a2810" map={wood} roughness={0.42} />
            </mesh>
          ))}
          {/* Drawer divider line */}
          <mesh position={[0, 1.55, h/2 + 0.02]}>
            <boxGeometry args={[0.04, 2.8, 0.06]} />
            <meshStandardMaterial color="#1e1008" roughness={0.6} />
          </mesh>
          {/* Metal bar handles */}
          {[-1, 1].map(s => (
            <group key={`pull-${s}`} position={[s * w/4, 2.4, h/2 + 0.09]}>
              <mesh>
                <boxGeometry args={[0.45, 0.04, 0.04]} />
                <meshStandardMaterial {...CHROME} />
              </mesh>
              {[-0.22, 0.22].map((ox, i) => (
                <mesh key={i} position={[ox, 0, -0.04]} rotation={[Math.PI/2, 0, 0]}>
                  <cylinderGeometry args={[0.025, 0.025, 0.08, 8]} />
                  <meshStandardMaterial {...CHROME} />
                </mesh>
              ))}
            </group>
          ))}
          {/* Toe kick */}
          <mesh position={[0, 0.12, h/2 + 0.04]}>
            <boxGeometry args={[w - 0.2, 0.24, 0.06]} />
            <meshStandardMaterial color="#1a0e06" roughness={0.7} />
          </mesh>
          {/* Marble countertop */}
          <mesh position={[0, 3.14, 0]} castShadow receiveShadow>
            <boxGeometry args={[w + 0.22, 0.2, h + 0.12]} />
            <meshStandardMaterial color="#f0ece2" map={marble} roughness={0.1}
              metalness={0.04} envMapIntensity={2.0} />
          </mesh>
          {/* Under-mount basin */}
          <mesh position={[0, 3.04, 0]}>
            <boxGeometry args={[w * 0.52, 0.2, h * 0.72]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.09} envMapIntensity={1.5} />
          </mesh>
          {/* Deck-mount faucet */}
          <mesh position={[0, 3.36, -h * 0.3]}>
            <cylinderGeometry args={[0.05, 0.05, 0.62, 12]} />
            <meshStandardMaterial {...CHROME} />
          </mesh>
          <mesh position={[0, 3.65, -h * 0.18]} rotation={[Math.PI * 0.12, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.05, 0.5, 12]} />
            <meshStandardMaterial {...CHROME} />
          </mesh>
          {/* Hot/cold handles */}
          {[-0.28, 0.28].map((ox, i) => (
            <group key={i} position={[ox, 3.36, -h * 0.3]}>
              <mesh>
                <cylinderGeometry args={[0.038, 0.038, 0.1, 10]} />
                <meshStandardMaterial {...CHROME} />
              </mesh>
              <mesh position={[0.04, 0.08, 0]}>
                <boxGeometry args={[0.18, 0.05, 0.05]} />
                <meshStandardMaterial {...CHROME} />
              </mesh>
            </group>
          ))}
          {/* Frameless mirror */}
          <mesh position={[0, 5.4, -h/2 + 0.04]} castShadow>
            <boxGeometry args={[w * 0.88, 3.0, 0.05]} />
            <meshStandardMaterial color="#c8d8e4" roughness={0.02} metalness={1.0}
              envMapIntensity={3.0} />
          </mesh>
          {/* Mirror backing frame — thin reveal */}
          <mesh position={[0, 5.4, -h/2 + 0.02]}>
            <boxGeometry args={[w * 0.9, 3.08, 0.04]} />
            <meshStandardMaterial {...MATTE_BLACK} />
          </mesh>
        </group>
      );
    }

    // ══════════════════════════════════════════════════════════
    case 'stove':
      return (
        <group>
          {/* Stainless body */}
          <mesh position={[0, 1.55, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 3.1, h]} />
            <meshStandardMaterial color="#d8d8d4" roughness={0.28} metalness={0.78}
              envMapIntensity={1.2} />
          </mesh>
          {/* Brushed-finish front panel */}
          <mesh position={[0, 1.55, h/2 + 0.005]}>
            <boxGeometry args={[w - 0.04, 3.0, 0.01]} />
            <meshStandardMaterial color="#c8c8c4" roughness={0.55} metalness={0.65} />
          </mesh>
          {/* Ceramic/glass cooktop */}
          <mesh position={[0, 3.13, 0]} receiveShadow>
            <boxGeometry args={[w - 0.04, 0.12, h - 0.04]} />
            <meshStandardMaterial color="#080808" roughness={0.06} metalness={0.9}
              envMapIntensity={2.0} />
          </mesh>
          {/* Induction heating zones */}
          {[-w/4, w/4].flatMap((px, i) =>
            [-h/4, h/4].map((pz, j) => (
              <mesh key={`zone-${i}-${j}`} position={[px, 3.2, pz]}>
                <ringGeometry args={[0.42, 0.48, 32]} />
                <meshStandardMaterial color={isNight ? '#ff4400' : '#1a1a1a'}
                  emissive={isNight ? '#ff2200' : '#000'}
                  emissiveIntensity={isNight ? 0.3 : 0}
                  roughness={0.4} side={THREE.DoubleSide} />
              </mesh>
            ))
          )}
          {/* Oven door */}
          <mesh position={[0, 1.2, h/2 + 0.02]} castShadow>
            <boxGeometry args={[w * 0.88, 1.8, 0.05]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.14} metalness={0.75}
              envMapIntensity={1.5} />
          </mesh>
          {/* Oven window — glass with reflections */}
          <mesh position={[0, 1.2, h/2 + 0.05]}>
            <boxGeometry args={[w * 0.75, 1.2, 0.03]} />
            <meshPhysicalMaterial color="#0c1418" roughness={0.05} metalness={0.2}
              transparent opacity={0.85} envMapIntensity={3} clearcoat={1} />
          </mesh>
          {/* Bar handle */}
          <mesh position={[0, 2.0, h/2 + 0.1]} rotation={[0, 0, Math.PI/2]}>
            <cylinderGeometry args={[0.05, 0.05, w * 0.82, 12]} />
            <meshStandardMaterial {...CHROME} />
          </mesh>
          {/* Handle end caps */}
          {[-w * 0.41, w * 0.41].map((hx, i) => (
            <mesh key={i} position={[hx, 2.0, h/2 + 0.1]}>
              <sphereGeometry args={[0.055, 10, 8]} />
              <meshStandardMaterial {...CHROME} />
            </mesh>
          ))}
          {/* Control knobs */}
          {[-0.85, -0.28, 0.28, 0.85].map((s, i) => (
            <group key={`knb-${i}`} position={[s * w / 2, 2.75, h/2 + 0.04]}>
              <mesh>
                <cylinderGeometry args={[0.1, 0.1, 0.05, 16]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.4} />
              </mesh>
              <mesh position={[0.06, 0, 0.02]}>
                <boxGeometry args={[0.12, 0.05, 0.03]} />
                <meshStandardMaterial color="#e0e0e0" metalness={0.8} roughness={0.2} />
              </mesh>
            </group>
          ))}
        </group>
      );

    // ══════════════════════════════════════════════════════════
    case 'fridge':
      return (
        <group>
          <mesh position={[0, 3.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 7, h]} />
            <meshStandardMaterial color="#d4d4d0" roughness={0.24} metalness={0.82}
              envMapIntensity={1.4} />
          </mesh>
          {/* Door split reveal */}
          <mesh position={[0, 5.4, h/2 + 0.006]}>
            <boxGeometry args={[w - 0.02, 0.06, 0.01]} />
            <meshStandardMaterial {...MATTE_BLACK} />
          </mesh>
          {/* Freezer/fridge handles — bar style */}
          {[2.0, 5.8].map((py, i) => (
            <group key={`hnd-${i}`} position={[w/2 - 0.12, py, h/2 + 0.05]}>
              <mesh>
                <cylinderGeometry args={[0.05, 0.05, 1.8, 12]} />
                <meshStandardMaterial {...CHROME} />
              </mesh>
              {[-0.9, 0.9].map((hy, hi) => (
                <mesh key={hi} position={[-0.06, hy, 0]} rotation={[0, 0, Math.PI/2]}>
                  <cylinderGeometry args={[0.04, 0.04, 0.12, 8]} />
                  <meshStandardMaterial {...CHROME} />
                </mesh>
              ))}
            </group>
          ))}
          {/* Ice dispenser panel (luxury detail) */}
          <mesh position={[-w/2 + 0.14, 5.2, h/2 + 0.04]}>
            <boxGeometry args={[0.45, 0.85, 0.05]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.2} metalness={0.6} />
          </mesh>
          {/* Top grille vent */}
          <mesh position={[0, 7.06, 0]}>
            <boxGeometry args={[w + 0.05, 0.12, h + 0.05]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.55} />
          </mesh>
        </group>
      );

    // ══════════════════════════════════════════════════════════
    case 'counter':
    case 'island': {
      const wood = sharedWood();
      const marble = sharedMarble();
      const doorCount = Math.max(2, Math.floor(w / 1.6));
      const doorW = (w - 0.2) / doorCount;
      return (
        <group>
          {/* Toe kick */}
          <mesh position={[0, 0.14, 0]} castShadow>
            <boxGeometry args={[w - 0.18, 0.28, h - 0.1]} />
            <meshStandardMaterial color="#150e08" roughness={0.75} />
          </mesh>
          {/* Cabinet body */}
          <mesh position={[0, 1.58, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 2.56, h]} />
            <meshStandardMaterial color="#e8e2d6" roughness={0.58} />
          </mesh>
          {/* Door fronts */}
          {Array.from({ length: doorCount }).map((_, i) => {
            const x = -w/2 + 0.1 + doorW/2 + i * doorW;
            return (
              <group key={`cab-${i}`}>
                <mesh position={[x, 1.58, h/2 + 0.022]} castShadow>
                  <boxGeometry args={[doorW - 0.04, 2.35, 0.05]} />
                  <meshStandardMaterial color="#4a3218" map={wood} normalMap={sharedWoodNormal()}
                    roughness={0.42} envMapIntensity={0.6} />
                </mesh>
                {/* Push-to-open channel reveal */}
                <mesh position={[x, 2.6, h/2 + 0.055]}>
                  <boxGeometry args={[doorW * 0.55, 0.05, 0.05]} />
                  <meshStandardMaterial {...CHROME} />
                </mesh>
              </group>
            );
          })}
          {/* Marble / stone countertop */}
          <mesh position={[0, 2.96, 0]} castShadow receiveShadow>
            <boxGeometry args={[w + 0.12, 0.22, h + 0.12]} />
            <meshStandardMaterial color="#efece4" map={marble} roughness={0.1}
              metalness={0.04} envMapIntensity={2.2} />
          </mesh>
          {/* Under-bench edge waterfall detail */}
          <mesh position={[0, 2.85, h/2 + 0.06]}>
            <boxGeometry args={[w + 0.12, 0.06, 0.22]} />
            <meshStandardMaterial color="#efece4" map={marble} roughness={0.1}
              metalness={0.04} envMapIntensity={2.0} />
          </mesh>
          {/* Backsplash for wall counters */}
          {type === 'counter' && (
            <mesh position={[0, 4.4, -h/2 + 0.06]} receiveShadow>
              <boxGeometry args={[w, 2.8, 0.1]} />
              <meshStandardMaterial color="#ecf0ee" roughness={0.22} metalness={0.04}
                envMapIntensity={1.2} />
            </mesh>
          )}
        </group>
      );
    }

    // ══════════════════════════════════════════════════════════
    case 'coffee_table': {
      const wood = sharedWood();
      return (
        <group>
          {/* Lower shelf */}
          <mesh position={[0, 0.32, 0]} castShadow receiveShadow>
            <boxGeometry args={[w * 0.84, 0.12, h * 0.84]} />
            <meshStandardMaterial color="#4a3218" map={wood} normalMap={sharedWoodNormal()}
              roughness={0.45} envMapIntensity={0.6} />
          </mesh>
          {/* Thick glass top */}
          <mesh position={[0, 1.28, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 0.1, h]} />
            <meshPhysicalMaterial color="#d8eef2" roughness={0.02} metalness={0.05}
              transparent opacity={0.15} transmission={0.88} ior={1.52}
              thickness={0.1} reflectivity={1.0} envMapIntensity={7} clearcoat={1} />
          </mesh>
          {/* Glass edge highlight */}
          {[[-w/2, 0, 0], [w/2, 0, 0], [0, 0, -h/2], [0, 0, h/2]].map(([ex, ey, ez], i) => {
            const isX = i < 2;
            return (
              <mesh key={`edge-${i}`} position={[ex, 1.28, ez]}>
                <boxGeometry args={isX ? [0.12, 0.1, h] : [w, 0.1, 0.12]} />
                <meshStandardMaterial color="#a0c8d8" roughness={0.0} metalness={0.2}
                  transparent opacity={0.35} envMapIntensity={4} />
              </mesh>
            );
          })}
          {/* Corner legs — solid brass */}
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
            <mesh key={i} position={[sx * (w/2 - 0.16), 0.7, sz * (h/2 - 0.16)]} castShadow>
              <boxGeometry args={[0.14, 1.4, 0.14]} />
              <meshStandardMaterial color="#8a6820" roughness={0.35} metalness={0.75}
                envMapIntensity={1.2} />
            </mesh>
          ))}
          {/* Shelf decor — art book stack */}
          <mesh position={[-w * 0.18, 0.46, 0]} castShadow>
            <boxGeometry args={[w * 0.38, 0.22, h * 0.32]} />
            <meshStandardMaterial color="#6a5840" roughness={0.85} />
          </mesh>
          <mesh position={[-w * 0.18, 0.58, 0]} castShadow>
            <boxGeometry args={[w * 0.35, 0.14, h * 0.28]} />
            <meshStandardMaterial color="#4a3828" roughness={0.85} />
          </mesh>
        </group>
      );
    }

    // ══════════════════════════════════════════════════════════
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
      const potH = isFlower ? 0.7 : isTall ? 2.2 : 1.8;
      const potR = isFlower ? [0.55, 0.4] : isTall ? [0.75, 0.6] : [0.7, 0.55];

      const POT_COLORS_DETAILED = [
        { body: '#d8cfc4', band: '#c8a840', accent: '#a89878' }, // sand + gold
        { body: '#1a1a1a', band: '#c8a840', accent: '#333' }, // matte black + gold (signature)
        { body: '#5a3a1a', band: '#c8a840', accent: '#7a5828' }, // terracotta + gold
        { body: '#38383a', band: '#e8e8e8', accent: '#484848' }, // graphite + chrome
        { body: '#8a6a50', band: '#b87840', accent: '#a88060' }, // tan ceramic
      ];
      const pc = POT_COLORS_DETAILED[variant];
      const leafColors = ['#2d5a28', '#3a6830', '#245020', '#486040', '#30582a'];
      const leafC = leafColors[variant];

      return (
        <group>
          {/* Architectural pot — tapered with decorative band */}
          <group position={[0, potH * 0.4, 0]}>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[potR[0], potR[1], potH * 0.8, 32]} />
              <meshStandardMaterial color={pc.body} roughness={0.28} metalness={0.25}
                envMapIntensity={1.5} />
            </mesh>
            {/* Rim */}
            <mesh position={[0, potH * 0.4, 0]} castShadow>
              <cylinderGeometry args={[potR[0] + 0.08, potR[0] + 0.02, 0.12, 32]} />
              <meshStandardMaterial color={pc.body} roughness={0.2} metalness={0.35} />
            </mesh>
            {/* Gold decorative band */}
            <mesh position={[0, -potH * 0.12, 0]}>
              <cylinderGeometry args={[potR[0] - 0.01, potR[0] - 0.01, 0.08, 32]} />
              <meshStandardMaterial color={pc.band} roughness={0.08} metalness={0.95}
                envMapIntensity={3} />
            </mesh>
            {/* Base disc */}
            <mesh position={[0, -potH * 0.4, 0]}>
              <cylinderGeometry args={[potR[1] + 0.05, potR[1] + 0.05, 0.06, 32]} />
              <meshStandardMaterial color={pc.accent} roughness={0.4} metalness={0.3} />
            </mesh>
          </group>

          {/* Soil top */}
          <mesh position={[0, potH * 0.78, 0]}>
            <cylinderGeometry args={[potR[0] - 0.06, potR[0] - 0.06, 0.1, 20]} />
            <meshStandardMaterial color="#1e1208" roughness={1} />
          </mesh>

          {/* Foliage */}
          {isFlower ? (
            <group position={[0, potH * 0.82, 0]}>
              <mesh castShadow>
                <sphereGeometry args={[0.52, 18, 14]} />
                <meshStandardMaterial color={leafC} roughness={0.9} />
              </mesh>
              {Array.from({ length: 8 }).map((_, i) => {
                const a = i * Math.PI * 2 / 8;
                const r = 0.3 + pseudoRandom(seed + i) * 0.2;
                const ht = 0.5 + pseudoRandom(seed + i) * 0.4;
                const fc = ['#e83050', '#ff8820', '#f0c010', '#a040c0', '#ff60a0',
                  '#40c0f0', '#e05020', '#80d040'][i % 8];
                return (
                  <group key={i} position={[Math.cos(a) * r, 0.2, Math.sin(a) * r]}>
                    <mesh position={[0, ht/2, 0]}>
                      <cylinderGeometry args={[0.018, 0.022, ht, 8]} />
                      <meshStandardMaterial color="#1c3818" />
                    </mesh>
                    <group position={[0, ht, 0]}>
                      {Array.from({ length: 6 }).map((__, pi) => (
                        <mesh key={pi}
                          position={[Math.cos(pi * Math.PI/3) * 0.1, 0, Math.sin(pi * Math.PI/3) * 0.1]}
                          rotation={[0.45, pi * Math.PI/3, 0]}>
                          <boxGeometry args={[0.2, 0.25, 0.018]} />
                          <meshStandardMaterial color={fc} roughness={0.35}
                            side={THREE.DoubleSide} />
                        </mesh>
                      ))}
                      <mesh position={[0, 0.05, 0]}>
                        <sphereGeometry args={[0.065, 8, 8]} />
                        <meshStandardMaterial color="#ffcc00" emissive="#cc8800"
                          emissiveIntensity={0.4} />
                      </mesh>
                    </group>
                  </group>
                );
              })}
            </group>
          ) : isTall ? (
            <group position={[0, potH * 0.8, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.05, 0.1, 1.4, 10]} />
                <meshStandardMaterial color="#2a1c10" roughness={0.8} />
              </mesh>
              {[0, 1, 2].map(ti => (
                <mesh key={ti} position={[0, 1.2 + ti * 1.4, 0]} castShadow>
                  <coneGeometry args={[1.6 - ti * 0.4, 2.6, 18]} />
                  <meshStandardMaterial color={leafC} roughness={0.88} />
                </mesh>
              ))}
            </group>
          ) : (
            <group position={[0, potH * 0.78 + 1.2, 0]}>
              <mesh castShadow>
                <sphereGeometry args={[1.28, 18, 14]} />
                <meshStandardMaterial color={leafC} roughness={0.9} />
              </mesh>
              {[[0.6, 0.85, 0.28], [-0.5, 1.1, -0.22], [0.2, 1.4, 0.1]].map(([ox, oy, oz], i) => (
                <mesh key={i} position={[ox, oy, oz]} castShadow>
                  <sphereGeometry args={[1.0 - i * 0.15, 14, 12]} />
                  <meshStandardMaterial color={leafColors[(variant + i + 1) % 5]} roughness={0.9} />
                </mesh>
              ))}
            </group>
          )}
        </group>
      );
    }

    // ══════════════════════════════════════════════════════════
    case 'nightstand': {
      const wood = sharedWood();
      return (
        <group>
          <mesh position={[0, 1.22, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 2.44, h]} />
            <meshStandardMaterial color="#4a3218" map={wood} normalMap={sharedWoodNormal()}
              roughness={0.44} envMapIntensity={0.6} />
          </mesh>
          {/* Drawer */}
          <mesh position={[0, 1.6, h/2 + 0.024]}>
            <boxGeometry args={[w - 0.08, 0.75, 0.05]} />
            <meshStandardMaterial color="#3a2410" map={wood} roughness={0.44} />
          </mesh>
          <mesh position={[0, 1.6, h/2 + 0.08]}>
            <cylinderGeometry args={[0.055, 0.055, 0.05, 12]} />
            <meshStandardMaterial {...BRASS} />
          </mesh>
          {/* Top surface */}
          <mesh position={[0, 2.48, 0]}>
            <boxGeometry args={[w + 0.06, 0.08, h + 0.06]} />
            <meshStandardMaterial color="#2e1c0c" map={wood} roughness={0.36}
              envMapIntensity={0.7} />
          </mesh>
          {/* Table lamp — modern slim design */}
          <mesh position={[0, 2.62, 0]}>
            <cylinderGeometry args={[0.1, 0.18, 0.08, 20]} />
            <meshStandardMaterial {...MATTE_BLACK} />
          </mesh>
          <mesh position={[0, 3.25, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 1.2, 10]} />
            <meshStandardMaterial {...MATTE_BLACK} />
          </mesh>
          {/* Conical shade */}
          <mesh position={[0, 3.95, 0]}>
            <coneGeometry args={[0.42, 0.6, 20, 1, true]} />
            <meshStandardMaterial color="#e8d8c4" roughness={0.9}
              emissive="#ffd080" emissiveIntensity={isNight ? 0.8 : 0.05}
              side={THREE.DoubleSide} />
          </mesh>
          {/* Inner shade glow disc */}
          <mesh position={[0, 3.7, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.02, 12]} />
            <meshStandardMaterial color="#ffe0a0"
              emissive="#ffe0a0" emissiveIntensity={isNight ? 2 : 0.1} />
          </mesh>
          {isNight && (
            <pointLight position={[0, 3.7, 0]} intensity={12} distance={8}
              color="#ffd090" decay={2} />
          )}
        </group>
      );
    }

    // ══════════════════════════════════════════════════════════
    case 'desk': {
      const wood = sharedWood();
      return (
        <group>
          <mesh position={[0, 2.62, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 0.2, h]} />
            <meshStandardMaterial color="#4a3218" map={wood} normalMap={sharedWoodNormal()}
              roughness={0.42} envMapIntensity={0.6} />
          </mesh>
          <mesh position={[0, 1.28, 0]} castShadow>
            <boxGeometry args={[w - 0.5, 2.36, h - 0.5]} />
            <meshStandardMaterial color="#e8e2d6" roughness={0.6} />
          </mesh>
          {[-w/2 + 0.45, w/2 - 0.45].map((lx, i) => (
            <mesh key={i} position={[lx, 1.28, 0]} castShadow>
              <boxGeometry args={[0.1, 2.56, h - 0.1]} />
              <meshStandardMaterial color="#3a2412" map={wood} roughness={0.45} />
            </mesh>
          ))}
        </group>
      );
    }

    case 'bookshelf': {
      const wood = sharedWood();
      const shelfCount = Math.floor(h / 1.2);
      return (
        <group>
          <mesh position={[0, 3.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 7, h]} />
            <meshStandardMaterial color="#3a2610" map={wood} roughness={0.5} />
          </mesh>
          {Array.from({ length: shelfCount }).map((_, i) => (
            <mesh key={`shelf-${i}`} position={[0, 0.8 + i * 1.15, 0]}>
              <boxGeometry args={[w - 0.1, 0.1, h - 0.05]} />
              <meshStandardMaterial color="#2e1e0a" map={wood} roughness={0.42}
                envMapIntensity={0.5} />
            </mesh>
          ))}
          {/* Book spines */}
          {Array.from({ length: shelfCount }).flatMap((_, si) => {
            const bookColors = ['#8b2020', '#1a3a6a', '#2a5a2a', '#5a4a1a', '#3a1a5a', '#5a2a1a'];
            const count = Math.floor(w / 0.5);
            return Array.from({ length: count }).map((__, bi) => (
              <mesh key={`book-${si}-${bi}`}
                position={[-w/2 + 0.08 + bi * (w - 0.16) / count + (w - 0.16) / count / 2, 1.15 + si * 1.15, 0]}>
                <boxGeometry args={[(w - 0.16) / count - 0.04, 0.7 + Math.sin(bi * 0.8) * 0.15, h - 0.18]} />
                <meshStandardMaterial color={bookColors[bi % bookColors.length]} roughness={0.8} />
              </mesh>
            ));
          })}
        </group>
      );
    }

    case 'washing_machine':
      return (
        <group>
          <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 3, h]} />
            <meshStandardMaterial color="#e8e8e4" roughness={0.28} metalness={0.45}
              envMapIntensity={0.8} />
          </mesh>
          <mesh position={[0, 2.0, h/2 + 0.018]}>
            <cylinderGeometry args={[w * 0.3, w * 0.3, 0.04, 28]} />
            <meshPhysicalMaterial color="#1a2a3a" roughness={0.04} metalness={0.3}
              transparent opacity={0.75} envMapIntensity={3} clearcoat={1} />
          </mesh>
          <mesh position={[0, 2.0, h/2 + 0.015]}>
            <ringGeometry args={[w * 0.28, w * 0.34, 28]} />
            <meshStandardMaterial {...CHROME} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 2.8, h/2 + 0.02]}>
            <boxGeometry args={[w * 0.5, 0.35, 0.04]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.6} />
          </mesh>
          {[-0.15, 0, 0.15].map((ox, i) => (
            <mesh key={i} position={[ox, 2.8, h/2 + 0.04]}>
              <cylinderGeometry args={[0.06, 0.06, 0.04, 12]} />
              <meshStandardMaterial color={i === 1 ? '#3080ff' : '#1a1a1a'}
                emissive={i === 1 && isNight ? '#3080ff' : '#000'}
                emissiveIntensity={isNight ? 0.5 : 0} metalness={0.4} roughness={0.4} />
            </mesh>
          ))}
        </group>
      );

    case 'rug':
      return (
        <mesh position={[0, 0.06, 0]} receiveShadow>
          <boxGeometry args={[w, 0.06, h]} />
          <meshStandardMaterial color="#c0a882" map={sharedBeigeFabric()}
            normalMap={sharedLinenNormal()} normalScale={new THREE.Vector2(0.45, 0.45)}
            roughness={0.96} />
        </mesh>
      );

    case 'generator':
      return (
        <group>
          <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 0.8, h]} />
            <meshStandardMaterial color="#3a4550" roughness={0.75} metalness={0.5} />
          </mesh>
          <mesh position={[0, 1.82, 0]} castShadow receiveShadow>
            <boxGeometry args={[w * 0.9, 2.04, h * 0.9]} />
            <meshStandardMaterial color="#2a3540" roughness={0.62} metalness={0.55} />
          </mesh>
          <mesh position={[0, 2.85, 0]} castShadow>
            <boxGeometry args={[w * 0.8, 0.12, h * 0.8]} />
            <meshStandardMaterial color="#1a2028" roughness={0.82} />
          </mesh>
          {[-1, 1].map(s => (
            <mesh key={`vent-${s}`} position={[s * (w * 0.45 + 0.02), 1.82, 0]}>
              <boxGeometry args={[0.05, 1.24, h * 0.6]} />
              <meshStandardMaterial color="#0e141a" roughness={0.9} />
            </mesh>
          ))}
          <mesh position={[0, 2.2, h * 0.45 + 0.02]} castShadow>
            <boxGeometry args={[w * 0.5, 0.42, 0.05]} />
            <meshStandardMaterial color="#1a2028" roughness={0.7} />
          </mesh>
          {[-w * 0.15, -w * 0.05, w * 0.05].map((ox, i) => (
            <mesh key={i} position={[ox, 2.2, h * 0.45 + 0.05]} rotation={[Math.PI/2, 0, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.02, 12]} />
              <meshStandardMaterial
                color={i === 0 ? '#ef4444' : i === 1 ? '#10b981' : '#f59e0b'}
                emissive={i === 0 ? '#ef4444' : i === 1 ? '#10b981' : '#f59e0b'}
                emissiveIntensity={0.8} />
            </mesh>
          ))}
        </group>
      );

    // ══════════════════════════════════════════════════════════
    default:
      return (
        <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, 3, h]} />
          <meshStandardMaterial color="#b0a898" roughness={0.75} />
        </mesh>
      );
  }
};