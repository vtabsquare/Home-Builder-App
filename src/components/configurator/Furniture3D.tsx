import React from 'react';
import * as THREE from 'three';
import { FurnitureItem } from '@/lib/floorplan';

interface Props {
  item: FurnitureItem;
}

export const Furniture3D = ({ item }: Props) => {
  const { type, w, h } = item;

  switch (type) {
    case 'bed':
      return (
        <group>
          {/* Frame */}
          <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 0.8, h]} />
            <meshStandardMaterial color="#5c4033" roughness={0.8} />
          </mesh>
          {/* Headboard */}
          <mesh position={[0, 2, -h / 2 + 0.2]} castShadow receiveShadow>
            <boxGeometry args={[w, 4, 0.4]} />
            <meshStandardMaterial color="#5c4033" roughness={0.8} />
          </mesh>
          {/* Mattress */}
          <mesh position={[0, 1.1, 0.1]} castShadow receiveShadow>
            <boxGeometry args={[w - 0.2, 0.6, h - 0.2]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.9} />
          </mesh>
          {/* Pillows */}
          <mesh position={[-w / 4, 1.5, -h / 2 + 1]} castShadow>
            <boxGeometry args={[w * 0.35, 0.2, 0.8]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.9} />
          </mesh>
          <mesh position={[w / 4, 1.5, -h / 2 + 1]} castShadow>
            <boxGeometry args={[w * 0.35, 0.2, 0.8]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.9} />
          </mesh>
          {/* Blanket */}
          <mesh position={[0, 1.45, h / 4]} castShadow receiveShadow>
            <boxGeometry args={[w + 0.1, 0.15, h / 2]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.9} />
          </mesh>
        </group>
      );
      
    case 'sofa':
      return (
        <group>
          {/* Base */}
          <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 1, h]} />
            <meshStandardMaterial color="#475569" roughness={0.9} />
          </mesh>
          {/* Backrest */}
          <mesh position={[0, 1.8, -h/2 + 0.4]} castShadow receiveShadow>
            <boxGeometry args={[w, 1.6, 0.8]} />
            <meshStandardMaterial color="#475569" roughness={0.9} />
          </mesh>
          {/* Armrests */}
          <mesh position={[-w/2 + 0.4, 1.5, 0.1]} castShadow receiveShadow>
            <boxGeometry args={[0.8, 1, h - 0.2]} />
            <meshStandardMaterial color="#475569" roughness={0.9} />
          </mesh>
          <mesh position={[w/2 - 0.4, 1.5, 0.1]} castShadow receiveShadow>
            <boxGeometry args={[0.8, 1, h - 0.2]} />
            <meshStandardMaterial color="#475569" roughness={0.9} />
          </mesh>
          {/* Cushions */}
          <mesh position={[-w/4, 1.1, 0.2]} castShadow receiveShadow>
            <boxGeometry args={[w/2 - 0.9, 0.3, h - 1]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.9} />
          </mesh>
          <mesh position={[w/4, 1.1, 0.2]} castShadow receiveShadow>
            <boxGeometry args={[w/2 - 0.9, 0.3, h - 1]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.9} />
          </mesh>
        </group>
      );

    case 'dining_table':
      const chairs = [];
      const numChairsSide = Math.max(1, Math.floor((w - 1) / 2));
      for (let i = 0; i < numChairsSide; i++) {
         const px = -w/2 + (w/(numChairsSide+1)) * (i+1);
         // Top side chair
         chairs.push(
           <group key={`c1-${i}`} position={[px, 0, -h/2 - 0.5]}>
             <mesh position={[0, 1.2, 0]} castShadow><boxGeometry args={[1.2, 0.1, 1.2]} /><meshStandardMaterial color="#e2e8f0" /></mesh>
             <mesh position={[0, 2.2, -0.5]} castShadow><boxGeometry args={[1.2, 2, 0.1]} /><meshStandardMaterial color="#94a3b8" /></mesh>
             <mesh position={[0, 0.6, 0]} castShadow><boxGeometry args={[0.8, 1.2, 0.8]} /><meshStandardMaterial color="#1e293b" /></mesh>
           </group>
         );
         // Bottom side chair
         chairs.push(
           <group key={`c2-${i}`} position={[px, 0, h/2 + 0.5]} rotation={[0, Math.PI, 0]}>
             <mesh position={[0, 1.2, 0]} castShadow><boxGeometry args={[1.2, 0.1, 1.2]} /><meshStandardMaterial color="#e2e8f0" /></mesh>
             <mesh position={[0, 2.2, -0.5]} castShadow><boxGeometry args={[1.2, 2, 0.1]} /><meshStandardMaterial color="#94a3b8" /></mesh>
             <mesh position={[0, 0.6, 0]} castShadow><boxGeometry args={[0.8, 1.2, 0.8]} /><meshStandardMaterial color="#1e293b" /></mesh>
           </group>
         );
      }
      return (
        <group>
          {/* Table Top */}
          <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 0.15, h]} />
            <meshStandardMaterial color="#4a3b2c" roughness={0.4} />
          </mesh>
          {/* Legs */}
          {[[-w/2+0.5, -h/2+0.5], [w/2-0.5, -h/2+0.5], [-w/2+0.5, h/2-0.5], [w/2-0.5, h/2-0.5]].map((pos, i) => (
             <mesh key={i} position={[pos[0], 1.25, pos[1]]} castShadow>
               <boxGeometry args={[0.2, 2.5, 0.2]} />
               <meshStandardMaterial color="#111" />
             </mesh>
          ))}
          {chairs}
        </group>
      );

    case 'tv':
      return (
        <group>
          {/* Console */}
          <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 1.2, h]} />
            <meshStandardMaterial color="#1e293b" roughness={0.6} />
          </mesh>
          {/* Screen */}
          <mesh position={[0, 3, 0]} castShadow receiveShadow>
            <boxGeometry args={[w * 0.9, 2.5, 0.1]} />
            <meshStandardMaterial color="#000" roughness={0.1} metalness={0.9} />
          </mesh>
        </group>
      );

    case 'wardrobe':
      return (
        <group>
          <mesh position={[0, 3.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 7, h]} />
            <meshStandardMaterial color="#e7e5e4" roughness={0.8} />
          </mesh>
          {/* Sliding Door Lines */}
          <mesh position={[0, 3.5, h/2 + 0.05]}>
            <boxGeometry args={[0.05, 6.8, 0.05]} />
            <meshStandardMaterial color="#cbd5e1" />
          </mesh>
        </group>
      );

    case 'shower':
      return (
        <group>
          <mesh position={[0, 0.1, 0]} receiveShadow>
            <boxGeometry args={[w, 0.2, h]} />
            <meshStandardMaterial color="#f0f9ff" roughness={0.2} />
          </mesh>
          {/* Glass Partition */}
          <mesh position={[0, 3.5, h/2 - 0.05]} transparent opacity={0.3} depthWrite={false} castShadow>
            <boxGeometry args={[w, 7, 0.1]} />
            <meshStandardMaterial color="#bae6fd" roughness={0.1} metalness={0.8} />
          </mesh>
          <mesh position={[w/2 - 0.05, 3.5, 0]} transparent opacity={0.3} depthWrite={false} castShadow>
            <boxGeometry args={[0.1, 7, h]} />
            <meshStandardMaterial color="#bae6fd" roughness={0.1} metalness={0.8} />
          </mesh>
          {/* Shower Head */}
          <mesh position={[-w/2 + 0.4, 6, -h/2 + 0.4]} rotation={[Math.PI/4, 0, Math.PI/4]}>
             <cylinderGeometry args={[0.4, 0.1, 0.6]} />
             <meshStandardMaterial color="#ccc" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      );

    case 'toilet':
      return (
        <group>
          <mesh position={[0, 0.8, 0]} castShadow>
            <boxGeometry args={[w * 0.7, 1.6, h * 0.6]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.2} />
          </mesh>
          <mesh position={[0, 2.2, -h/4]} castShadow>
            <boxGeometry args={[w * 0.9, 1.2, h * 0.4]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.2} />
          </mesh>
          <mesh position={[0, 1.65, h*0.1]} castShadow>
            <cylinderGeometry args={[w*0.35, w*0.35, 0.1, 16]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.3} />
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

    case 'sink':
      return (
        <group>
          {/* Vanity */}
          <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 3, h]} />
            <meshStandardMaterial color="#334155" roughness={0.6} />
          </mesh>
          {/* Basin */}
          <mesh position={[0, 3.1, 0]}>
            <cylinderGeometry args={[0.8, 0.6, 0.2, 16]} />
            <meshStandardMaterial color="#fff" roughness={0.1} />
          </mesh>
          {/* Mirror */}
          <mesh position={[0, 5, -h/2 + 0.1]}>
            <boxGeometry args={[w * 0.8, 2.5, 0.1]} />
            <meshStandardMaterial color="#fff" roughness={0.1} metalness={1} />
          </mesh>
        </group>
      );

    case 'stove':
      return (
        <group>
          <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 3, h]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.3} />
          </mesh>
          {/* Burners */}
          {[-w/4, w/4].map((px, i) => (
             [-h/4, h/4].map((pz, j) => (
               <mesh key={`${i}-${j}`} position={[px, 3.05, pz]}>
                 <cylinderGeometry args={[0.3, 0.3, 0.1, 12]} />
                 <meshStandardMaterial color="#ef4444" roughness={0.5} />
               </mesh>
             ))
          ))}
        </group>
      );

    case 'fridge':
      return (
        <group>
          <mesh position={[0, 3.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 7, h]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.6} />
          </mesh>
          <mesh position={[w/2 + 0.05, 3.5, 0]} castShadow>
            <boxGeometry args={[0.1, 6.8, 0.1]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
          </mesh>
        </group>
      );

    case 'counter':
    case 'island':
      return (
        <group>
          {/* Base Cabinet */}
          <mesh position={[0, 1.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 2.8, h]} />
            <meshStandardMaterial color="#e7e5e4" roughness={0.7} />
          </mesh>
          {/* Counter Top */}
          <mesh position={[0, 2.9, 0]} castShadow receiveShadow>
            <boxGeometry args={[w + 0.1, 0.2, h + 0.1]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.1} />
          </mesh>
        </group>
      );

    case 'coffee_table':
      return (
        <group>
          <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 0.1, h]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.6, 0]} castShadow>
            <boxGeometry args={[w * 0.8, 1.2, h * 0.8]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.8} />
          </mesh>
        </group>
      );

    case 'plant':
      return (
        <group>
          <mesh position={[0, 1, 0]} castShadow>
            <cylinderGeometry args={[0.6, 0.4, 2, 12]} />
            <meshStandardMaterial color="#4a3b2c" roughness={0.9} />
          </mesh>
          <mesh position={[0, 3, 0]} castShadow>
            <sphereGeometry args={[1.5, 12, 12]} />
            <meshStandardMaterial color="#22c55e" roughness={0.8} />
          </mesh>
        </group>
      );

    case 'nightstand':
    case 'desk':
    case 'bookshelf':
    case 'washing_machine':
      return (
        <mesh position={[0, h > w ? 3.5 : 1.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, h > w ? 7 : 3, h]} />
          <meshStandardMaterial color="#d6d3d1" roughness={0.6} />
        </mesh>
      );

    case 'rug':
      return (
        <mesh position={[0, 0.05, 0]} receiveShadow>
          <boxGeometry args={[w, 0.1, h]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.9} />
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
