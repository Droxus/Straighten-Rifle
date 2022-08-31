
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 1000 );

const euler = new THREE.Euler( 0, 0, 0, 'YXZ' );
const vector = new THREE.Vector3();

let flyMode, speedX = 0, speedZ = 0, speedXmax, speedZmax
let sensitivity = 1

const loader = new THREE.GLTFLoader();

let model

loader.load('location.glb', (glb) => {
    if (glb){
        console.log(glb)
        model = glb.scene
        model.scale.set(1, 1, 1)
        model.position.set(0, 0, 0)
        model.castShadow = true
        scene.add(model);
    }
}, (xhr) => {
    console.log(( xhr.loaded / xhr.total * 100 ) + '% loaded');
}, (error) => {
    console.log( 'An error happened' );
})



const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild( renderer.domElement );

const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const material = new THREE.MeshStandardMaterial( { color: 0xffea2e } );
const cube = new THREE.Mesh( geometry, material );
const floor = new THREE.Mesh( new THREE.BoxGeometry( 500, 0.1, 500 ), new THREE.MeshLambertMaterial( { color: 0x4f4f4f } ) );
scene.add( cube );
scene.add(floor)
cube.position.set(0, 2, 0)
floor.position.set(0, -0.1, 0)

scene.background = new THREE.Color( 0xb0b0b0 )

const hemiLight = new THREE.HemisphereLight( 0xffeeb1, 0x080820, 4 );
scene.add( hemiLight );
const spotLight = new THREE.SpotLight( 0xffa95c,4 );
spotLight.castShadow = true;
spotLight.receiveShadow = true;
spotLight.shadow.bias = -0.0001;
spotLight.shadow.mapSize.width = 1024*16
spotLight.shadow.mapSize.height = 1024*16
scene.add( spotLight );
    spotLight.position.set(
        0,
        camera.position.y + 30,
        0,
    )

    const pointLight = new THREE.PointLight( 'white', 2, 100 );
    pointLight.position.set( 130, 50, 0 );
    pointLight.loo
    scene.add( pointLight )


renderer.toneMapping = THREE.ReinhardToneMapping
renderer.toneMappingExposure = 2.3
renderer.shadowMap.enabled = true

cube.castShadow = true;
floor.receiveShadow = true

camera.position.set(0, 2, 5)
camera.rotation.order = 'YXZ'

animate();


