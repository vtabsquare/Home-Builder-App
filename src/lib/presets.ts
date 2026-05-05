import { ConfigState } from '@/store/configurator';
import { Plan, Room } from './floorplan';

const C: Record<string,string> = {
  bedroom:'hsl(33 35% 82%)',bathroom:'hsl(200 30% 82%)',kitchen:'hsl(28 38% 72%)',
  living:'hsl(40 30% 87%)',dining:'hsl(36 28% 82%)',entry:'hsl(36 18% 76%)',
  hallway:'hsl(38 20% 88%)',balcony:'hsl(120 18% 78%)',garden:'hsl(120 30% 72%)',
};

function bf(w:number,h:number,master:boolean,o=0){const items:any[]=[];const G=.5;const bW=master?Math.min(6,w*.55):Math.min(4.5,w*.5);const bH=master?7:6;const wH=Math.min(h-4,6);if(o===0||o===2){const bY=o===0?G:h-bH-G;items.push({type:'bed',x:(w-bW)/2,y:bY,w:bW,h:bH,rotation:o===0?0:180});items.push({type:'wardrobe',x:w-2.5,y:(h-wH)/2,w:2.2,h:wH});}else{const bX=o===1?w-bH-G:G;items.push({type:'bed',x:bX,y:(h-bW)/2,w:bH,h:bW,rotation:o===1?90:270});items.push({type:'wardrobe',x:(w-wH)/2,y:.5,w:wH,h:2.2});}return items;}
function bathF(w:number,h:number,master:boolean,o=0){const items:any[]=[];const G=.4;const sink={type:'sink'as const,w:2.2,h:1.6};const toilet={type:'toilet'as const,w:1.6,h:2.2};const shower=master?{type:'bathtub'as const,w:2.6,h:5}:{type:'shower'as const,w:3,h:3};if(o===0||o===2){items.push({...sink,x:w-sink.w-G,y:G});items.push({...toilet,x:w-toilet.w-G,y:h-toilet.h-G});items.push({...shower,x:G,y:h-shower.h-G});}else{items.push({...sink,x:G,y:G,rotation:90});items.push({...toilet,x:w-toilet.w-G,y:G});items.push({...shower,x:w-shower.w-G,y:h-shower.h-G});}return items;}
function kf(w:number,h:number,kt:string,o=0){const items:any[]=[];const G=.4;const cd=2;if(o===0||o===2){items.push({type:'counter',x:G,y:G,w:w-2*G,h:cd});items.push({type:'stove',x:w*.3,y:G+.1,w:2.5,h:1.6});items.push({type:'fridge',x:w-2.5-G,y:G+.1,w:2.2,h:2.2});}else{items.push({type:'counter',x:G,y:G,w:cd,h:h-2*G});items.push({type:'stove',x:G+.1,y:h*.3,w:1.6,h:2.5});items.push({type:'fridge',x:G+.1,y:h-2.5-G,w:2.2,h:2.2});}return items;}
function lf(w:number,h:number,o=0){const items:any[]=[];const G=.5;const tvW=Math.min(5.5,w*.4);const sW=Math.min(8,w*.6);if(o===0||o===2){const tvY=o===0?G:h-1.2-G;const sY=o===0?h-3-G:G;items.push({type:'tv',x:(w-tvW)/2,y:tvY,w:tvW,h:1.2});items.push({type:'sofa',x:(w-sW)/2,y:sY,w:sW,h:3});}else{const tvX=o===1?w-1.2-G:G;const sX=o===1?G:w-3-G;items.push({type:'tv',x:tvX,y:(h-tvW)/2,w:1.2,h:tvW,rotation:90});items.push({type:'sofa',x:sX,y:(h-sW)/2,w:3,h:sW,rotation:90});}return items;}
function df(w:number,h:number){const tW=Math.min(5,w*.65);const tH=Math.min(3,h*.45);return[{type:'dining_table',x:(w-tW)/2,y:(h-tH)/2,w:tW,h:tH}];}
function gf(w:number,h:number){const items:any[]=[];const cols=Math.max(2,Math.floor(w/4));const rows=Math.max(2,Math.floor(h/4));for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)items.push({type:'plant',x:1+c*((w-2)/cols),y:1+r*((h-2)/rows),w:1.5,h:1.5});return items;}

type D = Room['doors'][0];
type W = Room['windows'][0];

