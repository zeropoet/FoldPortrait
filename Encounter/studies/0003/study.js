import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { journey, depthPoint } from './geometry.js';
import { passage } from './rooms.js';

try {
  const response = await fetch('./trace.json');
  if (!response.ok) throw new Error('Cannot load the source trace');
  const states = journey(await response.json());
  const canvas = document.querySelector('canvas');
  const stage = document.querySelector('#stage');
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setClearColor(0xf6f2e9);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-7,7,6,-6,.1,100);
  const controls = new OrbitControls(camera,canvas);
  controls.enablePan=false; controls.minZoom=.5; controls.maxZoom=2.5; controls.autoRotateSpeed=.35;
  const lattice = new THREE.Group(); scene.add(lattice);
  const vertices=[];
  // Four intervals per axis. These planes are a spatial reference, never state IDs.
  for(let a=-3;a<=3;a+=1.5) for(let b=-3;b<=3;b+=1.5) {
    vertices.push(-3,a,b,3,a,b, a,-3,b,a,3,b, a,b,-3,a,b,3);
  }
  lattice.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(vertices,3)),new THREE.LineBasicMaterial({color:0x52615b,transparent:true,opacity:.15})));
  const dots=[];
  for(let x=-3;x<=3;x+=1.5) for(let y=-3;y<=3;y+=1.5) for(let z=-3;z<=3;z+=1.5) dots.push(x,y,z);
  const nodes=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(dots,3)),new THREE.PointsMaterial({color:0x52615b,size:3,sizeAttenuation:false}));
  nodes.visible=false;scene.add(nodes);
  const sheets=new THREE.Group(); lattice.add(sheets);
  for(let depth=-3;depth<=3;depth+=1.5) {
    const sheet=new THREE.Mesh(new THREE.PlaneGeometry(6,6),new THREE.MeshBasicMaterial({color:0x849a91,side:THREE.DoubleSide,transparent:true,opacity:.035,depthWrite:false}));
    sheet.position.z=depth; sheets.add(sheet);
  }
  // Open corners recall FP's mark; the frame never closes over the journey.
  const corners=[];
  for(const x of [-3,3]) for(const y of [-3,3]) for(const z of [-3,3]) {
    corners.push(x,y,z,x-Math.sign(x)*.65,y,z, x,y,z,x,y-Math.sign(y)*.65,z, x,y,z,x,y,z-Math.sign(z)*.65);
  }
  scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(corners,3)),new THREE.LineBasicMaterial({color:0x293a38,transparent:true,opacity:.65})));
  const material=new THREE.MeshBasicMaterial({color:0xa23e2c});
  const unitSegment=new THREE.CylinderGeometry(.021,.021,1,8);
  const segments=states.slice(1).map(()=>{const mesh=new THREE.Mesh(unitSegment,material);scene.add(mesh);return mesh;});
  const joints=states.map(()=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(.021,8,6),material);scene.add(mesh);return mesh;});
  const marker=new THREE.Mesh(new THREE.SphereGeometry(.065,12,8),material);scene.add(marker);
  const rooms=new Map();
  const roomGeometry=new THREE.BoxGeometry(1.5,1.5,1.5);
  const roomEdges=new THREE.EdgesGeometry(roomGeometry);
  for(let x=0;x<4;x++)for(let y=0;y<4;y++)for(let z=0;z<4;z++) {
    const fill=new THREE.Mesh(roomGeometry,new THREE.MeshBasicMaterial({color:0xc9966c,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
    const edges=new THREE.LineSegments(roomEdges,new THREE.LineBasicMaterial({color:0xa05237,transparent:true,opacity:0,depthWrite:false}));
    fill.position.set(-2.25+x*1.5,-2.25+y*1.5,-2.25+z*1.5);edges.position.copy(fill.position);
    scene.add(fill,edges);rooms.set(`${x},${y},${z}`,{fill,edges});
  }
  const slider=document.querySelector('#step'); const play=document.querySelector('#play');
  let playing=false, elapsed=0, openness=1, progress=63, roomsVisible=true;
  let points=states.map(s=>depthPoint(s.point,openness));
  const depthSlider=document.querySelector('#openness');
  function display(step) {
    progress=Math.max(0,Math.min(63,step-1));
    const occupied=passage(points,progress);
    segments.forEach((mesh,i)=>{
      const fraction=Math.max(0,Math.min(1,progress-i));
      const start=new THREE.Vector3(...points[i]);
      const end=new THREE.Vector3(...points[i+1]).lerp(start,1-fraction);
      const direction=end.clone().sub(start);const length=direction.length();
      mesh.visible=fraction>0 && length>1e-12;
      if(mesh.visible){mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());mesh.scale.set(1,length,1);}
    });
    joints.forEach((mesh,i)=>{mesh.visible=i<=Math.floor(progress);mesh.position.set(...points[i]);});
    marker.position.set(...occupied.marker);
    // Opacity follows passage status only; depth changes spatial occupancy.
    rooms.forEach(({fill,edges},id)=>{
      const visits=occupied.visits.get(id)??0;const active=id===occupied.active;
      fill.visible=edges.visible=roomsVisible && visits>0;
      fill.material.opacity=active?.15:.025;
      edges.material.opacity=active?.75:.135;
    });
    slider.value=String(Math.floor(progress)+1);
    document.querySelector('#count').textContent=`${Math.floor(progress)+1} / 64`;
    document.querySelector('#room-count').textContent=`${occupied.visits.size} ${occupied.visits.size===1?'room':'rooms'} entered · ${occupied.visits.get(occupied.active)>1?'return passage':'current passage'}`;
  }
  function setDepth(value) {
    openness=value;points=states.map(s=>depthPoint(s.point,value));
    document.querySelector('#depth-value').textContent=`${Math.round(value*100)}%`;
    display(progress+1);
  }
  depthSlider.addEventListener('input',()=>setDepth(Number(depthSlider.value)/100));
  document.querySelector('#rooms').addEventListener('click',e=>{roomsVisible=!roomsVisible;e.currentTarget.setAttribute('aria-pressed',String(roomsVisible));display(progress+1);});
  function stop(){playing=false;play.setAttribute('aria-pressed','false');play.textContent='Trace journey';}
  slider.addEventListener('input',()=>{stop();display(Number(slider.value));});
  play.addEventListener('click',()=>{if(playing){stop();return;} playing=true;elapsed=0;display(1);play.setAttribute('aria-pressed','true');play.textContent='Pause';});
  const views={field:[10,7,12],sigil:[0,0,16],depth:[16,0,0]};
  function select(key){camera.position.set(...views[key]);camera.zoom=1;camera.updateProjectionMatrix();controls.update();document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===key)));}
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{controls.autoRotate=false;document.querySelector('#turn').setAttribute('aria-pressed','false');select(b.dataset.view);}));
  const clearView=()=>document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed','false'));
  controls.addEventListener('start',clearView);
  const surfaces=['glass','lines','dots'];let surface=0;
  document.querySelector('#surface').addEventListener('click',e=>{surface=(surface+1)%3;lattice.visible=surface!==2;sheets.visible=surface===0;nodes.visible=surface===2;e.currentTarget.textContent=`Surface: ${surfaces[surface]}`;});
  document.querySelector('#turn').addEventListener('click',e=>{controls.autoRotate=!controls.autoRotate;e.currentTarget.setAttribute('aria-pressed',String(controls.autoRotate));if(controls.autoRotate)clearView();});
  canvas.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
    e.preventDefault();clearView();const offset=camera.position.clone();
    const axis=e.key==='ArrowLeft'||e.key==='ArrowRight'?camera.up.clone():new THREE.Vector3().crossVectors(camera.up,offset).normalize();
    offset.applyAxisAngle(axis,(e.key==='ArrowLeft'||e.key==='ArrowUp'?1:-1)*.08);camera.position.copy(offset);controls.update();
  });
  new ResizeObserver(()=>{const {width,height}=stage.getBoundingClientRect();const h=width<700?10:6;camera.left=-h*width/height;camera.right=-camera.left;camera.top=h;camera.bottom=-h;camera.updateProjectionMatrix();renderer.setSize(width,height);}).observe(stage);
  display(64);select('field');let previous;
  renderer.setAnimationLoop(now=>{const delta=previous===undefined?0:Math.min((now-previous)/1000,.1);previous=now;if(document.hidden)return;if(playing){elapsed+=delta;const step=Math.min(64,1+elapsed*4);display(step);if(step===64)stop();}controls.update(delta);renderer.render(scene,camera);});
} catch(error){const p=document.querySelector('#error');p.hidden=false;p.textContent=`Unable to open the study: ${error.message}`;console.error(error);}
