import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { journey } from '../0003/geometry.js';
import { passage, cellAt } from '../0003/rooms.js';
import { activationSequence } from '../0005/geometry.js';
import { upwardQuaternion } from '../0006/geometry.js';
import { branchFragment, eventReached, spineSample } from './geometry.js';

try {
  const response=await fetch('../0003/trace.json');if(!response.ok)throw new Error('Cannot load the source trace');
  const states=journey(await response.json()),points=states.map(state=>state.point),events=activationSequence(states);
  const canvas=document.querySelector('canvas'),stage=document.querySelector('#stage'),renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0xf6f2e9);
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-7,7,6,-6,.1,100),controls=new OrbitControls(camera,canvas);controls.enablePan=false;controls.minZoom=.55;controls.maxZoom=3;controls.autoRotateSpeed=.3;
  const root=new THREE.Group();root.quaternion.fromArray(upwardQuaternion(points));scene.add(root);
  const latticeVertices=[];for(let a=-3;a<=3;a+=1.5)for(let b=-3;b<=3;b+=1.5)latticeVertices.push(-3,a,b,3,a,b,a,-3,b,a,3,b,a,b,-3,a,b,3);
  const lattice=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(latticeVertices,3)),new THREE.LineBasicMaterial({color:0x52615b,transparent:true,opacity:.08,depthWrite:false}));root.add(lattice);
  const spine=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(point=>new THREE.Vector3(...point))),new THREE.LineBasicMaterial({color:0xa23e2c,transparent:true,opacity:.24}));root.add(spine);
  const travelled=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xa23e2c,transparent:true,opacity:.9}));root.add(travelled);
  const marker=new THREE.Mesh(new THREE.SphereGeometry(.065,12,8),new THREE.MeshBasicMaterial({color:0x3f4844}));root.add(marker);
  const roomGeometry=new THREE.BoxGeometry(1.5,1.5,1.5),roomEdges=new THREE.EdgesGeometry(roomGeometry),roomMeshes=new Map();
  for(let x=0;x<4;x++)for(let y=0;y<4;y++)for(let z=0;z<4;z++){const fill=new THREE.Mesh(roomGeometry,new THREE.MeshBasicMaterial({color:0xc9966c,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})),edges=new THREE.LineSegments(roomEdges,new THREE.LineBasicMaterial({color:0xa05237,transparent:true,opacity:0,depthWrite:false}));fill.position.set(-2.25+x*1.5,-2.25+y*1.5,-2.25+z*1.5);edges.position.copy(fill.position);root.add(fill,edges);roomMeshes.set(`${x},${y},${z}`,{fill,edges});}
  const twigMaterial=new THREE.LineBasicMaterial({color:0x7d3c2e,transparent:true,opacity:.62,depthWrite:false}),twigs=events.map(event=>{const fragment=branchFragment(event),line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...fragment.start),new THREE.Vector3(...fragment.end)]),twigMaterial.clone());root.add(line);return line;});
  const slider=document.querySelector('#step'),play=document.querySelector('#play');let progress=0,playing=false,elapsed=0,pathVisible=true,roomsVisible=true,axesVisible=true;
  function display(value){
    progress=Math.max(0,Math.min(63,value));const sample=spineSample(points,progress),continuous=sample.from+sample.eased;marker.position.set(...sample.point);
    const trail=points.slice(0,sample.from+1).map(point=>new THREE.Vector3(...point));trail.push(new THREE.Vector3(...sample.point));travelled.geometry.dispose();travelled.geometry=new THREE.BufferGeometry().setFromPoints(trail);spine.visible=travelled.visible=pathVisible;
    const reached=events.filter(event=>eventReached(event,sample));twigs.forEach((twig,index)=>{twig.visible=axesVisible&&eventReached(events[index],sample);twig.material.opacity=(events[index]===reached.at(-1)) ? .92 : .52;});
    const occupied=passage(points,continuous),activeRoom=cellAt(occupied.marker);roomMeshes.forEach(({fill,edges},id)=>{const visits=occupied.visits.get(id)||0,active=id===activeRoom;fill.visible=edges.visible=roomsVisible&&visits>0;fill.material.opacity=active?.13:.018;edges.material.opacity=active?.72:.1;});lattice.visible=roomsVisible;
    const exact=progress===63||sample.phase<1e-6,state=progress===63?64:sample.from+1;slider.value=String(state);document.querySelector('#count').textContent=`${state} / 64`;
    document.querySelector('#room-state').textContent=exact?`State ${state} occupies room ${activeRoom}.`:`State ${sample.from+1} → ${sample.to+1} moves through room ${activeRoom}.`;
    document.querySelector('#axis-key').textContent=`${reached.length} threshold ${reached.length===1?'axis':'axes'} / fixed at 90°`;
  }
  function stop(){playing=false;play.setAttribute('aria-pressed','false');play.textContent='Climb spine';}slider.addEventListener('input',()=>{stop();display(Number(slider.value)-1);});play.addEventListener('click',()=>{if(playing){stop();return;}if(progress>=63)display(0);playing=true;elapsed=progress*.72;play.setAttribute('aria-pressed','true');play.textContent='Pause';});
  for(const [id,key] of [['path','pathVisible'],['rooms','roomsVisible'],['axes','axesVisible']])document.querySelector(`#${id}`).addEventListener('click',event=>{if(key==='pathVisible')pathVisible=!pathVisible;if(key==='roomsVisible')roomsVisible=!roomsVisible;if(key==='axesVisible')axesVisible=!axesVisible;event.currentTarget.setAttribute('aria-pressed',String({pathVisible,roomsVisible,axesVisible}[key]));display(progress);});
  const views={rise:[0,0,14],side:[13,1,2]};function select(key){camera.position.set(...views[key]);camera.zoom=key==='side'?1.2:1;camera.updateProjectionMatrix();controls.target.set(0,0,0);controls.update();document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===key)));}document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{controls.autoRotate=false;document.querySelector('#turn').setAttribute('aria-pressed','false');select(button.dataset.view);}));document.querySelector('#turn').addEventListener('click',event=>{controls.autoRotate=!controls.autoRotate;event.currentTarget.setAttribute('aria-pressed',String(controls.autoRotate));});
  canvas.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const offset=camera.position.clone().sub(controls.target),axis=event.key==='ArrowLeft'||event.key==='ArrowRight'?camera.up.clone():new THREE.Vector3().crossVectors(camera.up,offset).normalize();offset.applyAxisAngle(axis,(event.key==='ArrowLeft'||event.key==='ArrowUp'?1:-1)*.08);camera.position.copy(offset.add(controls.target));controls.update();});
  new ResizeObserver(()=>{const {width,height}=stage.getBoundingClientRect(),h=width<700?10:6;camera.left=-h*width/height;camera.right=-camera.left;camera.top=h;camera.bottom=-h;camera.updateProjectionMatrix();renderer.setSize(width,height);}).observe(stage);
  display(0);select('rise');let previousTime;renderer.setAnimationLoop(now=>{const delta=previousTime===undefined?0:Math.min((now-previousTime)/1000,.1);previousTime=now;if(document.hidden)return;if(playing){elapsed+=delta;const next=Math.min(63,elapsed/.72);display(next);if(next===63)stop();}controls.update(delta);renderer.render(scene,camera);});
}catch(error){const p=document.querySelector('#error');p.hidden=false;p.textContent=`Unable to open the study: ${error.message}`;console.error(error);}