// Guyana-style: front veranda, living at front, kitchen/dining back, bedrooms in wing
// ══ STARTER A: 2 bedrooms + 1 common bathroom ══
export function starterPresetA(c:ConfigState):Plan{
  const W=25,H=40;const rooms:Room[]=[];
  rooms.push({id:'living',type:'living',label:'HALL + LIVING ROOM',x:0,y:0,w:14,h:18,color:C.living,furniture:lf(14,18),doors:[{wall:'left',position:.8,width:3.5,swing:'in',doorType:'standard'}],windows:[{wall:'left',position:.35,width:4},{wall:'top',position:.4,width:5}]});
  rooms.push({id:'kitchen',type:'kitchen',label:'KITCHEN',x:0,y:18,w:14,h:12,color:C.kitchen,furniture:kf(14,12,c.kitchen),doors:[],windows:[{wall:'left',position:.5,width:3}]});
  rooms.push({id:'dining',type:'dining',label:'DINING',x:0,y:30,w:14,h:10,color:C.dining,furniture:df(14,10),doors:[],windows:[{wall:'left',position:.5,width:3}]});
  rooms.push({id:'bed-0',type:'bedroom',label:'BEDROOM 1',x:14,y:0,w:11,h:14,color:C.bedroom,furniture:bf(11,14,false),doors:[],windows:[{wall:'right',position:.4,width:3},{wall:'top',position:.5,width:3}]});
  rooms.push({id:'bath-common-1',type:'bathroom',label:'COMMON BATH',x:14,y:14,w:11,h:7,color:C.bathroom,furniture:bathF(11,7,false),doors:[],windows:[{wall:'right',position:.5,width:2}]});
  rooms.push({id:'bed-1',type:'bedroom',label:'BEDROOM 2',x:14,y:21,w:11,h:13,color:C.bedroom,furniture:bf(11,13,false),doors:[],windows:[{wall:'right',position:.4,width:3}]});
  rooms.push({id:'garden-0',type:'garden',label:'GARDEN',x:14,y:34,w:11,h:6,color:C.garden,furniture:gf(11,6),doors:[],windows:[]});
  return{width:W,height:H,rooms};
}

// ══ STARTER B: 1 master bedroom + attached bathroom ══
export function starterPresetB(c:ConfigState):Plan{
  const W=30,H=34;const rooms:Room[]=[];
  rooms.push({id:'living',type:'living',label:'HALL + LIVING ROOM',x:0,y:0,w:18,h:17,color:C.living,furniture:lf(18,17),doors:[{wall:'top',position:.3,width:3.5,swing:'in',doorType:'standard'}],windows:[{wall:'top',position:.65,width:5},{wall:'left',position:.4,width:4}]});
  rooms.push({id:'kitchen',type:'kitchen',label:'KITCHEN',x:18,y:0,w:12,h:17,color:C.kitchen,furniture:kf(12,17,c.kitchen),doors:[],windows:[{wall:'right',position:.5,width:3},{wall:'top',position:.5,width:3}]});
  rooms.push({id:'bed-0',type:'bedroom',label:'MASTER BEDROOM',x:0,y:17,w:16,h:17,color:C.bedroom,furniture:bf(16,17,true),doors:[],windows:[{wall:'left',position:.5,width:4},{wall:'bottom',position:.5,width:3}]});
  rooms.push({id:'bath-attached-bed-0',type:'bathroom',label:'MASTER BATH',x:16,y:17,w:8,h:9,color:C.bathroom,furniture:bathF(8,9,true),doors:[],windows:[{wall:'right',position:.5,width:2}]});
  rooms.push({id:'dining',type:'dining',label:'DINING',x:16,y:26,w:14,h:8,color:C.dining,furniture:df(14,8),doors:[],windows:[{wall:'right',position:.5,width:3}]});
  rooms.push({id:'garden-0',type:'garden',label:'GARDEN',x:24,y:17,w:6,h:9,color:C.garden,furniture:gf(6,9),doors:[],windows:[]});
  return{width:W,height:H,rooms};
}

