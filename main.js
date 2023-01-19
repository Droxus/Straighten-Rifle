
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 1000 );

const euler = new THREE.Euler( 0, 0, 0, 'YXZ' );
const vector = new THREE.Vector3();

let sky, sun;
function initSky() {
    sky = new Sky();
    sky.scale.setScalar( 4500 );
    scene.add( sky );

    sun = new THREE.Vector3();
    sky.material.uniforms[ 'turbidity' ].value = 10;
    sky.material.uniforms[ 'rayleigh' ].value = 4;
    sky.material.uniforms[ 'mieCoefficient' ].value = 0.05;
    sky.material.uniforms[ 'mieDirectionalG' ].value = 1;

	const phi = THREE.MathUtils.degToRad( 90 );
	const theta = THREE.MathUtils.degToRad( 90 );

	sun.setFromSphericalCoords( 1, phi, theta );

	sky.material.uniforms[ 'sunPosition' ].value.copy( sun );
}
const world = new CANNON.World()
world.gravity.set(0, -9.8, 0) 

var upVector = new CANNON.Vec3(0, 1, 0);
var contactNormal = new CANNON.Vec3(0, 0, 0);

let player = {
    speed: {
        x: 0,
        y: 0,
        z: 0
    },
    maxSpeed: {
        horizontal: 0,
        vertical: 0
    },
    position: {
        x: 0,
        y: 0,
        z: 0
    },
    isFlying: false,
    flyMode: false
}
let removeBody
let modelHeight = 3
let flyMode, speedSide = 0, speedForward = 0, speedForwardmax, vSpeed = 0
let sensitivity = 1
let boxes = [], helpers = [], modelBodies = [], bulletsBody = [], bullets = []
let prevPosition = {}
const loader = new THREE.GLTFLoader();
let model, sniperRifle
   loader.load('aimmap.glb', (glb) =>  {
        if (glb){
            console.log(glb.scene)
            model = glb.scene
            model.scale.set(1, 1, 1)
            model.position.set(0, 0, 0)
            model.rotation.set(0, 0, 0)
            model.castShadow = true
            scene.add(model);
            model.children.forEach(child => {
                let box = new THREE.Box3;
                box.setFromObject(child);
                const bbox = new THREE.LineSegments( new THREE.EdgesGeometry( new THREE.BoxGeometry( child.scale.x * 2 + 0.02, child.scale.y * 2 + 0.02, child.scale.z * 2 + 0.02 ) ), new THREE.LineBasicMaterial( { color: '#ff5900' } ) );
                bbox.position.set(child.position.x, child.position.y , child.position.z)
                bbox.rotation.set(child.rotation.x, child.rotation.y , child.rotation.z)
                scene.add(bbox);
                let modelBody = new CANNON.Body({
                    mass: 0,
                    position: new CANNON.Vec3((box.max.x+box.min.x)/2, (box.max.y+box.min.y)/2, (box.max.z+box.min.z)/2),
                    shape: new CANNON.Box( new CANNON.Vec3(child.scale.x, child.scale.y, child.scale.z))
                })
                modelBody.quaternion.set(child.quaternion.x, child.quaternion.y, child.quaternion.z, child.quaternion.w)
                modelBody.quaternion.normalize()
                world.addBody(modelBody)
                modelBodies.push(modelBody)
            })
            model.updateMatrixWorld( true )
        }})        
        loader.load('bobs_sniper-rifle.glb', (glb) =>  {
            if (glb){
                scene.add(glb.scene)
                sniperRifle = glb.scene
                sniperRifle.position.set(0, 5, 0)
                // camera.attach(sniperRifle)
                // sniperRifle.position.set(5, 5, 5)
                // console.log(sniperRifle.position)
                // console.log(sniperRifle)
            }
        })
const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild( renderer.domElement );
var playerModelBody = new CANNON.Body({
    mass: 10,
    position: new CANNON.Vec3(0, 2, 0),
    shape: new CANNON.Box( new CANNON.Vec3(1, 2, 1) ),
    fixedRotation: true,
    type: CANNON.DYNAMIC
})
playerModelBody.mass = 0;
playerModelBody.updateMassProperties();
world.addBody(playerModelBody)
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );
renderer.shadowMap.enabled = true;

