
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 1000 );

const euler = new THREE.Euler( 0, 0, 0, 'YXZ' );
const vector = new THREE.Vector3();

let modelHeight = 2

let flyMode, speedSide = 0, speedForward = 0, speedForwardmax, vSpeed = 0
let sensitivity = 1
let canJump = true, canDuckMove = true
let goDuckTimer, goDuck
let boxes = [], helpers = []
let prevPosition = {}
const loader = new THREE.GLTFLoader();

let model
let modelRealHeight

loader.load('location.glb', (glb) => {
    if (glb){
        // console.log(glb)
        model = glb.scene
        model.scale.set(1, 1, 1)
        model.position.set(0, 0, 0)
        model.castShadow = true
        scene.add(model);
        Array.from(model.children).forEach(element => {
            let box = new THREE.Box3().setFromObject( element )
            let helper = new THREE.Box3Helper( box, 'white' );
            helpers.push( helper )
            scene.add( helper )
            boxes.push({
                size: box.getSize( new THREE.Vector3() ), 
                position: box.getCenter( new THREE.Vector3() ), 
            })
        })
        // console.log(boxes)
    }
}, (xhr) => {
    // console.log(( xhr.loaded / xhr.total * 100 ) + '% loaded');
}, (error) => {
    // console.log( 'An error happened' );
})



const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild( renderer.domElement );

const cube = new THREE.Mesh( new THREE.BoxGeometry( 1, 1, 1 ), new THREE.MeshStandardMaterial( { color: 0xffea2e } ) );
cube.position.set(0, 2, 0)
const floor = new THREE.Mesh( new THREE.BoxGeometry( 500, 0.1, 500 ), new THREE.MeshLambertMaterial( { color: 0x4f4f4f } ) );
const box = new THREE.BoxHelper( cube, 'white' );
// const playerModel = new THREE.Mesh( new THREE.BoxGeometry( 1, 2, 1 ), new THREE.MeshStandardMaterial( { color: 'green' } ) );
const playerModel = new THREE.Mesh( new THREE.CylinderGeometry( 1, 1, 3, 32 ), new THREE.MeshBasicMaterial( {color: 'green' } ) );
const stairs = new THREE.Mesh( new THREE.BoxGeometry( 5, 15, 0.1 ), new THREE.MeshBasicMaterial( {color: 'white', side: THREE.DoubleSide} ) );
stairs.geometry.computeBoundingBox()
stairs.quaternion.setFromEuler( new THREE.Euler( Math.PI/4, Math.PI/2, 0, 'YXZ' ) );
stairs.position.set(135, stairs.geometry.boundingBox.max.y/Math.sqrt(2), -30)
stairs.updateMatrix()
let stairsHitBox = new THREE.Box3().setFromObject( stairs )
boxes.push({
    size:  stairsHitBox.getSize( new THREE.Vector3() ),
    position:  stairsHitBox.getCenter( new THREE.Vector3() ),
    rotation: stairs.rotation,
    type: 'stairs',
})
// let prevSize = boxes[boxes.length-1].size.x
// boxes[boxes.length-1].size.x /= Math.sqrt(2)  
// boxes[boxes.length-1].position.x -= (boxes[boxes.length-1].size.x - prevSize) / 2
let stairsHelperHitBox = new THREE.Box3Helper( stairsHitBox, 'white' );
scene.add( stairsHelperHitBox )
// if (Math.cos(euler2.y).toFixed(10) > 0){
//     boxes[boxes.length-1].size = {
//         x: stairs.geometry.parameters.width,
//         y: stairs.geometry.parameters.height,
//         z: 0
//     }
// } else {
//     boxes[boxes.length-1].size = {
//         x: stairs.geometry.parameters.height,
//         y: stairs.geometry.parameters.width,
//         z: 0
//     }
// }
console.log(stairs)
console.log(boxes[boxes.length-1])
scene.add( box );
scene.add( cube );
scene.add( floor )
scene.add( playerModel )
scene.add( stairs );

cube.position.set(0, 2, 0)
floor.position.set(0, -0.1, 0)
playerModel.position.set(118, modelHeight, -25)
playerModel.visible = false

scene.background = new THREE.Color( 'skyblue' )

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

    const pointLight = new THREE.PointLight( 'white', 4, 100 );
    pointLight.position.set( 118, 50, -2 );
    scene.add( pointLight )


renderer.toneMapping = THREE.ReinhardToneMapping
renderer.toneMappingExposure = 2.3
renderer.shadowMap.enabled = true