// ══ FAMILY A: 1 master+attached bath, 2 bedrooms+common bath (3BHK) ══
export function familyPresetA(c:ConfigState):Plan{
  const W=40,H=40;const rooms:Room[]=[];
  rooms.push({id:'garden-0',type:'garden',label:'GARDEN',x:0,y:0,w:10,h:12,color:C.garden,furniture:gf(10,12),doors:[],windows:[]});
  rooms.push({id:'living',type:'living',label:'HALL + LIVING ROOM',x:10,y:0,w:22,h:20,color:C.living,furniture:lf(22,20),doors:[{wall:'left',position:.8,width:3.5,swing:'in',doorType:'standard'}],windows:[{wall:'top',position:.4,width:6}]});
  rooms.push({id:'kitchen',type:'kitchen',label:'KITCHEN',x:0,y:12,w:10,h:14,color:C.kitchen,furniture:kf(10,14,c.kitchen),doors:[],windows:[{wall:'left',position:.5,width:4}]});
  rooms.push({id:'dining',type:'dining',label:'DINING',x:0,y:26,w:10,h:14,color:C.dining,furniture:df(10,14),doors:[],windows:[{wall:'left',position:.5,width:3}]});
  const bX=32,bW=8;
  rooms.push({id:'bed-0',type:'bedroom',label:'MASTER BEDROOM',x:bX,y:0,w:bW,h:14,color:C.bedroom,furniture:bf(bW,14,true),doors:[],windows:[{wall:'right',position:.35,width:4},{wall:'top',position:.5,width:3}]});
  rooms.push({id:'bath-attached-bed-0',type:'bathroom',label:'MASTER BATH',x:bX,y:14,w:bW,h:8,color:C.bathroom,furniture:bathF(bW,8,true),doors:[],windows:[{wall:'right',position:.5,width:2}]});
  rooms.push({id:'bed-1',type:'bedroom',label:'BEDROOM 2',x:bX,y:22,w:bW,h:10,color:C.bedroom,furniture:bf(bW,10,false),doors:[],windows:[{wall:'right',position:.4,width:3}]});
  rooms.push({id:'bath-common-1',type:'bathroom',label:'COMMON BATH',x:bX,y:32,w:bW,h:8,color:C.bathroom,furniture:bathF(bW,8,false),doors:[],windows:[{wall:'right',position:.5,width:2}]});
  rooms.push({id:'bed-2',type:'bedroom',label:'BEDROOM 3',x:10,y:20,w:22,h:20,color:C.bedroom,furniture:bf(22,20,false),doors:[],windows:[{wall:'bottom',position:.5,width:3}]});
  return{width:W,height:H,rooms};
}

// ══ FAMILY B: 2 master bedrooms + attached bathrooms ══
export function familyPresetB(c:ConfigState):Plan{
  const W=40,H=40;const rooms:Room[]=[];
  rooms.push({id:'garden-0',type:'garden',label:'GARDEN',x:W-10,y:0,w:10,h:10,color:C.garden,furniture:gf(10,10),doors:[],windows:[]});
  rooms.push({id:'living',type:'living',label:'HALL + LIVING ROOM',x:0,y:0,w:W-10,h:16,color:C.living,furniture:lf(W-10,16),doors:[{wall:'left',position:.7,width:3.5,swing:'in',doorType:'standard'}],windows:[{wall:'top',position:.3,width:6},{wall:'left',position:.3,width:4}]});
  rooms.push({id:'kitchen',type:'kitchen',label:'KITCHEN',x:0,y:16,w:16,h:12,color:C.kitchen,furniture:kf(16,12,c.kitchen),doors:[],windows:[{wall:'left',position:.5,width:4}]});
  rooms.push({id:'dining',type:'dining',label:'DINING',x:16,y:16,w:14,h:12,color:C.dining,furniture:df(14,12),doors:[],windows:[]});
  rooms.push({id:'bed-2',type:'bedroom',label:'BEDROOM 3',x:W-10,y:10,w:10,h:18,color:C.bedroom,furniture:bf(10,18,false),doors:[],windows:[{wall:'right',position:.4,width:3}]});
  // Master 1 bottom-left
  rooms.push({id:'bed-0',type:'bedroom',label:'MASTER BEDROOM 1',x:0,y:28,w:14,h:12,color:C.bedroom,furniture:bf(14,12,true),doors:[],windows:[{wall:'left',position:.4,width:4},{wall:'bottom',position:.5,width:3}]});
  rooms.push({id:'bath-attached-bed-0',type:'bathroom',label:'MASTER BATH 1',x:14,y:28,w:7,h:12,color:C.bathroom,furniture:bathF(7,12,true),doors:[],windows:[{wall:'bottom',position:.5,width:2}]});
  // Master 2 bottom-right
  rooms.push({id:'bed-1',type:'bedroom',label:'MASTER BEDROOM 2',x:29,y:28,w:11,h:12,color:C.bedroom,furniture:bf(11,12,true),doors:[],windows:[{wall:'right',position:.4,width:3},{wall:'bottom',position:.5,width:3}]});
  rooms.push({id:'bath-attached-bed-1',type:'bathroom',label:'MASTER BATH 2',x:21,y:28,w:8,h:12,color:C.bathroom,furniture:bathF(8,12,true),doors:[],windows:[{wall:'bottom',position:.5,width:2}]});
  return{width:W,height:H,rooms};
}