let cube = new THREE.Mesh( new THREE.BoxGeometry(500, 0.01, 500), new THREE.MeshBasicMaterial( { color: '#2b2b2b' } ) );
scene.add( cube );

const stats = Stats()
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( stats.dom );
let groundBody = new CANNON.Body({
    mass: 0
}) 
let groundShape = new CANNON.Plane(0.1, 0.2) 
groundBody.addShape(groundShape) 
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2) 
world.addBody(groundBody) 
    const directionalLight1 = new THREE.DirectionalLight( '#ffffff', 0.2 );
    directionalLight1.position.set(0, 200, 200)
    scene.add( directionalLight1 );
    directionalLight1.castShadow = true;
    directionalLight1.receiveShadow = true;
    const directionalLight2 = new THREE.DirectionalLight( '#ffffff', 0.2 );
    directionalLight2.position.set(0, 200, -200)
    scene.add( directionalLight2 );
    directionalLight2.castShadow = true;
    directionalLight2.receiveShadow = true;
    const directionalLight3 = new THREE.DirectionalLight( '#ffffff', 0.2 );
    directionalLight3.position.set(200, 200, 0)
    scene.add( directionalLight3 );
    directionalLight3.castShadow = true;
    directionalLight3.receiveShadow = true;
    const directionalLight4 = new THREE.DirectionalLight( '#ffffff', 0.2 );
    directionalLight4.position.set(-200, 200, 0)
    scene.add( directionalLight4 );
    directionalLight4.castShadow = true;
    directionalLight4.receiveShadow = true;
renderer.toneMapping = THREE.LinearToneMapping
renderer.toneMappingExposure = 1
renderer.shadowMap.enabled = true

const renderPass = new THREE.RenderPass( scene, camera );
const composer = new THREE.EffectComposer( renderer )
composer.addPass( renderPass );
const bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.1,
    0.1,
    0.2
)
composer.addPass( bloomPass );
bloomPass.stength = 3;
bloomPass.radius = 1;
bloomPass.threshold = 0

camera.position.set(10, modelHeight, 25)
camera.rotation.order = 'YXZ'