function animate() {
    requestAnimationFrame( animate );

    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    // gravityUpdate()
    
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
let speed = 0.2
let goForward, goBack, goLeft, goRight
let keys = {
    w: false,
    a: false,
    d: false,
    s: false,
    shift: false,
}
function onKeyboard(event){
    if (event.ctrlKey) {
        event.preventDefault();
    }  
    if (event.altKey) {
        event.preventDefault();
    }
    if (event.shiftKey){
        event.preventDefault();
    }    
    switch (event.code) {
        case 'ShiftLeft':
            if (flyMode){
                speed = 0.1
            } else {
                speed = 0.025
            }
            keys.shift = true
            break;
        case 'KeyW':
            if (!keys.w){
                goForward = setInterval(() => {
                    if (keys.a || keys.d){
                        speedZ = speed / 2
                    } else {
                        speedZ = speed
                    }
                    if (flyMode) {
                        camera.translateZ(-speedZ)
                    } else {
                        vector.setFromMatrixColumn( camera.matrix, 0 );
				        vector.crossVectors( camera.up, vector );
				        camera.position.addScaledVector( vector, speedZ );
                    }
                    getAdvancedData()
                }, 5)
                keys.w = true
            }
            break;
        case 'KeyA':
            if (!keys.a){
                speedX = 0
                goLeft = setInterval(() => {
                    // if (keys.d){
                    //     clearInterval(goLeft)
                    //     clearInterval(goRight)
                    //     keys.d = false
                    //     keys.a = false
                    // }
                    if (keys.w || keys.s){
                        speedXmax = -speed / 2
                    } else {
                        speedXmax = -speed
                    }
                    speedX === 0 ? speedX -= 0.0051 : speedX *= -1.2
                    speedX = Math.min(Math.abs(speedX), Math.abs(speedXmax))
                    if (flyMode) {
                        camera.translateX(-Math.abs(speedX))
                    } else {
                        vector.setFromMatrixColumn( camera.matrix, 0 );
				        camera.position.addScaledVector( vector, -Math.abs(speedXmax) );
                    }
                    getAdvancedData()
                }, 5)
                keys.a = true
            }
            break;
        case 'KeyD':
            if (!keys.d){
                speedX = 0
                goRight = setInterval(() => {
                    // if (keys.a){
                    //     clearInterval(goLeft)
                    //     clearInterval(goRight)
                    //     keys.d = false
                    //     keys.a = false
                    // }
                    if (keys.w || keys.s){
                        speedXmax = speed / 2
                    } else {
                        speedXmax = speed
                    }
                    speedX === 0 ? speedX += 0.005 : speedX *= 1.2
                    speedX = Math.min(speedX, speedXmax)
                    if (flyMode) {
                        camera.translateX(Math.abs(speedX))
                    } else {
                        vector.setFromMatrixColumn( camera.matrix, 0 );
				        camera.position.addScaledVector( vector, Math.abs(speedXmax) );
                    }
                    getAdvancedData()
                }, 5)
                keys.d = true
            }
            break;
        case 'KeyS':
            if (!keys.s){
                goBack = setInterval(() => {
                    if (keys.a || keys.d){
                        speedZ = speed / 2
                    } else {
                        speedZ = speed
                    }
                    if (flyMode) {
                        camera.translateZ(speedZ)
                    } else {
                        vector.setFromMatrixColumn( camera.matrix, 0 );
				        vector.crossVectors( camera.up, vector );
				        camera.position.addScaledVector( vector, -speedZ );
                    }
                    getAdvancedData()
                }, 5)
                keys.s = true
            }
            break;
        case 'Space':

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
    if (event.shiftKey){
        event.preventDefault();
    }
    // console.log(event)
    switch (event.code) {
        case 'ShiftLeft':
            if (flyMode){
                speed = 0.2
            } else {
                speed = 0.05
            }
            keys.shift = false
            break;    
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

    }
}


document.getElementById('onPlay').addEventListener('click', onPlay)

function onPlay(){
    document.getElementById('menuBg').style.display = 'none'
    flyMode = document.getElementById('playOrDevChoose').checked
    if (flyMode){
        speed = 0.2
    } else {
        speed = 0.05
    }
    speedX = 0, speedZ = 0, speedXmax = 0, speedZmax = 0
    document.querySelector('canvas').requestPointerLock = document.querySelector('canvas').requestPointerLock ||
    document.querySelector('canvas').mozRequestPointerLock ||
    document.querySelector('canvas').webkitRequestPointerLock;
    document.querySelector('canvas').requestPointerLock()
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('keydown', onKeyboard)
    window.addEventListener('keyup', offKeyboard)
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) {
        document.documentElement.msRequestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) {
        document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
    }
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
        shift: false
    }
    speed = 0.2
}
const points = [];
points.push( new THREE.Vector3( - 10, 0, 0 ) )

function onMouseMove( event ){
    const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
	const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

    euler.x -= movementY / (1 / sensitivity * 1000)
    euler.y -= movementX / (1 / sensitivity * 1000)

    euler.x = Math.max(Math.min(Math.PI/1.5, euler.x), -Math.PI/1.5)
    camera.quaternion.setFromEuler( euler );
    getAdvancedData()
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
    document.getElementById('xCords').innerText = String(camera.position.x).slice(0, 5)
    document.getElementById('zCords').innerText = String(camera.position.z).slice(0, 5)
    document.getElementById('yCords').innerText = String(camera.position.y).slice(0, 5)
    document.getElementById('povX').innerText = String(camera.rotation.x / (Math.PI * 2) * 100).slice(0, 5)
    document.getElementById('povY').innerText = String(camera.rotation.y / (Math.PI * 2) * 100).slice(0, 5)
    document.getElementById('povZ').innerText = String(camera.rotation.z / (Math.PI * 2) * 100).slice(0, 5)
    let povY = camera.rotation.y / (Math.PI * 2) - Math.floor(camera.rotation.y / (Math.PI * 2))
    if (povY > 0.875){
        document.getElementById('axis').innerText = 'x'
    } else if (povY > 0.625){
        document.getElementById('axis').innerText = '-z'
    } else if (povY > 0.375){
        document.getElementById('axis').innerText = '-x'
    } else if (povY > 0.125){
        document.getElementById('axis').innerText = 'z'
    } else {
        document.getElementById('axis').innerText = 'x'
    }
}
function gravityUpdate(){
    if (!flyMode) {
        if (camera.position.y > 2) {
            let height = camera.position.y - 2
            let g = 9.81
            let time = Math.sqrt(2*(height/g))

        }
    }
}