// ══ PREMIUM A: 2 master+attached bath, 2 bedrooms+common bath ══
export function premiumPresetA(c:ConfigState):Plan{
  const W=48,H=50;const rooms:Room[]=[];
  rooms.push({id:'garden-0',type:'garden',label:'GARDEN',x:0,y:0,w:14,h:14,color:C.garden,furniture:gf(14,14),doors:[],windows:[]});
  rooms.push({id:'living',type:'living',label:'HALL + LIVING ROOM',x:14,y:0,w:20,h:22,color:C.living,furniture:lf(20,22),doors:[{wall:'left',position:.85,width:4,swing:'in',doorType:'standard'}],windows:[{wall:'top',position:.3,width:6},{wall:'top',position:.7,width:5}]});
  rooms.push({id:'kitchen',type:'kitchen',label:'KITCHEN',x:0,y:14,w:14,h:16,color:C.kitchen,furniture:kf(14,16,c.kitchen),doors:[],windows:[{wall:'left',position:.4,width:4}]});
  rooms.push({id:'dining',type:'dining',label:'DINING',x:0,y:30,w:14,h:16,color:C.dining,furniture:df(14,16),doors:[],windows:[{wall:'left',position:.5,width:3}]});
  rooms.push({id:'main-hallway',type:'hallway',label:'HALLWAY',x:14+20,y:0,w:4,h:H-4,color:C.hallway,furniture:[],doors:[],windows:[]});
  const bX=38,bW=W-bX;
  // Master 1
  rooms.push({id:'bed-0',type:'bedroom',label:'MASTER BEDROOM 1',x:bX,y:0,w:bW,h:14,color:C.bedroom,furniture:bf(bW,14,true),doors:[],windows:[{wall:'right',position:.3,width:4},{wall:'top',position:.5,width:4}]});
  rooms.push({id:'bath-attached-bed-0',type:'bathroom',label:'MASTER BATH 1',x:bX,y:14,w:bW,h:8,color:C.bathroom,furniture:bathF(bW,8,true),doors:[],windows:[{wall:'right',position:.5,width:2}]});
  // Master 2
  rooms.push({id:'bed-1',type:'bedroom',label:'MASTER BEDROOM 2',x:bX,y:22,w:bW,h:11,color:C.bedroom,furniture:bf(bW,11,true),doors:[],windows:[{wall:'right',position:.4,width:3}]});
  rooms.push({id:'bath-attached-bed-1',type:'bathroom',label:'MASTER BATH 2',x:bX,y:33,w:bW,h:7,color:C.bathroom,furniture:bathF(bW,7,true),doors:[],windows:[{wall:'right',position:.5,width:2}]});
  // Regular bedrooms
  rooms.push({id:'bed-2',type:'bedroom',label:'BEDROOM 3',x:14,y:22,w:20,h:12,color:C.bedroom,furniture:bf(20,12,false),doors:[],windows:[{wall:'left',position:.5,width:3}]});
  rooms.push({id:'bed-3',type:'bedroom',label:'BEDROOM 4',x:14,y:34,w:20,h:12,color:C.bedroom,furniture:bf(20,12,false),doors:[],windows:[{wall:'left',position:.5,width:3}]});
  // Common bath
  rooms.push({id:'bath-common-1',type:'bathroom',label:'COMMON BATH',x:bX,y:40,w:bW,h:6,color:C.bathroom,furniture:bathF(bW,6,false),doors:[],windows:[{wall:'right',position:.5,width:2}]});
  // Balcony
  rooms.push({id:'balcony',type:'balcony',label:'BALCONY',x:0,y:H-4,w:W,h:4,color:C.balcony,furniture:[{type:'plant',x:1,y:.8,w:1.5,h:1.5},{type:'plant',x:W-3,y:.8,w:1.5,h:1.5}],doors:[{wall:'top',position:.5,width:5,swing:'out',doorType:'standard'}],windows:[]});
  return{width:W,height:H,rooms};
}