// const cannonDebugRenderer = new THREE.CannonDebugRenderer(scene, world)
let prevposition = playerModelBody.position.y
initSky()
animate();
function animate() {
    composer.render()
    requestAnimationFrame(animate)
    stats.update()
    if(removeBody) world.remove(removeBody)
    world.step(1 / 60)
    // cannonDebugRenderer.update()
    player.isFlying = Math.round(prevposition * 100) - Math.round(playerModelBody.position.y * 100) !== 0
    prevposition = playerModelBody.position.y

    if (!player.flyMode){
        camera.position.x = playerModelBody.position.x
        camera.position.y = playerModelBody.position.y + playerModelBody.shapes[0].halfExtents.y
        camera.position.z = playerModelBody.position.z
    }

    bullets.forEach((bullet, i) => {
        bullet.position.copy( bulletsBody[i].position )
    })

    if (sniperRifle){
        sniperRifle.position.x = camera.position.x - Math.sin(camera.rotation.y - 0.4) * 1.5
        sniperRifle.position.z = camera.position.z + Math.cos(Math.PI - camera.rotation.y + 0.4) * 1.5
        sniperRifle.position.y = camera.position.y + Math.min(Math.max((Math.tan(camera.rotation.x + 0.1) - 0.5), -2), 2)
        sniperRifle.quaternion.copy(camera.quaternion)
    }

    getAdvancedData()

    stats.begin()
    renderer.render( scene, camera );
    stats.end()
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
let keys = {
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false,
    KeyQ: false,
    KeyE: false,
    ShiftLeft: false,
    ControlLeft: false,
    Space: false
}
let smoothlyMove, smoothlyJump
function playerMove(){
    clearInterval( smoothlyMove )
    smoothlyMove = setInterval(() => {
        if (Math.abs(player.speed.x) + Math.abs(player.speed.z) > player.maxSpeed.horizontal){
            player.speed.x = Math.abs(player.speed.x) > player.maxSpeed.horizontal / 2 ? player.speed.x / 2 : player.speed.x
            player.speed.z = Math.abs(player.speed.z) > player.maxSpeed.horizontal / 2 ? player.speed.z / 2 : player.speed.z
        } else {
            player.speed.x = Math.abs(player.speed.x) > 0 ? player.maxSpeed.horizontal * (player.speed.x / Math.abs(player.speed.x)) : player.speed.x
            player.speed.z = Math.abs(player.speed.z) > 0 ? player.maxSpeed.horizontal * (player.speed.z / Math.abs(player.speed.z)) : player.speed.z
        }
        if (player.speed.x !== 0 || player.speed.y !== 0 || player.speed.z !== 0){
            if (player.flyMode){
                camera.translateZ( -player.speed.z * 20 )
                camera.translateX( player.speed.x * 20 )
            } else {
                if (player.speed.z > 0){
                    playerModelBody.position.x += Math.sin(camera.rotation.y) * -player.speed.z + playerModelBody.velocity.x / 20
                    playerModelBody.position.z += Math.cos(Math.PI - camera.rotation.y) * player.speed.z + playerModelBody.velocity.z / 20
                }
                if (player.speed.z < 0){
                    playerModelBody.position.x += Math.sin(camera.rotation.y) * -player.speed.z + playerModelBody.velocity.x / 20
                    playerModelBody.position.z += -Math.cos(camera.rotation.y) * player.speed.z + playerModelBody.velocity.z / 20
                    
                }
                if (player.speed.x > 0){
                    playerModelBody.position.x += Math.sin(camera.rotation.y + Math.PI / 2) * player.speed.x + playerModelBody.velocity.x / 20
                    playerModelBody.position.z += -Math.cos(camera.rotation.y + Math.PI / 2) * -player.speed.x + playerModelBody.velocity.z / 20
                }
                if (player.speed.x < 0){
                    playerModelBody.position.x += Math.sin(camera.rotation.y - Math.PI / 2) * -player.speed.x + playerModelBody.velocity.x / 20
                    playerModelBody.position.z += -Math.cos(camera.rotation.y - Math.PI / 2) * player.speed.x + playerModelBody.velocity.z / 20
                }
            }
        } else {
            clearInterval( smoothlyMove )
        }
    }, 5)
    
}
let isFuseSpamSpace, jumpHorizontalMoving, velOfJumpIndex
function makeJump(){
    if (!player.isFlying && !isFuseSpamSpace){
        isFuseSpamSpace = true
        setTimeout(() => {
            isFuseSpamSpace = false
        }, 300)
        velOfJumpIndex = 60
        setTimeout(() => {
            clearInterval(smoothlyJump)
        }, 240)
        let smoothlyJump = setInterval(() => {
            --velOfJumpIndex
            playerModelBody.velocity.set(0, 0, 0)
            playerModelBody.position.y += 0.002 * velOfJumpIndex
        }, 5)
    }
}
let smoothDucking
function makeDuck(front){
    if (front){
        clearInterval(smoothDucking)
        smoothDucking = setInterval(() => {
            if (playerModelBody.shapes[0].halfExtents.y > 1){
                playerModelBody.shapes[0].halfExtents.y -=  1/20
                playerModelBody.shapes[0].boundingSphereRadiusNeedsUpdate = true;
                playerModelBody.shapes[0].updateConvexPolyhedronRepresentation();
                playerModelBody.computeAABB();
                playerModelBody.position.y -= 1/20
            } else {
                playerModelBody.shapes[0].halfExtents.y = 1
                clearInterval(smoothDucking)
            }
        }, 5)

    } else {
        clearInterval(smoothDucking)
        smoothDucking = setInterval(() => {
            if (playerModelBody.shapes[0].halfExtents.y < 2){
                playerModelBody.shapes[0].halfExtents.y += 1/20
                playerModelBody.shapes[0].boundingSphereRadiusNeedsUpdate = true;
                playerModelBody.shapes[0].updateConvexPolyhedronRepresentation();
                playerModelBody.computeAABB();
                playerModelBody.position.y += 1/20
            } else {
                playerModelBody.shapes[0].halfExtents.y = 2
                clearInterval(smoothDucking)
            }
        }, 5)
    }
}
function offKeyboard(event){
    event.preventDefault();
        switch (event.code) {
        case 'KeyW':
            if (keys.KeyS){
                player.speed.z = -player.maxSpeed.horizontal
            } else {
                player.speed.z = 0
            }
            break;
        case 'KeyA':
            if (keys.KeyD){
                player.speed.x = player.maxSpeed.horizontal
            } else {
                player.speed.x = 0
            }
            break;
        case 'KeyS':
            if (keys.KeyW){
                player.speed.z = player.maxSpeed.horizontal
            } else {
                player.speed.z = 0
            }
            break;
        case 'KeyD':
            if (keys.KeyA){
                player.speed.x = -player.maxSpeed.horizontal
            } else {
                player.speed.x = 0
            }
            break;
        case 'ControlLeft':
            if (!isFuseSpamCtrl && keys.ControlLeft){
                isFuseSpamCtrl = true
                player.maxSpeed.horizontal = 0.1
                makeDuck(false)
                isFuseSpamCtrl = false
            }
            break;
        case 'ShiftLeft':
            player.maxSpeed.horizontal = 0.1
            break;
        case 'F2':
            onAdvancedInfo()
            helpers.forEach(element => element.visible = !element.visible)
            break;
        }
        keys[event.code] = false
}
let isFuseSpamCtrl, isCtrlStamina
function onKeyboard(event){
    event.preventDefault();
    if (!keys[event.code]){
        keys[event.code] = true
        switch (event.code) {
        case 'KeyW':
            player.speed.z = player.maxSpeed.horizontal
            playerMove()
            break;
        case 'KeyA':
            player.speed.x = -player.maxSpeed.horizontal
            playerMove()
            break;
        case 'KeyS':
            player.speed.z = -player.maxSpeed.horizontal
            playerMove()
            break;
        case 'KeyD':
            player.speed.x = player.maxSpeed.horizontal
            playerMove()
            break;
        case 'ControlLeft':
            if (!isCtrlStamina && Math.round(playerModelBody.shapes[0].halfExtents.y) == 2){
                isCtrlStamina = true
                player.maxSpeed.horizontal = 0.04
                makeDuck(true)
                setTimeout(() => {
                    isCtrlStamina = false
                }, 500)
            } else {
                keys[event.code] = false
            }
            break;
        case 'ShiftLeft':
            player.maxSpeed.horizontal = 0.06
            break;
        case 'Space':
            makeJump()
            break;
        }
    }
}
function onMouseClick(event){
    switch (event.button) {
        case 0:
            makeShoot()
            break;
    }
}
function makeShoot(){ 
    if (bullets.length > 20){
        scene.remove(bullets[0])
        bullets.splice(0, 1)
        bulletsBody.splice(0, 1)
    }
    let bullet = new THREE.Mesh( new THREE.BoxGeometry( 0.1, 0.1, 0.4 ), new THREE.MeshBasicMaterial( {color: '#ff5900'} ) );
    bullet.position.copy(camera.position)
    bullet.quaternion.copy(camera.quaternion)
    bullet.name = 'bullet'
    bullets.push(bullet)
    scene.add( bullet )
    let bulletBody = new CANNON.Body({
        mass: 1,
        position: camera.position,
        shape: new CANNON.Box( new CANNON.Vec3(0.05, 0.05, 0.2)),
        quaternion: camera.quaternion
    })
    bulletsBody.push(bulletBody)
    bulletBody.quaternion.normalize()
    bulletBody.position.x += Math.sin(camera.rotation.y) * -2
    bulletBody.position.z += Math.cos(Math.PI - camera.rotation.y) * 2
    bulletBody.position.y += Math.tan(camera.rotation.x) * 1 - 0.5

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    pointer.x = ( (window.innerWidth/2) / window.innerWidth ) * 2 - 1;
    pointer.y = - ( ((window.innerHeight+2)/2) / window.innerHeight ) * 2 + 1;
    raycaster.setFromCamera( pointer, camera );
    const intersects = raycaster.intersectObjects( scene.children );
    let intersetsExpectBullets = intersects.filter(e => e.object.name !== 'bullet')
    bulletBody.endPosition = {
        x: intersetsExpectBullets[0].point.x - Math.sin(camera.rotation.y) * -0.3,
        y: Math.max((intersetsExpectBullets[0].point.y - Math.tan(camera.rotation.x) * 0.15 - intersetsExpectBullets[0].distance * 0.02), 0),
        z: intersetsExpectBullets[0].point.z - Math.cos(Math.PI - camera.rotation.y) * 0.3,
    }
    world.addBody(bulletBody)
    let grounded
    bulletBody.velocity.x += Math.sin(camera.rotation.y) * -200
    bulletBody.velocity.z += Math.cos(Math.PI - camera.rotation.y) * 200
    bulletBody.velocity.y += Math.tan(camera.rotation.x) * 200
    bulletBody.addEventListener('collide', function onBulletCollide({ contact: { bi } }) {
        bulletBody.velocity.set(0,0,0)
        const vTo = new CANNON.Vec3(Math.sin(camera.rotation.y) * -2000, Math.cos(Math.PI - camera.rotation.y) * 2000, Math.tan(camera.rotation.x) * 1000)
        const ray = new CANNON.Ray(bulletBody.position, vTo)
        const result = new CANNON.RaycastResult()
        ray.intersectBody(bi, result)
        grounded = result.hasHit
        // bi.id == 25 ? console.log('HIT') : null
        let endPosition = bulletBody.endPosition
        bulletBody.position.x = endPosition.x
        bulletBody.position.y = endPosition.y
        bulletBody.position.z = endPosition.z
        removeBody = bulletBody;
        this.removeEventListener('collide', onBulletCollide);
    })
}
document.getElementById('onPlay').addEventListener('click', onPlay)

function onPlay(){
    document.getElementById('menuBg').style.display = 'none'
    player.flyMode = document.getElementById('playOrDevChoose').checked
    if (flyMode){
        player.maxSpeed.horizontal = 0.2
    } else {
        player.maxSpeed.horizontal = 0.1
    }
    speedSide = 0, speedForward = 0, speedSide = 0, speedForwardmax = 0
    document.querySelector('canvas').requestPointerLock = document.querySelector('canvas').requestPointerLock ||
    document.querySelector('canvas').mozRequestPointerLock ||
    document.querySelector('canvas').webkitRequestPointerLock;
    document.querySelector('canvas').requestPointerLock()
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('keydown', onKeyboard, false)
    window.addEventListener('keyup', offKeyboard, false)
    window.addEventListener('click', onMouseClick)
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) {
        document.documentElement.msRequestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) {
        document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
    }
    playerModelBody.mass = 10;
    playerModelBody.updateMassProperties();
    playerModelBody.velocity.y = 1
}
function onMenu(){
    document.getElementById('onPlay').removeEventListener('click', onPlay)
    document.getElementById('menuBg').style.display = 'grid'
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('keydown', onKeyboard)
    window.removeEventListener('keyup', offKeyboard)
    window.removeEventListener('click', onMouseClick)
    setTimeout(() => {document.getElementById('onPlay').addEventListener('click', onPlay)}, 2500)
    keys = {
        KeyW: false,
        KeyA: false,
        KeyS: false,
        KeyD: false,
        KeyQ: false,
        KeyE: false,
        ShiftLeft: false,
        ControlLeft: false,
        Space: false
    }
}

function onMouseMove( event ){
    const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
	const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

    euler.x -= movementY / (1 / sensitivity * 1000)
    euler.y -= movementX / (1 / sensitivity * 1000)

    euler.x = Math.max(Math.min(Math.PI/2.5, euler.x), -Math.PI/2.5)
    camera.quaternion.setFromEuler( euler );
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







