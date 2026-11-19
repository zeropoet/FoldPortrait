import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { journey } from '../0003/geometry.js';
import { foldJourney, foldedGrid } from './geometry.js';

try {
  const response = await fetch('../0003/trace.json');
  if (!response.ok) throw new Error('Cannot load the source trace');
  const source = journey(await response.json());
  const canvas = document.querySelector('canvas');
  const stage = document.querySelector('#stage');
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setClearColor(0xf6f2e9);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-7,7,6,-6,.1,100);
  const controls = new OrbitControls(camera,canvas);
  controls.enablePan=false; controls.minZoom=.55; controls.maxZoom=2.5; controls.autoRotateSpeed=.35;

  const gridMaterial = new THREE.LineBasicMaterial({color:0x52615b,transparent:true,opacity:.24});
  const grid = new THREE.LineSegments(new THREE.BufferGeometry(),gridMaterial); scene.add(grid);
  const hingeMaterial = new THREE.LineBasicMaterial({color:0x293a38,transparent:true,opacity:.82});
  const hinge = new THREE.LineSegments(new THREE.BufferGeometry(),hingeMaterial); scene.add(hinge);
  const red = new THREE.MeshBasicMaterial({color:0xa23e2c});
  const segmentGeometry = new THREE.CylinderGeometry(.026,.026,1,8);
  const segments=source.slice(1).map(()=>{const mesh=new THREE.Mesh(segmentGeometry,red);scene.add(mesh);return mesh;});
  const joints=source.map(()=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(.026,8,6),red);scene.add(mesh);return mesh;});
  const marker=new THREE.Mesh(new THREE.SphereGeometry(.075,12,8),red);scene.add(marker);

  const referenceMaterial = new THREE.LineBasicMaterial({color:0xa05237,transparent:true,opacity:.16});
  const reference = new THREE.Line(new THREE.BufferGeometry().setFromPoints(source.map(s=>new THREE.Vector3(s.point[0],s.point[1],0))),referenceMaterial);
  scene.add(reference);

  const slider=document.querySelector('#step'); const play=document.querySelector('#play'); const foldSlider=document.querySelector('#fold');
  let playing=false,elapsed=0,progress=63,amount=.58,axis='x',referenceVisible=true;
  let states=foldJourney(source,amount,axis);

  function setLine(mesh,start,end) {
    const direction=end.clone().sub(start); const length=direction.length();
    mesh.visible=length>1e-12;
    if(mesh.visible){mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());mesh.scale.set(1,length,1);}
  }
  function rebuild() {
    states=foldJourney(source,amount,axis);
    const vertices=foldedGrid(amount,axis).flat();
    grid.geometry.dispose(); grid.geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    const ends=axis==='x'?[[-3,0,0],[3,0,0]]:[[0,-3,0],[0,3,0]];
    hinge.geometry.dispose();hinge.geometry=new THREE.BufferGeometry().setFromPoints(ends.map(p=>new THREE.Vector3(...p)));
    document.querySelector('#fold-value').textContent=`${Math.round(amount*100)}%`;
    document.querySelector('#relation').textContent=amount===0?'The journey is the inherited flat sigil. The hinge is present but has not moved.':amount===1?'Opposite positions can meet at closure. Their chronology remains distinct.':'Within each half, distances hold. Across the hinge, relationships contract and may meet.';
    display(progress+1);
  }
  function display(step) {
    progress=Math.max(0,Math.min(63,step-1));
    segments.forEach((mesh,i)=>{
      const fraction=Math.max(0,Math.min(1,progress-i));
      const start=new THREE.Vector3(...states[i].point);
      const end=new THREE.Vector3(...states[i+1].point).lerp(start,1-fraction);
      mesh.visible=fraction>0; if(mesh.visible)setLine(mesh,start,end);
    });
    joints.forEach((mesh,i)=>{mesh.visible=i<=Math.floor(progress);mesh.position.set(...states[i].point);});
    const next=Math.min(63,Math.floor(progress)+1),fraction=progress-Math.floor(progress);
    marker.position.set(...states[Math.floor(progress)].point).lerp(new THREE.Vector3(...states[next].point),fraction);
    slider.value=String(Math.floor(progress)+1);document.querySelector('#count').textContent=`${Math.floor(progress)+1} / 64`;
  }
  function stop(){playing=false;play.setAttribute('aria-pressed','false');play.textContent='Trace journey';}
  slider.addEventListener('input',()=>{stop();display(Number(slider.value));});
  play.addEventListener('click',()=>{if(playing){stop();return;}playing=true;elapsed=0;display(1);play.setAttribute('aria-pressed','true');play.textContent='Pause';});
  foldSlider.addEventListener('input',()=>{amount=Number(foldSlider.value)/100;rebuild();});
  document.querySelectorAll('[data-axis]').forEach(button=>button.addEventListener('click',()=>{axis=button.dataset.axis;document.querySelectorAll('[data-axis]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));rebuild();}));

  const views={relation:[9,7,12],projection:[0,0,16]};
  function select(key){const position=key==='hinge'?(axis==='x'?[14,0,.5]:[0,14,.5]):views[key];camera.position.set(...position);camera.zoom=1;camera.updateProjectionMatrix();controls.update();document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===key)));}
  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{controls.autoRotate=false;document.querySelector('#turn').setAttribute('aria-pressed','false');select(button.dataset.view);}));
  const clearView=()=>document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed','false'));
  controls.addEventListener('start',clearView);
  document.querySelector('#reference').addEventListener('click',event=>{referenceVisible=!referenceVisible;reference.visible=referenceVisible;event.currentTarget.setAttribute('aria-pressed',String(referenceVisible));});
  document.querySelector('#turn').addEventListener('click',event=>{controls.autoRotate=!controls.autoRotate;event.currentTarget.setAttribute('aria-pressed',String(controls.autoRotate));if(controls.autoRotate)clearView();});
  canvas.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();clearView();const offset=camera.position.clone();const rotationAxis=event.key==='ArrowLeft'||event.key==='ArrowRight'?camera.up.clone():new THREE.Vector3().crossVectors(camera.up,offset).normalize();offset.applyAxisAngle(rotationAxis,(event.key==='ArrowLeft'||event.key==='ArrowUp'?1:-1)*.08);camera.position.copy(offset);controls.update();});
  new ResizeObserver(()=>{const {width,height}=stage.getBoundingClientRect();const h=width<700?10:6;camera.left=-h*width/height;camera.right=-camera.left;camera.top=h;camera.bottom=-h;camera.updateProjectionMatrix();renderer.setSize(width,height);}).observe(stage);
  rebuild();select('relation');let previous;
  renderer.setAnimationLoop(now=>{const delta=previous===undefined?0:Math.min((now-previous)/1000,.1);previous=now;if(document.hidden)return;if(playing){elapsed+=delta;const step=Math.min(64,1+elapsed*4);display(step);if(step===64)stop();}controls.update(delta);renderer.render(scene,camera);});
} catch(error){const p=document.querySelector('#error');p.hidden=false;p.textContent=`Unable to open the study: ${error.message}`;console.error(error);}