// ══ PREMIUM B: 1 master+attached bath, 3 bedrooms+2 common bath ══
export function premiumPresetB(c:ConfigState):Plan{
  const W=50,H=48;const rooms:Room[]=[];
  rooms.push({id:'garden-0',type:'garden',label:'GARDEN',x:W-12,y:0,w:12,h:12,color:C.garden,furniture:gf(12,12),doors:[],windows:[]});
  rooms.push({id:'living',type:'living',label:'HALL + LIVING ROOM',x:0,y:0,w:22,h:20,color:C.living,furniture:lf(22,20),doors:[{wall:'left',position:.8,width:4,swing:'in',doorType:'standard'}],windows:[{wall:'top',position:.3,width:6},{wall:'left',position:.35,width:5}]});
  rooms.push({id:'kitchen',type:'kitchen',label:'KITCHEN',x:0,y:20,w:14,h:14,color:C.kitchen,furniture:kf(14,14,c.kitchen),doors:[],windows:[{wall:'left',position:.5,width:4}]});
  rooms.push({id:'dining',type:'dining',label:'DINING',x:14,y:20,w:8,h:14,color:C.dining,furniture:df(8,14),doors:[],windows:[]});
  rooms.push({id:'main-hallway',type:'hallway',label:'HALLWAY',x:22,y:0,w:4,h:H-4,color:C.hallway,furniture:[],doors:[],windows:[]});
  const bX=26,bW=W-bX;
  // Master bedroom
  rooms.push({id:'bed-0',type:'bedroom',label:'MASTER BEDROOM',x:bX,y:0,w:W-12-bX,h:16,color:C.bedroom,furniture:bf(W-12-bX,16,true),doors:[],windows:[{wall:'top',position:.4,width:4}]});
  rooms.push({id:'bath-attached-bed-0',type:'bathroom',label:'MASTER BATH',x:bX,y:16,w:bW,h:8,color:C.bathroom,furniture:bathF(bW,8,true),doors:[],windows:[{wall:'right',position:.5,width:2}]});
  // 3 bedrooms
  rooms.push({id:'bed-1',type:'bedroom',label:'BEDROOM 2',x:bX,y:24,w:bW,h:10,color:C.bedroom,furniture:bf(bW,10,false),doors:[],windows:[{wall:'right',position:.4,width:3}]});
  rooms.push({id:'bed-2',type:'bedroom',label:'BEDROOM 3',x:bX,y:34,w:Math.floor(bW/2),h:10,color:C.bedroom,furniture:bf(Math.floor(bW/2),10,false),doors:[],windows:[]});
  rooms.push({id:'bed-3',type:'bedroom',label:'BEDROOM 4',x:bX+Math.floor(bW/2),y:34,w:bW-Math.floor(bW/2),h:10,color:C.bedroom,furniture:bf(bW-Math.floor(bW/2),10,false),doors:[],windows:[{wall:'right',position:.5,width:3}]});
  // 2 common baths
  rooms.push({id:'bath-common-1',type:'bathroom',label:'COMMON BATH 1',x:bX,y:H-4,w:Math.floor(bW/2),h:4,color:C.bathroom,furniture:bathF(Math.floor(bW/2),4,false),doors:[],windows:[]});
  rooms.push({id:'bath-common-2',type:'bathroom',label:'COMMON BATH 2',x:bX+Math.floor(bW/2),y:H-4,w:bW-Math.floor(bW/2),h:4,color:C.bathroom,furniture:bathF(bW-Math.floor(bW/2),4,false),doors:[],windows:[{wall:'right',position:.5,width:2}]});
  // Study bottom-left
  rooms.push({id:'bed-extra',type:'bedroom',label:'STUDY',x:0,y:34,w:22,h:H-34-4,color:C.bedroom,furniture:bf(22,H-34-4,false),doors:[],windows:[{wall:'left',position:.4,width:4},{wall:'bottom',position:.5,width:3}]});
  // Garden extension
  rooms.push({id:'bed-0-ext',type:'bedroom',label:'MASTER WALK-IN',x:W-12,y:12,w:12,h:8,color:C.bedroom,furniture:[{type:'wardrobe',x:1,y:1,w:10,h:3}],doors:[],windows:[{wall:'right',position:.5,width:3}]});
  // Balcony
  rooms.push({id:'balcony',type:'balcony',label:'BALCONY',x:0,y:H-4,w:W,h:4,color:C.balcony,furniture:[{type:'plant',x:1,y:.8,w:1.5,h:1.5},{type:'plant',x:W-3,y:.8,w:1.5,h:1.5}],doors:[{wall:'top',position:.5,width:5,swing:'out',doorType:'standard'}],windows:[]});
  return{width:W,height:H,rooms};
}
