
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r99/three.module.js';
// import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 1000 );
let sensitivity = 1

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild( renderer.domElement );

const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const material = new THREE.MeshStandardMaterial( { color: 0xffea2e } );
const cube = new THREE.Mesh( geometry, material );
const floor = new THREE.Mesh( new THREE.BoxGeometry( 100, 0.1, 100 ), new THREE.MeshStandardMaterial( { color: 0x787878 } ) );
scene.add( cube );
scene.add(floor)
cube.position.set(0, 2, 0)
floor.position.set(0, -1, 0)


const light = new THREE.DirectionalLight( 'transparent', 1 );
// const light = new THREE.SpotLight( 0xffffff );
// const light = new THREE.PointLight( 'grey', 1, 100 );
light.position.set( 0, 100, 0 );
light.castShadow = true; 
scene.add( light );


light.target = cube;

light.shadow.mapSize.width = 512;
light.shadow.mapSize.height = 512;
light.shadow.camera.near = 0.5; 
light.shadow.camera.far = 500;

cube.castShadow = true;
floor.receiveShadow = true

camera.position.z = 5;
camera.rotation.order = 'YXZ'
animate();


function animate() {
    requestAnimationFrame( animate );

    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    renderer.render( scene, camera );
};

window.addEventListener('resize', onResize)
document.oncontextmenu = document.body.oncontextmenu = function() {return false;}

function onResize(){
    console.log()
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

window.addEventListener('beforeunload', function(e){
        e.stopPropagation();e.preventDefault();return false;
    },true);
let goForward, goBack, goLeft, goRight
let keys = {
    w: false,
    a: false,
    d: false,
    s: false,
}
function onKeyboard(event){
    if (event.ctrlKey) {
        event.preventDefault();
    }  
    if (event.altKey) {
        event.preventDefault();
    }    
    switch (event.code) {
        case 'KeyW':
            if (!keys.w){
                goForward = setInterval(() => {
                    camera.translateZ(-0.1)
                    getAdvancedData()
                }, 10)
                keys.w = true
            }
            break;
        case 'KeyA':
            if (!keys.a){
                goLeft = setInterval(() => {
                    camera.translateX(-0.1)
                    getAdvancedData()
                }, 10)
                keys.a = true
            }
            break;
        case 'KeyD':
            if (!keys.d){
                goRight = setInterval(() => {
                    camera.translateX(0.1)
                    getAdvancedData()
                }, 10)
                keys.d = true
            }
            break;
        case 'KeyS':
            if (!keys.s){
                goBack = setInterval(() => {
                    camera.translateZ(0.1)
                    getAdvancedData()
                }, 10)
                keys.s = true
            }
            break;
        case 'Space':

            break;
        case 'AltLeft':
            
            break;
    }
}
function offKeyboard(event){
    if (event.ctrlKey) {
        event.preventDefault();
    }  
    if (event.altKey) {
        event.preventDefault();
    }    
    // console.log(event)
    switch (event.code) {
        case 'KeyW':
            clearInterval(goForward)
            keys.w = false
            break;
        case 'KeyA':
            clearInterval(goLeft)
            keys.a = false
            break;
        case 'KeyD':
            clearInterval(goRight)
            keys.d = false
            break;
        case 'KeyS':
            clearInterval(goBack)
            keys.s = false
            break;
        case 'Space':

            break;
        case 'F2':
            onAdvancedInfo()
            break;
        case 'AltLeft':
            
            break;
    }
}


document.getElementById('onPlay').addEventListener('click', onPlay)

function onPlay(){
    document.getElementById('menuBg').style.display = 'none'
    document.querySelector('canvas').requestPointerLock = document.querySelector('canvas').requestPointerLock ||
    document.querySelector('canvas').mozRequestPointerLock ||
    document.querySelector('canvas').webkitRequestPointerLock;
    document.querySelector('canvas').requestPointerLock()
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('keydown', onKeyboard)
    window.addEventListener('keyup', offKeyboard)
}
function onMenu(){
    document.getElementById('onPlay').removeEventListener('click', onPlay)
    document.getElementById('menuBg').style.display = 'grid'
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('keydown', onKeyboard)
    window.removeEventListener('keyup', offKeyboard)
    setTimeout(() => {document.getElementById('onPlay').addEventListener('click', onPlay)}, 2500)
    clearInterval(goForward)
    clearInterval(goLeft)
    clearInterval(goRight)
    clearInterval(goBack)
    keys = {
        w: false,
        a: false,
        d: false,
        s: false,
    }
}

function onMouseMove(event){
    camera.rotation.x -= event.movementY / (1 / sensitivity * 1000)
    camera.rotation.y -= event.movementX / (1 / sensitivity * 1000)

    document.getElementById('povX').innerText = camera.rotation.x
    document.getElementById('povY').innerText = camera.rotation.y
    document.getElementById('povZ').innerText = camera.rotation.z
}

document.addEventListener('pointerlockerror', lockError, false);
document.addEventListener('mozpointerlockerror', lockError, false);
document.addEventListener('webkitpointerlockerror', lockError, false);

function lockError(e) {
    document.getElementById('menuBg').style.display = 'grid'
}

if ("onpointerlockchange" in document) {
    document.addEventListener('pointerlockchange', lockChangeAlert, false);
  } else if ("onmozpointerlockchange" in document) {
    document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
  } else if ("onwebkitpointerlockchange" in document) {
    document.addEventListener('webkitpointerlockchange', lockChangeAlert, false);
  }
  
  function lockChangeAlert() {
    if(document.pointerLockElement === document.querySelector('canvas') ||
    document.mozPointerLockElement === document.querySelector('canvas') ||
    document.webkitPointerLockElement === document.querySelector('canvas')) {

    } else {
        onMenu()
    }
  }
  function onAdvancedInfo(){
    if (document.getElementById('advancedInfoBlock').style.display !== 'none'){
        document.getElementById('advancedInfoBlock').style.display = 'none'
    } else {
        document.getElementById('advancedInfoBlock').style.display = 'grid'
    }
  }
document.getElementById('sensSilder').addEventListener('input', onSensSilder)
document.getElementById('sensInp').addEventListener('input', onSensInp)
function onSensSilder(){
    document.getElementById('sensInp').value = document.getElementById('sensSilder').value / 10
    sensitivity = document.getElementById('sensInp').value
}
function onSensInp(){
    document.getElementById('sensSilder').value = document.getElementById('sensInp').value * 10
    sensitivity = document.getElementById('sensInp').value
}
function getAdvancedData(){
    document.getElementById('xCords').innerText = camera.position.x
    document.getElementById('zCords').innerText = camera.position.z
    document.getElementById('yCords').innerText = camera.position.y
    document.getElementById('povX').innerText = camera.rotation.x
    document.getElementById('povY').innerText = camera.rotation.y
    document.getElementById('povZ').innerText = camera.rotation.z
}


var sky = new THREE.Mesh(new THREE.SphereGeometry(500, 0, 0), new THREE.MeshBasicMaterial({ color: 0xb0b0b0 }));
sky.material.side = THREE.BackSide;
scene.add(sky);