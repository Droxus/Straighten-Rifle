
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r99/three.module.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 1000 );

let WIDTH = window.innerWidth;
let HEIGHT = window.innerHeight;

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
const cube = new THREE.Mesh( geometry, material );
scene.add( cube );

camera.position.z = 5;
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
window.addEventListener('keydown', onKeyboard)
window.addEventListener('keyup', offKeyboard)

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
    // console.log(event)
    switch (event.code) {
        case 'KeyW':
            if (!keys.w){
                goForward = setInterval(() => {
                    camera.position.z -= 0.1;
                }, 10)
                keys.w = true
            }
            break;
        case 'KeyA':
            if (!keys.a){
                goLeft = setInterval(() => {
                    camera.position.x -= 0.1;
                }, 10)
                keys.a = true
            }
            break;
        case 'KeyD':
            if (!keys.d){
                goRight = setInterval(() => {
                    camera.position.x += 0.1;
                }, 10)
                keys.d = true
            }
            break;
        case 'KeyS':
            if (!keys.s){
                goBack = setInterval(() => {
                    camera.position.z += 0.1;
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
        case 'AltLeft':
            
            break;
    }
}

// window.addEventListener('mousemove', onMouseMove)

// function onMouseMove(){
//     console.log('lul')
// }