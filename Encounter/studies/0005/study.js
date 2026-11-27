import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { journey } from '../0003/geometry.js';
import { passage, cellAt } from '../0003/rooms.js';
import { activationSequence, foldedThreshold, localFrame } from './geometry.js';

try {
  const response=await fetch('../0003/trace.json');if(!response.ok)throw new Error('Cannot load the source trace');
  const states=journey(await response.json());const points=states.map(state=>state.point);const events=activationSequence(states);
  const canvas=document.querySelector('canvas'),stage=document.querySelector('#stage');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0xf6f2e9);
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-7,7,6,-6,.1,100),controls=new OrbitControls(camera,canvas);
  controls.enablePan=false;controls.minZoom=.5;controls.maxZoom=2.7;controls.autoRotateSpeed=.3;
  const latticeVertices=[];for(let a=-3;a<=3;a+=1.5)for(let b=-3;b<=3;b+=1.5)latticeVertices.push(-3,a,b,3,a,b,a,-3,b,a,3,b,a,b,-3,a,b,3);
  scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(latticeVertices,3)),new THREE.LineBasicMaterial({color:0x52615b,transparent:true,opacity:.1})));
  const red=new THREE.MeshBasicMaterial({color:0xa23e2c}),segmentGeometry=new THREE.CylinderGeometry(.022,.022,1,8);
  const segments=points.slice(1).map(()=>{const mesh=new THREE.Mesh(segmentGeometry,red);scene.add(mesh);return mesh;});
  const marker=new THREE.Mesh(new THREE.SphereGeometry(.075,14,9),red);scene.add(marker);
  const roomGeometry=new THREE.BoxGeometry(1.5,1.5,1.5),roomEdges=new THREE.EdgesGeometry(roomGeometry),rooms=new Map();
  for(let x=0;x<4;x++)for(let y=0;y<4;y++)for(let z=0;z<4;z++){
    const fill=new THREE.Mesh(roomGeometry,new THREE.MeshBasicMaterial({color:0xc9966c,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
    const edges=new THREE.LineSegments(roomEdges,new THREE.LineBasicMaterial({color:0xa05237,transparent:true,opacity:0,depthWrite:false}));
    fill.position.set(-2.25+x*1.5,-2.25+y*1.5,-2.25+z*1.5);edges.position.copy(fill.position);scene.add(fill,edges);rooms.set(`${x},${y},${z}`,{fill,edges});
  }
  const panels=events.map(()=>{const line=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xa05237,transparent:true,opacity:.18,depthWrite:false}));scene.add(line);return line;});
  const axes=['x','y','z'].map((axis,index)=>{const colors=[0xa23e2c,0x52615b,0xc9966c];const line=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:colors[index],transparent:true,opacity:.82}));scene.add(line);return line;});
  const slider=document.querySelector('#step'),foldSlider=document.querySelector('#fold'),play=document.querySelector('#play');
  let progress=63,amount=.62,playing=false,elapsed=0,historyVisible=true,roomsVisible=true;
  function setLine(mesh,start,end){const direction=end.clone().sub(start),length=direction.length();mesh.visible=length>1e-12;if(mesh.visible){mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());mesh.scale.set(1,length,1);}}
  function display(step){
    progress=Math.max(0,Math.min(63,step-1));const index=Math.floor(progress),fraction=progress-index;
    segments.forEach((mesh,i)=>{const visible=i<index||i===index&&fraction>0;mesh.visible=visible;if(visible){const start=new THREE.Vector3(...points[i]),end=new THREE.Vector3(...points[i+1]).lerp(start,i===index?1-fraction:0);setLine(mesh,start,end);}});
    const next=Math.min(63,index+1),position=new THREE.Vector3(...points[index]).lerp(new THREE.Vector3(...points[next]),fraction);marker.position.copy(position);
    const occupied=passage(points,progress);rooms.forEach(({fill,edges},id)=>{const visits=occupied.visits.get(id)||0,active=id===occupied.active;fill.visible=edges.visible=roomsVisible&&visits>0;fill.material.opacity=active?.14:.02;edges.material.opacity=active?.75:.12;});
    const visibleEvents=events.filter(event=>event.transition-1<=progress+1e-9);panels.forEach((panel,i)=>{const event=events[i],visible=historyVisible&&event.transition-1<=progress+1e-9;panel.visible=visible;if(visible){const folded=foldedThreshold(event,amount);panel.geometry.dispose();panel.geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(folded.segments.flat(),3));panel.material.opacity=event===visibleEvents.at(-1)?.82:.15;}});
    const previous=points[Math.max(0,index-1)],current=points[index],following=points[Math.min(63,index+1)],frame=localFrame(previous,current,following);[frame.tangent,frame.transverse,frame.normal].forEach((value,i)=>axes[i].geometry.setFromPoints([position,new THREE.Vector3(...value).multiplyScalar(.62).add(position)]));
    const activeEvent=visibleEvents.at(-1),room=cellAt(occupied.marker);document.querySelector('#event').textContent=activeEvent?`State ${index+1} occupies room ${room}. Threshold ${activeEvent.id} crossed the ${['X','Y','Z'][activeEvent.axis]} boundary at ${activeEvent.plane}.`:`State ${index+1} begins in room ${room}; no threshold has been crossed.`;
    document.querySelector('#event-key').textContent=activeEvent?`event ${activeEvent.id} / local hinge / ${visibleEvents.length} revealed`:'event 0 / origin';slider.value=String(index+1);document.querySelector('#count').textContent=`${index+1} / 64`;
  }
  function stop(){playing=false;play.setAttribute('aria-pressed','false');play.textContent='Pulse sequence';}
  slider.addEventListener('input',()=>{stop();display(Number(slider.value));});play.addEventListener('click',()=>{if(playing){stop();return;}playing=true;elapsed=0;display(1);play.setAttribute('aria-pressed','true');play.textContent='Pause';});
  foldSlider.addEventListener('input',()=>{amount=Number(foldSlider.value)/100;document.querySelector('#fold-value').textContent=`${Math.round(amount*100)}%`;display(progress+1);});
  document.querySelector('#history').addEventListener('click',event=>{historyVisible=!historyVisible;event.currentTarget.setAttribute('aria-pressed',String(historyVisible));display(progress+1);});
  document.querySelector('#rooms').addEventListener('click',event=>{roomsVisible=!roomsVisible;event.currentTarget.setAttribute('aria-pressed',String(roomsVisible));display(progress+1);});
  const views={field:[10,8,12],path:[0,0,16],local:[14,2,2]};function select(key){camera.position.set(...views[key]);camera.zoom=key==='local'?1.7:1;camera.updateProjectionMatrix();controls.target.copy(marker.position);controls.update();document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===key)));}
  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{controls.autoRotate=false;document.querySelector('#turn').setAttribute('aria-pressed','false');select(button.dataset.view);}));
  document.querySelector('#turn').addEventListener('click',event=>{controls.autoRotate=!controls.autoRotate;event.currentTarget.setAttribute('aria-pressed',String(controls.autoRotate));});
  canvas.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const offset=camera.position.clone().sub(controls.target),axis=event.key==='ArrowLeft'||event.key==='ArrowRight'?camera.up.clone():new THREE.Vector3().crossVectors(camera.up,offset).normalize();offset.applyAxisAngle(axis,(event.key==='ArrowLeft'||event.key==='ArrowUp'?1:-1)*.08);camera.position.copy(offset.add(controls.target));controls.update();});
  new ResizeObserver(()=>{const {width,height}=stage.getBoundingClientRect(),h=width<700?10:6;camera.left=-h*width/height;camera.right=-camera.left;camera.top=h;camera.bottom=-h;camera.updateProjectionMatrix();renderer.setSize(width,height);}).observe(stage);
  display(64);select('field');let previousTime;renderer.setAnimationLoop(now=>{const delta=previousTime===undefined?0:Math.min((now-previousTime)/1000,.1);previousTime=now;if(document.hidden)return;if(playing){elapsed+=delta;const step=Math.min(64,1+elapsed*3);display(step);if(step===64)stop();}controls.update(delta);renderer.render(scene,camera);});
}catch(error){const p=document.querySelector('#error');p.hidden=false;p.textContent=`Unable to open the study: ${error.message}`;console.error(error);}
