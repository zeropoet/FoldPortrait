import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { journey } from '../0003/geometry.js';
import { pathFrame, transitionSample, upwardQuaternion } from './geometry.js';

try {
  const response=await fetch('../0003/trace.json');if(!response.ok)throw new Error('Cannot load the source trace');
  const states=journey(await response.json()),points=states.map(state=>state.point);
  const canvas=document.querySelector('canvas'),stage=document.querySelector('#stage');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0xf6f2e9);
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-7,7,6,-6,.1,100),controls=new OrbitControls(camera,canvas);
  controls.enablePan=false;controls.minZoom=.55;controls.maxZoom=3;controls.autoRotateSpeed=.35;
  const root=new THREE.Group();scene.add(root);root.quaternion.fromArray(upwardQuaternion(points));
  const latticeVertices=[];for(let a=-3;a<=3;a+=1.5)for(let b=-3;b<=3;b+=1.5)latticeVertices.push(-3,a,b,3,a,b,a,-3,b,a,3,b,a,b,-3,a,b,3);
  const lattice=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(latticeVertices,3)),new THREE.LineBasicMaterial({color:0x52615b,transparent:true,opacity:.12}));root.add(lattice);
  const pathGeometry=new THREE.BufferGeometry().setFromPoints(points.map(point=>new THREE.Vector3(...point)));
  const path=new THREE.Line(pathGeometry,new THREE.LineBasicMaterial({color:0xa23e2c,transparent:true,opacity:.42}));root.add(path);
  const travelled=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xa23e2c,transparent:true,opacity:.96}));root.add(travelled);
  const butterfly=new THREE.Group();root.add(butterfly);
  const bodyMaterial=new THREE.MeshBasicMaterial({color:0x3f4844}),wingMaterial=new THREE.MeshBasicMaterial({color:0xa23e2c,transparent:true,opacity:.82,side:THREE.DoubleSide});
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.055,.38,5,10),bodyMaterial);body.scale.set(1,1.4,1);butterfly.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.095,14,9),bodyMaterial);head.position.y=.34;butterfly.add(head);
  const wingShape=new THREE.Shape();wingShape.moveTo(.03,.04);wingShape.bezierCurveTo(.22,.38,.72,.49,.86,.18);wingShape.bezierCurveTo(.96,-.08,.58,-.34,.08,-.18);wingShape.lineTo(.03,.04);
  const wingGeometry=new THREE.ShapeGeometry(wingShape,18),rightPivot=new THREE.Group(),leftPivot=new THREE.Group();
  const rightWing=new THREE.Mesh(wingGeometry,wingMaterial),leftWing=new THREE.Mesh(wingGeometry,wingMaterial);leftWing.scale.x=-1;rightPivot.add(rightWing);leftPivot.add(leftWing);butterfly.add(rightPivot,leftPivot);
  const antennaMaterial=new THREE.LineBasicMaterial({color:0x3f4844,transparent:true,opacity:.8});
  for(const sign of [-1,1]){const antenna=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(sign*.025,.38,0),new THREE.Vector3(sign*.18,.62,0)]),antennaMaterial);butterfly.add(antenna);}
  const slider=document.querySelector('#step'),play=document.querySelector('#play');let progress=0,playing=false,elapsed=0,traceVisible=true,cubeVisible=true;
  function setFrame(index){const frame=pathFrame(points,index),x=new THREE.Vector3(...frame.lateral),y=new THREE.Vector3(...frame.tangent),z=new THREE.Vector3().crossVectors(x,y).normalize();butterfly.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));}
  function display(value){
    progress=Math.max(0,Math.min(63,value));const sample=transitionSample(points,progress);butterfly.position.set(...sample.point);setFrame(sample.from);
    rightPivot.rotation.y=-sample.wing;leftPivot.rotation.y=sample.wing;
    const travelledPoints=points.slice(0,sample.from+1).map(point=>new THREE.Vector3(...point));travelledPoints.push(new THREE.Vector3(...sample.point));travelled.geometry.dispose();travelled.geometry=new THREE.BufferGeometry().setFromPoints(travelledPoints);travelled.visible=traceVisible;
    path.visible=traceVisible;lattice.visible=cubeVisible;
    const exact=progress===63||sample.phase<1e-6,state=progress===63?64:sample.from+1;slider.value=String(state);document.querySelector('#count').textContent=`${state} / 64`;
    document.querySelector('#motion').textContent=exact?`State ${state}. The butterfly is fixed to the inherited path.`:`State ${sample.from+1} → ${sample.to+1}. One continuous ease, fixed to the segment.`;
    document.querySelector('#motion-key').textContent=exact?`wing pose ${state} / no inserted states`:`ease ${Math.round(sample.eased*100)}% / wing poses ${sample.from+1} → ${sample.to+1}`;
  }
  function stop(){playing=false;play.setAttribute('aria-pressed','false');play.textContent='Fly sequence';}
  slider.addEventListener('input',()=>{stop();display(Number(slider.value)-1);});play.addEventListener('click',()=>{if(playing){stop();return;}if(progress>=63)display(0);playing=true;elapsed=progress*.72;play.setAttribute('aria-pressed','true');play.textContent='Pause';});
  document.querySelector('#trace').addEventListener('click',event=>{traceVisible=!traceVisible;event.currentTarget.setAttribute('aria-pressed',String(traceVisible));display(progress);});
  document.querySelector('#cube').addEventListener('click',event=>{cubeVisible=!cubeVisible;event.currentTarget.setAttribute('aria-pressed',String(cubeVisible));display(progress);});
  const views={rise:[0,0,14],side:[13,1,2]};function select(key){camera.position.set(...views[key]);camera.zoom=key==='side'?1.25:1;camera.updateProjectionMatrix();controls.target.set(0,0,0);controls.update();document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===key)));}
  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{controls.autoRotate=false;document.querySelector('#turn').setAttribute('aria-pressed','false');select(button.dataset.view);}));
  document.querySelector('#turn').addEventListener('click',event=>{controls.autoRotate=!controls.autoRotate;event.currentTarget.setAttribute('aria-pressed',String(controls.autoRotate));});
  canvas.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const offset=camera.position.clone().sub(controls.target),axis=event.key==='ArrowLeft'||event.key==='ArrowRight'?camera.up.clone():new THREE.Vector3().crossVectors(camera.up,offset).normalize();offset.applyAxisAngle(axis,(event.key==='ArrowLeft'||event.key==='ArrowUp'?1:-1)*.08);camera.position.copy(offset.add(controls.target));controls.update();});
  new ResizeObserver(()=>{const {width,height}=stage.getBoundingClientRect(),h=width<700?10:6;camera.left=-h*width/height;camera.right=-camera.left;camera.top=h;camera.bottom=-h;camera.updateProjectionMatrix();renderer.setSize(width,height);}).observe(stage);
  display(0);select('rise');let previousTime;renderer.setAnimationLoop(now=>{const delta=previousTime===undefined?0:Math.min((now-previousTime)/1000,.1);previousTime=now;if(document.hidden)return;if(playing){elapsed+=delta;const next=Math.min(63,elapsed/.72);display(next);if(next===63)stop();}controls.update(delta);renderer.render(scene,camera);});
}catch(error){const p=document.querySelector('#error');p.hidden=false;p.textContent=`Unable to open the study: ${error.message}`;console.error(error);}