cube.castShadow = true;
floor.receiveShadow = true

camera.position.set(118, modelHeight, -25)
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
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

window.addEventListener('beforeunload', function(e){
        e.stopPropagation();e.preventDefault();return false;
    },true);
let speed = 0.2
let speedW = 0, speedS = 0, speedA = 0, speedD = 0
let goForward, goBack, goLeft, goRight, rotateRight, rotateLeft
let keys = {
    w: false,
    a: false,
    d: false,
    s: false,
    q: false,
    e: false,
    shift: false,
}
function onKeyboard(event){
    // console.log(event)
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
                speed = 0.03
            }
            keys.shift = true
            break;
        case 'KeyW':
            if (!keys.w){
                clearInterval(offKeyW)
                goForward = setInterval(() => {
                    prevPosition = {
                        x: camera.position.x,
                        y: camera.position.y,
                        z: camera.position.z,
                    }
                    if (keys.a || keys.d){
                        speedForward = speed / 2
                    } else {
                        speedForward = speed
                    }
                    if (flyMode) {
                        camera.translateZ(-speedForward)
                    } else {
                        vector.setFromMatrixColumn( camera.matrix, 0 );
				        vector.crossVectors( camera.up, vector );
                        
                        if (speedW < speedForward){
                            speedW += speedForward / 100
                        }

				        camera.position.addScaledVector( vector, speedW );
                        let collision = checkCollisions()
                        onCollision(collision)
                    }
                    getAdvancedData()
                }, 5)
                keys.w = true
            }
            break;
        case 'KeyA':
            if (!keys.a){
                clearInterval(offKeyA)
                goLeft = setInterval(() => {
                    prevPosition = {
                        x: camera.position.x,
                        y: camera.position.y,
                        z: camera.position.z,
                    }
                    if (keys.w || keys.s){
                        speedSide = speed / 2
                    } else {
                        speedSide = speed
                    }
                    if (flyMode) {
                        camera.translateX(-speedSide)
                    } else {
                        vector.setFromMatrixColumn( camera.matrix, 0 );
                        if (speedA < speedSide){
                            speedA += speedSide / 100
                        }
				        camera.position.addScaledVector( vector, -speedA );
                        let collision = checkCollisions()
                        onCollision(collision)
                    }
                    getAdvancedData()
                }, 5)
                keys.a = true
            }
            break;
        case 'KeyD':
            if (!keys.d){
                clearInterval(offKeyD)
                goRight = setInterval(() => {
                    prevPosition = {
                        x: camera.position.x,
                        y: camera.position.y,
                        z: camera.position.z,
                    }
                    if (keys.w || keys.s){
                        speedSide = speed / 2
                    } else {
                        speedSide = speed
                    }
                    if (flyMode) {
                        camera.translateX(speedSide)
                    } else {
                        vector.setFromMatrixColumn( camera.matrix, 0 );
                        if (speedD < speedSide){
                            speedD += speedSide / 100
                        }
				        camera.position.addScaledVector( vector, speedD );
                        let collision = checkCollisions()
                        onCollision(collision)
                    }
                    getAdvancedData()
                }, 5)
                keys.d = true
            }
            break;
        case 'KeyS':
            if (!keys.s){
                clearInterval(offKeyS)
                goBack = setInterval(() => {
                    prevPosition = {
                        x: camera.position.x,
                        y: camera.position.y,
                        z: camera.position.z,
                    }
                    if (keys.a || keys.d){
                        speedForward = speed / 2
                    } else {
                        speedForward = speed
                    }
                    if (flyMode) {
                        camera.translateZ(speedForward)
                    } else {
                        vector.setFromMatrixColumn( camera.matrix, 0 );
				        vector.crossVectors( camera.up, vector );

                        if (speedS < speedForward){
                            speedS += speedForward / 100
                        }

				        camera.position.addScaledVector( vector, -speedS );
                        let collision = checkCollisions()
                        onCollision(collision)
                    }
                    getAdvancedData()
                }, 5)
                keys.s = true
            }
            break;
        case 'Space':
            event.preventDefault();
            if (!flyMode && canJump) {
                    canJump = false
                    let G = 9.81
                    let time = 0.32185
                    let modelRealHeight = camera.position.y
                    let goJump = setInterval(() => {
                        clearInterval(offKeyS)
                        clearInterval(offKeyW)
                        clearInterval(offKeyA)
                        clearInterval(offKeyD)
                        prevPosition = {
                            x: camera.position.x,
                            y: camera.position.y,
                            z: camera.position.z,
                        }
                        if (speedS > 0 && !keys.s){
                            vector.setFromMatrixColumn( camera.matrix, 0 );
                            vector.crossVectors( camera.up, vector );
                            camera.position.addScaledVector( vector, -speedS );
                        }
                        if (speedW > 0 && !keys.w){
                            vector.setFromMatrixColumn( camera.matrix, 0 );
                            vector.crossVectors( camera.up, vector );
                            camera.position.addScaledVector( vector, speedW );
                        }
                        if (speedA > 0 && !keys.a){
                            vector.setFromMatrixColumn( camera.matrix, 0 );
                            camera.position.addScaledVector( vector, -speedA );
                        }
                        if (speedD > 0 && !keys.d){
                            vector.setFromMatrixColumn( camera.matrix, 0 );
                            camera.position.addScaledVector( vector, speedD );
                        }
                                let collision = checkCollisions()
                                onCollision(collision)
                        time -= 0.005
                        if (Math.floor(camera.position.y * 100) < modelRealHeight * 100 + 200){
                            vSpeed = G * (time/50)
                            camera.position.y += Math.abs(vSpeed)
                        } else {
                            clearInterval(goJump)
                            canJump = true
                            gravityUpdate()
                        }
                        getAdvancedData()
                    }, 5)
            }
            break;
        case 'ControlLeft':
            if (!flyMode && canDuckMove ){
                let prevModelHeight = modelHeight 
                goDuck = setInterval(() => {
                    modelHeight -= (prevModelHeight / 2) / 25
                    camera.position.y -= (prevModelHeight / 2) / 25
                    getAdvancedData()
                }, 5)
                goDuckTimer = setTimeout(() => {
                    speed = 0.025
                    clearInterval(goDuck)
                }, 125)
                canDuckMove = false
            }
            break;
        case 'KeyQ':
            if (!keys.q){
                keys.q = true
            clearInterval(offKeyQ)
            clearInterval(rotateRight)
            rotateLeft = setInterval(() => {
                if (camera.rotation.z < 0.5){
                    camera.rotation.z += 0.01
                    euler.z = camera.rotation.z
                } 
                else if (camera.rotation.z > 0.5){
                    camera.rotation.z += -0.01
                    euler.z = camera.rotation.z
                } 
                else {
                    clearInterval(rotateLeft)
                }
            }, 5)
        }
            break;
        case 'KeyE':
            if (!keys.e){
                keys.e = true
            clearInterval(offKeyE)
            clearInterval(rotateLeft)
            rotateRight = setInterval(() => {
                if (camera.rotation.z > -0.5){
                    camera.rotation.z += -0.01
                    euler.z = camera.rotation.z
                } 
                else if (camera.rotation.z < 0.5){
                    camera.rotation.z += 0.01
                    euler.z = camera.rotation.z
                }
                else {
                    clearInterval(rotateRight)
                }
            }, 5)
        }
            break;
    }
}
let offKeyW, offKeyS, offKeyA, offKeyD, offKeyQ, offKeyE
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
            offKeyW = setInterval(keyWInertia, 5)

            break;
        case 'KeyA':
            clearInterval(goLeft)
            keys.a = false
            offKeyA = setInterval(keyAInertia, 5)
            break;
        case 'KeyD':
            clearInterval(goRight)
            keys.d = false
            offKeyD = setInterval(keyDInertia, 5)
            break;
        case 'KeyS':
            clearInterval(goBack)
            keys.s = false

            offKeyS = setInterval(keySInertia, 5)
            break;
        case 'ControlLeft':
            if (!flyMode && !canDuckMove){
                clearInterval(goDuck)
                clearTimeout(goDuckTimer)
                let prevmodelHeight = 1
                goDuck = setInterval(() => {
                    if (modelHeight < 2){
                        camera.position.y += prevmodelHeight / 25
                        modelHeight += prevmodelHeight / 25
                    } else {
                        canDuckMove = true
                        speed = 0.05
                        clearInterval(goDuck)
                    }
                    getAdvancedData()
                }, 5)
            }
            break;
        case 'F2':
            onAdvancedInfo()
            if (helpers[0].visible){
                helpers.forEach(element => element.visible = false)
            } else {
                helpers.forEach(element => element.visible = true)
            }
            
            break;
        case 'KeyQ':
                clearInterval(rotateLeft)
                keys.q = false
                offKeyQ = setInterval(() => {
                    if (camera.rotation.z > 0){
                        camera.rotation.z += -0.01
                        euler.z = camera.rotation.z
                    } else {
                        clearInterval(offKeyQ)
                    }
                }, 5)
            break;
        case 'KeyE':
                clearInterval(rotateRight)
                keys.e = false
                offKeyE = setInterval(() => {
                    if (camera.rotation.z < 0){
                        camera.rotation.z += 0.01
                        euler.z = camera.rotation.z
                    } else {
                        clearInterval(offKeyE)
                    }
                }, 5)
            break;
    }
}
function keyWInertia(){
    prevPosition = {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
    }
    if (keys.a || keys.d){
        speedForward = speed / 2
    } else {
        speedForward = speed
    }
    if (flyMode) {
        camera.translateZ(-speedForward)
    } else {
        vector.setFromMatrixColumn( camera.matrix, 0 );
        vector.crossVectors( camera.up, vector );
        speedW -= speedForward / 50
        camera.position.addScaledVector( vector, speedW );
        let collision = checkCollisions()
        onCollision(collision)
    }
    getAdvancedData()
    if (speedW <= 0){
        speedW = 0
      clearInterval(offKeyW)  
    }
}
function keySInertia(){
        prevPosition = {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z,
        }
        if (keys.a || keys.d){
            speedForward = speed / 2
        } else {
            speedForward = speed
        }
        if (flyMode) {
            camera.translateZ(speedForward)
        } else {
            vector.setFromMatrixColumn( camera.matrix, 0 );
            vector.crossVectors( camera.up, vector );

            speedS -= speedForward / 50

            camera.position.addScaledVector( vector, -speedS );
            let collision = checkCollisions()
            onCollision(collision)
        }

        getAdvancedData()
        if (speedS <= 0){
            speedS = 0
            clearInterval(offKeyS)  
          }
}
function keyAInertia(){
        prevPosition = {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z,
        }
        if (keys.w || keys.s){
            speedSide = speed / 2
        } else {
            speedSide = speed
        }
        if (flyMode) {
            camera.translateX(-speedSide)
        } else {
            vector.setFromMatrixColumn( camera.matrix, 0 );
            speedA -= speedSide / 50
            camera.position.addScaledVector( vector, -speedA );
            let collision = checkCollisions()
            onCollision(collision)
        }
        getAdvancedData()
        if (speedA <= 0){
            speedA = 0
            clearInterval(offKeyA)  
        }
}
function keyDInertia(){
        prevPosition = {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z,
        }
        if (keys.w || keys.s){
            speedSide = speed / 2
        } else {
            speedSide = speed
        }
        if (flyMode) {
            camera.translateX(-speedSide)
        } else {
            vector.setFromMatrixColumn( camera.matrix, 0 );
            speedD -= speedSide / 50
            camera.position.addScaledVector( vector, speedD );
            let collision = checkCollisions()
            onCollision(collision)
        }
        getAdvancedData()
        if (speedD <= 0){
            speedD = 0
            clearInterval(offKeyD)  
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
    speedSide = 0, speedForward = 0, speedSide = 0, speedForwardmax = 0
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
    gravityUpdate()
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
    if (!flyMode && canJump) {
        if (Math.floor(camera.position.y * 100) > modelHeight * 100) {
            console.log('what')
            let playerHitBox = {
                size: playerModel.geometry.boundingBox.getSize( new THREE.Vector3() ),
                position: playerModel.position, 
            }
            canJump = false
            let G = -9.81
            let time = 0
            let goDown = setInterval(() => {
                clearInterval(offKeyS)
                        clearInterval(offKeyW)
                        clearInterval(offKeyA)
                        clearInterval(offKeyD)
                if (speedS > 0 && !keys.s){
                    vector.setFromMatrixColumn( camera.matrix, 0 );
                    vector.crossVectors( camera.up, vector );
                    camera.position.addScaledVector( vector, -speedS );
                }
                if (speedW > 0 && !keys.w){
                    vector.setFromMatrixColumn( camera.matrix, 0 );
                    vector.crossVectors( camera.up, vector );
                    camera.position.addScaledVector( vector, speedW );
                }
                if (speedA > 0 && !keys.a){
                    vector.setFromMatrixColumn( camera.matrix, 0 );
                    camera.position.addScaledVector( vector, -speedA );
                }
                if (speedD > 0 && !keys.d){
                    vector.setFromMatrixColumn( camera.matrix, 0 );
                    camera.position.addScaledVector( vector, speedD );
                }
                let collision = checkCollisions()
                onCollision(collision)
                time += 0.005
                let possibleJumpTargets = []
                for (let i = 0; i < boxes.length; i++){
                    if ((camera.position.x - (playerHitBox.size.x/2) <= (boxes[i].position.x + (boxes[i].size.x/2)) && camera.position.x + (playerHitBox.size.x/2) >= (boxes[i].position.x - (boxes[i].size.x/2))) &&
                    (camera.position.z - (playerHitBox.size.z/2) <= (boxes[i].position.z + (boxes[i].size.z/2)) && camera.position.z + (playerHitBox.size.z/2) >= (boxes[i].position.z - (boxes[i].size.z/2)))){
                        let isStairs
                        if (boxes[i].type === 'stairs'){
                            if (boxes[i].rotation.y <= Math.PI/4){
                                let needbleHeight = ((camera.position.x + (playerHitBox.size.x/2)) - (boxes[i].position.x - (boxes[i].size.x/2))) / Math.tan(boxes[i].rotation.y)
                                possibleJumpTargets.push(needbleHeight + modelHeight)
                                isStairs = true
                                // if (needbleHeight < (camera.position.y - 1)){
                                // }
                            }
                        } 
                        if (!isStairs && (camera.position.y-0.9) > (boxes[i].position.y + (boxes[i].size.y/2))){
                                possibleJumpTargets.push(boxes[i].position.y + (boxes[i].size.y/2) + modelHeight)
                        }
                    }
                }
                if (possibleJumpTargets.length > 0){
                    modelRealHeight = Math.max.apply(2, possibleJumpTargets);
                } else {
                    modelRealHeight = 2 
                }
                // console.log(modelRealHeight)
                if (Math.floor(camera.position.y * 100) > modelRealHeight * 100){
                    vSpeed = G * (time/75)
                    camera.position.y += vSpeed
                } else {
                    canJump = true
                    camera.position.y = modelRealHeight
                    if (!keys.a && speedA > 0){
                        offKeyA = setInterval(keyAInertia, 5)
                    }
                    if (!keys.s && speedS > 0){
                        offKeyS = setInterval(keySInertia, 5)
                    }
                    if (!keys.w && speedW > 0){
                        offKeyW = setInterval(keyWInertia, 5)
                    }
                    if (!keys.d && speedD > 0){
                        offKeyD = setInterval(keyDInertia, 5)
                    }
                    clearInterval(goDown)
                }
                getAdvancedData()
            }, 5)
        }
    }
}
function checkCollisions(){
    // console.log(model.children)
    playerModel.position.set(camera.position.x, camera.position.y, camera.position.z)
    playerModel.geometry.computeBoundingBox()
    let playerHitBox = {
        size: playerModel.geometry.boundingBox.getSize( new THREE.Vector3() ),
        position: playerModel.position, 
    }
    // console.log(playerHitBox)
    let haveCollision = []
    let possibleJumpTargets = []
    let isStairs
    for (let i = 0; i < boxes.length; i++){
        if ((camera.position.x - (playerHitBox.size.x/2) <= (boxes[i].position.x + (boxes[i].size.x/2)) && camera.position.x + (playerHitBox.size.x/2) >= (boxes[i].position.x - (boxes[i].size.x/2))) &&
        (camera.position.z - (playerHitBox.size.z/2) <= (boxes[i].position.z + (boxes[i].size.z/2)) && camera.position.z + (playerHitBox.size.z/2) >= (boxes[i].position.z - (boxes[i].size.z/2)))){
            if ((camera.position.y-0.9) > (boxes[i].position.y + (boxes[i].size.y/2))){
                if (boxes[i].type === 'stairs' && canJump){
                    if (boxes[i].rotation.y <= Math.PI/4){
                        let needbleHeight = ((camera.position.x + (playerHitBox.size.x/2)) - (boxes[i].position.x - (boxes[i].size.x/2))) / Math.tan(boxes[i].rotation.y)
                        if (needbleHeight < (camera.position.y - 1)){
                            possibleJumpTargets.push(needbleHeight + modelHeight)
                            isStairs = true
                        }
                    }
                } 
                 if (!isStairs) {
                    possibleJumpTargets.push(boxes[i].position.y + (boxes[i].size.y/2) + modelHeight)
                }
                // console.log('up')
            } else {
                haveCollision.push(boxes[i])
                // console.log('down')
                if (boxes[i].rotation !== undefined){
                    if (boxes[i].rotation.y <= Math.PI/4){
                        let needbleHeight = ((camera.position.x + (playerHitBox.size.x/2)) - (boxes[i].position.x - (boxes[i].size.x/2))) / Math.tan(boxes[i].rotation.y)
                        if (boxes[i].type === 'stairs'){
                            if (canJump){
                                if (needbleHeight < (camera.position.y - 1)){
                                    possibleJumpTargets.push(needbleHeight + modelHeight)
                                }
                            } else {
                                possibleJumpTargets.push(modelRealHeight + modelHeight)
                            }
                        }
                    }
                }
            }
        }
    }
    if (canJump && possibleJumpTargets.length > 0){
        
        let possibleHeight = Math.max.apply(2, possibleJumpTargets)
        if (possibleHeight + modelHeight/10 < camera.position.y){
            gravityUpdate()
        } else {
            camera.position.y = possibleHeight;
        }
    }
    if (canJump && possibleJumpTargets.length < 1){
        
            camera.position.y = 2
    }
    return haveCollision
}
function onCollision(collisions){
    playerModel.position.set(camera.position.x, camera.position.y, camera.position.z)
    playerModel.geometry.computeBoundingBox()
    let playerHitBox = {
        size: playerModel.geometry.boundingBox.getSize( new THREE.Vector3() ),
        position: playerModel.position, 
    }
    for (let collision of collisions){
        if (collision){
            if ((camera.position.x - (playerHitBox.size.x/2) <= (collision.position.x + (collision.size.x/2)) && camera.position.x + (playerHitBox.size.x/2) >= (collision.position.x - (collision.size.x/2))) &&
            (camera.position.z - (playerHitBox.size.z/2) <= (collision.position.z + (collision.size.z/2) + (playerHitBox.size.z/2)) && camera.position.z + (playerHitBox.size.z/2) >= (collision.position.z - (collision.size.z/2)))){
                if ((camera.position.y-0.9) >= (collision.position.y + (collision.size.y/2))){
                } else {
                    let isStairs, needbleHeight
                    if (collision.type === 'stairs'){
                        if (collision.rotation.y <= Math.PI/4){
                            needbleHeight = ((camera.position.x + (playerHitBox.size.x/2)) - (collision.position.x - (collision.size.x/2))) / Math.tan(collision.rotation.y)
                            isStairs = true
                            // if (needbleHeight < (camera.position.y - 1)){
                            //     // console.log(needbleHeight)
                            // }
                        }
                    } 
                    if (!isStairs){
                        console.log('aaa')
                        if (prevPosition.x + (playerHitBox.size.x/2)  <= (collision.position.x + (collision.size.x/2)) && prevPosition.x - (playerHitBox.size.x/2) >= (collision.position.x - (collision.size.x/2)) && 
                        prevPosition.z + (playerHitBox.size.z/2) <= (collision.position.z + (collision.size.z/2)) && prevPosition.z - (playerHitBox.size.z/2) >= (collision.position.z - (collision.size.z/2))){
                            camera.position.z = prevPosition.z
                            camera.position.x = prevPosition.x
                        } else 
                        if (prevPosition.x - (playerHitBox.size.x/2) <= (collision.position.x + (collision.size.x/2)) && prevPosition.x + (playerHitBox.size.x/2) >= (collision.position.x - (collision.size.x/2))){
                            camera.position.z = prevPosition.z
                            if (!keys.a && !canJump){
                                speedA = 0
                            }
                            if (!keys.s && !canJump){
                                speedS = 0
                            }
                            if (!keys.w && !canJump){
                                speedW = 0
                            }
                            if (!keys.d && !canJump){
                                speedD = 0
                            }
                        } else if (prevPosition.z - (playerHitBox.size.x/2) <= (collision.position.z + (collision.size.z/2)) && prevPosition.z + (playerHitBox.size.x/2) >= (collision.position.z - (collision.size.z/2))){
                            camera.position.x = prevPosition.x
                            if (!keys.a && !canJump){
                                speedA = 0
                            }
                            if (!keys.s && !canJump){
                                speedS = 0
                            }
                            if (!keys.w && !canJump){
                                speedW = 0
                            }
                            if (!keys.d && !canJump){
                                speedD = 0
                            }
                        }
                    }
                }
            }
        }
    }
}