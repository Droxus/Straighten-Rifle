const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 1000 );

const euler = new THREE.Euler( 0, 0, 0, 'YXZ' );
const vector = new THREE.Vector3();

const peer = new Peer();

let onlineMode, scoreboard = {player: 0, enemy: 0}, inGame

let botDifficult = 1
const defaultSpeed = 0.11
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
const playerModel = new THREE.Mesh(  new THREE.BoxGeometry( 2, 4, 2 ), new THREE.MeshBasicMaterial( {color: 0x00ff00, visible: false} ) );
playerModel.position.set(0, 2, 0)
playerModel.name = "playermodel"
playerModel.geometry.computeBoundingBox()
playerModel.geometry.userData.obb = new THREE.OBB().fromBox3(
    playerModel.geometry.boundingBox
)
playerModel.userData.obb = new THREE.OBB()
playerModel.healthPoints = 100
scene.add(playerModel)
// console.log(playerModel)
const modelForBotTarget = new THREE.Mesh(  new THREE.BoxGeometry( 2, 2, 2 ), new THREE.MeshBasicMaterial( {color: 0x00ff00, visible: false} ) );
modelForBotTarget.name = 'modelForBotTarget'
scene.add(modelForBotTarget)
const enemyModel = new THREE.Mesh(  new THREE.BoxGeometry( 2, 4, 2 ), new THREE.MeshBasicMaterial( {color: 'aqua', visible: true, wireframe: true} ) );
enemyModel.position.set(0, 2, 0)
enemyModel.name = "enemymodel"
enemyModel.geometry.computeBoundingBox()
enemyModel.geometry.userData.obb = new THREE.OBB().fromBox3(
    enemyModel.geometry.boundingBox
)
enemyModel.userData.obb = new THREE.OBB()
enemyModel.healthPoints = 100
scene.add(enemyModel)
// console.log(enemyModel)
let player = {
    speed: {
        x: 0,
        y: 0,
        z: 0
    },
    realSpeed: {
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
    flyHorizontalSpeed: {
        x: 0,
        z: 0
    },
    isFlying: false,
    flyMode: false
}
let modelHeight = 3
let loadedAssets = 0, loadedTime = 0
let sensitivity = 1
let boxes = [], helpers = [], bullets = [], weapons = [], enemyWeapons = [], collisionResponsiveObjects = [], spawnEnemyAndPath = [], spawnArea = []
const loader = new THREE.GLTFLoader();
let model, sniperRifle, famasRifle, rifle, pistol
   loader.load('models/aimmap.glb', (glb) =>  {
        if (glb){
            // console.log(glb.scene)
            model = glb.scene
            model.scale.set(1, 1, 1)
            model.position.set(0, 0, 0)
            model.rotation.set(0, 0, 0)
            model.castShadow = true
            scene.add(model);
            model.children.forEach(child => {
                if (child.name.slice(0, 4) !== 'Path' && child.name.slice(0, 10) !== 'SpawnEnemy' && child.name.slice(0, 5) !== 'Spawn'){
                    const geometry = new THREE.BoxGeometry( child.scale.x * 2, child.scale.y * 2, child.scale.z * 2 )
                    let hitbox = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( { color: 'white', wireframe: false, visible: false } ) )
                    hitbox.geometry.computeBoundingBox()
                    hitbox.geometry.userData.obb = new THREE.OBB().fromBox3(
                        hitbox.geometry.boundingBox
                    )
                    hitbox.userData.obb = new THREE.OBB()
                    hitbox.position.set(child.position.x, child.position.y , child.position.z)
                    hitbox.rotation.set(child.rotation.x, child.rotation.y , child.rotation.z)
                    hitbox.userData.obb.copy(hitbox.geometry.userData.obb)
                    hitbox.name = "hitbox"
                    scene.add(hitbox)
                    collisionResponsiveObjects.push(hitbox)
                    let bbox = new THREE.LineSegments( new THREE.EdgesGeometry( new THREE.BoxGeometry( child.scale.x * 2 + 0.02, child.scale.y * 2 + 0.02, child.scale.z * 2 + 0.02 ) ), new THREE.LineBasicMaterial( { color: '#ff5900' } ) );
                    bbox.position.set(child.position.x, child.position.y , child.position.z)
                    bbox.rotation.set(child.rotation.x, child.rotation.y , child.rotation.z)
                    bbox.name = "bbox"
                    scene.add(bbox);
                } else {
                    child.visible = false
                    if (child.name.slice(0, 4) == 'Path' || child.name.slice(0, 10) == 'SpawnEnemy'){
                        spawnEnemyAndPath.push(child)
                    } else {
                        spawnArea.push(child)
                    }
                }
            })
            hideLoader()
        }})        
        loader.load('models/bobs_sniper-rifle.glb', (glb) =>  {
            if (glb){
                sniperRifle = glb.scene
                scene.add(sniperRifle)
                sniperRifle.visible = false
                sniperRifle.position.set(0, 40, 0)
                sniperRifle.rotationCameraX = 0.4
                sniperRifle.rotationCameraZ = 0.4
                sniperRifle.rotationCameraY = 0.1
                sniperRifle.rotationCameraKefX = 2
                sniperRifle.rotationCameraKefZ = 2
                sniperRifle.rotationCameraKefY = 0.5
                sniperRifle.rotationZ = 0
                sniperRifle.characteristics = {
                    damage: 50,
                    fireRate: 2,
                    reloadTime: 5,
                    ammo: 5,
                    recoil: 1,
                    timeToRestore: 2.25
                }
                sniperRifle.name = "sniperRifle"
                sniperRifle.canShoot = true
                sniperRifle.ammo = sniperRifle.characteristics.ammo
                weapons.push(sniperRifle)
                hideLoader()
            }
        })
        loader.load('models/famas/scene.glb', (glb) =>  {
            if (glb){
                famasRifle = glb.scene
                scene.add(famasRifle)
                famasRifle.visible = false
                famasRifle.scale.set(0.1,0.1,0.1)
                famasRifle.position.set(0, 40, 0)
                famasRifle.rotationCameraX = 0.4
                famasRifle.rotationCameraZ = 0.4
                famasRifle.rotationCameraY = 0.2
                famasRifle.rotationCameraKefX = 1.5
                famasRifle.rotationCameraKefZ = 1.5
                famasRifle.rotationCameraKefY = 1
                famasRifle.rotationZ = 0
                famasRifle.name = "famasRifle"
                famasRifle.characteristics = {
                    damage: 20,
                    fireRate: 0.5,
                    reloadTime: 3,
                    ammo: 15,
                    recoil: 3,
                    timeToRestore: 0.35 
                }
                famasRifle.canShoot = true
                famasRifle.ammo = famasRifle.characteristics.ammo
                weapons.push(famasRifle)
                hideLoader()
            }
        })
        loader.load('models/m4/scene.glb', (glb) =>  {
            if (glb){
                rifle = glb.scene
                scene.add(rifle)
                rifle.visible = false
                rifle.scale.set(15,15,15)
                rifle.position.set(0, 40, 0)
                rifle.rotationCameraX = 0.4
                rifle.rotationCameraZ = 0.4
                rifle.rotationCameraY = 0.2
                rifle.rotationCameraKefX = 1.5
                rifle.rotationCameraKefZ = 1.5
                rifle.rotationCameraKefY = 0.8
                rifle.rotationZ = 0
                rifle.name = "rifle"
                rifle.characteristics = {
                    damage: 25,
                    fireRate: 0.15,
                    reloadTime: 3,
                    ammo: 30,
                    recoil: 5,
                    timeToRestore: 0.35
                }
                rifle.canShoot = true
                rifle.ammo = rifle.characteristics.ammo
                weapons.push(rifle)
                hideLoader()
            }
        })
        loader.load('models/pistol/scene.glb', (glb) =>  {
            if (glb){
                pistol = glb.scene
                scene.add(pistol)
                pistol.visible = false
                pistol.scale.set(0.15,0.15,0.15)
                pistol.position.set(0, 40, 0)
                pistol.rotationCameraX = 0.6
                pistol.rotationCameraZ = 0.6
                pistol.rotationCameraY = 0.2
                pistol.rotationCameraKefX = 1.5
                pistol.rotationCameraKefZ = 1.5
                pistol.rotationCameraKefY = 1.2
                pistol.rotationZ = 0
                pistol.name = "pistol"
                pistol.characteristics = {
                    damage: 15,
                    fireRate: 0.25,
                    reloadTime: 2,
                    ammo: 12,
                    recoil: 2,
                    timeToRestore: 0.45 
                }
                pistol.canShoot = true
                pistol.ammo = pistol.characteristics.ammo
                weapons.push(pistol)
                hideLoader()
            }
        })
let loadedInterval = setInterval(() => {
    loadedTime += 10
}, 10)
function hideLoader(){
    ++loadedAssets
    if (loadedAssets > 4){
        document.getElementById('loader').style.display = 'none'
        clearInterval(loadedInterval)
        console.log('Loading time takes ' + loadedTime/1000 + ' sec')
    }
}
const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild( renderer.domElement );
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );
renderer.shadowMap.enabled = true;

let floor = new THREE.Mesh( new THREE.BoxGeometry(500, 3, 500), new THREE.MeshBasicMaterial( { color: '#2b2b2b' } ) );
floor.name = 'floor'

floor.position.set(0,-1.55,0)
scene.add( floor );
let roof = new THREE.Mesh( new THREE.BoxGeometry(150, 3, 200), new THREE.MeshBasicMaterial( { color: '#2b2b2b' } ) );
roof.visible = false
roof.position.set(0, 31.5, 0)
scene.add( roof );
const stats = Stats()
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( stats.dom );
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

initSky()
animate();
function animate() {
    composer.render()
    requestAnimationFrame(animate)
    stats.update()

    if (!player.flyMode){
        camera.position.x = playerModel.position.x
        camera.position.y = playerModel.position.y + playerModel.geometry.parameters.height/2 * playerModel.scale.y
        camera.position.z = playerModel.position.z
        modelForBotTarget.position.copy(playerModel.position)
        modelForBotTarget.position.y += playerModel.geometry.parameters.height
    }
    if (loadedAssets > 4){
        weapons[randomWeapon].position.x = camera.position.x - Math.sin(camera.rotation.y - weapons[randomWeapon].rotationCameraX) * weapons[randomWeapon].rotationCameraKefX
        weapons[randomWeapon].position.z = camera.position.z + Math.cos(Math.PI - camera.rotation.y + weapons[randomWeapon].rotationCameraZ) * weapons[randomWeapon].rotationCameraKefZ
        weapons[randomWeapon].position.y = camera.position.y + Math.min(Math.max((Math.tan(camera.rotation.x + weapons[randomWeapon].rotationCameraY) - weapons[randomWeapon].rotationCameraKefY), -2), 2)
        weapons[randomWeapon].quaternion.copy(camera.quaternion)
        weapons[randomWeapon].rotation.z += weapons[randomWeapon].rotationZ
    }
    getAdvancedData()

    stats.begin()
    renderer.render( scene, camera );
    stats.end()
};
window.addEventListener('resize', onResize)
document.oncontextmenu = document.body.oncontextmenu = function() {return false;}
function isGrounded(model){
    let downDirection = new THREE.Vector3(0, -1, 0);
    let raycasterPositions = [], intersects = []
    raycasterPositions.push(new THREE.Vector3( model.position.x + model.geometry.parameters.depth/2, model.position.y, model.position.z + model.geometry.parameters.width/2 ))
    raycasterPositions.push(new THREE.Vector3( model.position.x - model.geometry.parameters.depth/2, model.position.y, model.position.z - model.geometry.parameters.width/2 ))
    raycasterPositions.push(new THREE.Vector3( model.position.x + model.geometry.parameters.depth/2, model.position.y, model.position.z - model.geometry.parameters.width/2 ))
    raycasterPositions.push(new THREE.Vector3( model.position.x - model.geometry.parameters.depth/2, model.position.y, model.position.z + model.geometry.parameters.width/2 ))
    raycasterPositions.push(new THREE.Vector3( model.position.x + model.geometry.parameters.depth/2, model.position.y, model.position.z ))
    raycasterPositions.push(new THREE.Vector3( model.position.x - model.geometry.parameters.depth/2, model.position.y, model.position.z ))
    raycasterPositions.push(new THREE.Vector3( model.position.x, model.position.y, model.position.z + model.geometry.parameters.width/2 ))
    raycasterPositions.push(new THREE.Vector3( model.position.x, model.position.y, model.position.z - model.geometry.parameters.width/2 ))
    raycasterPositions.push(new THREE.Vector3( model.position.x, model.position.y, model.position.z ))
    const raycaster = new THREE.Raycaster();
    raycaster.far = model.geometry.parameters.height/2 * model.scale.y + 0.1
    raycasterPositions.forEach(ray => {
        raycaster.set(ray, downDirection)
        intersects.push(raycaster.intersectObjects( scene.children ))
    })
    intersects = intersects.flat(1)
    intersects = intersects.filter(e => e.distance > raycaster.far * 0.85)
    intersects = intersects.filter(e => e.object.name.slice(0, 4) !== 'Path' && e.object.name.slice(0, 10) !== 'SpawnEnemy' && e.object.name.slice(0, 5) !== 'Spawn')
    if (intersects[0]){
        intersects.sort((a, b) => {
            if (a.distance > b.distance) return 1
            if (a.distance < b.distance) return -1
            return 0
        })
        model.position.y += (raycaster.far-0.05) - intersects[0].distance
        if (onlineMode && model.name == 'playermodel'){
            connection.send({position: {y: playerModel.position.y,  x: playerModel.position.x, z: playerModel.position.z}});
        }
        return true 
    }
    return false
}
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
let smoothGravityAttraction, velOfGravityAttractionIndex, isGravityAttractioning
function gravityAttraction(){
    if (!isGrounded(playerModel) && !isFuseSpamSpace && !isGravityAttractioning){
        clearInterval(smoothGravityAttraction)
        isGravityAttractioning = true
        velOfGravityAttractionIndex = 0
        smoothGravityAttraction = setInterval(() => {
            if (!isGrounded(playerModel)){
                ++velOfGravityAttractionIndex
                if (playerModel.scale.y > 0.5 && playerModel.scale.y < 1){
                    playerModel.position.y -= 0.002 * velOfGravityAttractionIndex - playerModel.geometry.parameters.depth / 75 
                } else {
                    playerModel.position.y -= 0.002 * velOfGravityAttractionIndex
                }
            } else {
                isGravityAttractioning = false
                clearInterval(smoothGravityAttraction)
            }
            if (onlineMode){
                connection.send({position: {y: playerModel.position.y,  x: playerModel.position.x, z: playerModel.position.z}});
            }
        }, 5)
    }
}
let smoothlyMove, smoothlyJump, inertiaSpeed = {x: 0, z: 0}
function playerMove(){
    clearInterval(inertiaSmothlyMove)
    clearInterval( smoothlyMove )
    smoothlyMove = setInterval(() => {
        if (Math.abs(player.speed.x) + Math.abs(player.speed.z) > player.maxSpeed.horizontal){
            player.speed.x = Math.abs(player.speed.x) > player.maxSpeed.horizontal / 1.5 ? player.speed.x / 1.5 : player.speed.x
            player.speed.z = Math.abs(player.speed.z) > player.maxSpeed.horizontal / 1.5 ? player.speed.z / 1.5 : player.speed.z
        } else {
            player.speed.x = Math.abs(player.speed.x) > 0 ? player.maxSpeed.horizontal * (player.speed.x / Math.abs(player.speed.x)) : player.speed.x
            player.speed.z = Math.abs(player.speed.z) > 0 ? player.maxSpeed.horizontal * (player.speed.z / Math.abs(player.speed.z)) : player.speed.z
        }
        if (player.speed.x !== 0 || player.speed.y !== 0 || player.speed.z !== 0){
            if (player.flyMode){
                camera.translateZ( -player.speed.z * 20 )
                camera.translateX( player.speed.x * 20 )
            } else {
                if (isGrounded(playerModel)){
                    checkCollision()
                    isOnLanding = false
                    player.flyHorizontalSpeed.x = player.realSpeed.x || 0
                    player.flyHorizontalSpeed.z = player.realSpeed.z || 0
                    playerModel.prevPosition = {
                        x: playerModel.position.x,
                        y: playerModel.position.y,
                        z: playerModel.position.z
                    }
                    if (player.speed.z > 0){
                        player.realSpeed.z = Math.max(Math.min(player.speed.z, player.realSpeed.z + player.speed.z/50), 0)
                        playerModel.position.x += Math.sin(camera.rotation.y) * -player.realSpeed.z
                        playerModel.position.z += Math.cos(Math.PI - camera.rotation.y) * player.realSpeed.z
                    }
                    if (player.speed.z < 0){
                        player.realSpeed.z = Math.min(Math.max(player.speed.z, player.realSpeed.z + player.speed.z/50), 0)
                        playerModel.position.x += Math.sin(camera.rotation.y) * -player.realSpeed.z
                        playerModel.position.z += -Math.cos(camera.rotation.y) * player.realSpeed.z 
                    }
                    if (player.speed.x > 0){
                        player.realSpeed.x = Math.max(Math.min(player.speed.x, player.realSpeed.x + player.speed.x/50), 0)
                        playerModel.position.x += Math.sin(camera.rotation.y + Math.PI / 2) * player.realSpeed.x 
                        playerModel.position.z += -Math.cos(camera.rotation.y + Math.PI / 2) * -player.realSpeed.x
                    }
                    if (player.speed.x < 0){
                        player.realSpeed.x = Math.min(Math.max(player.speed.x, player.realSpeed.x + player.speed.x/50), 0)
                        playerModel.position.x += Math.sin(camera.rotation.y - Math.PI / 2) * -player.realSpeed.x 
                        playerModel.position.z += -Math.cos(camera.rotation.y - Math.PI / 2) * player.realSpeed.x
                    }
                    if (player.speed.x !== 0 && player.speed.z == 0){
                        player.realSpeed.z = 0
                    }
                    if (player.speed.z !== 0 && player.speed.x == 0){
                        player.realSpeed.x = 0
                    }
                }
                else {
                    onLanding()
                    gravityAttraction()
                }
            }
        } else {
            inertiaMove()
            clearInterval( smoothlyMove )
        }
    }, 5)
}
let inertiaSmothlyMove
function inertiaMove(){
    inertiaSpeed.x = player.maxSpeed.horizontal * player.realSpeed.x / Math.abs(player.realSpeed.x)
    inertiaSpeed.z = player.maxSpeed.horizontal * player.realSpeed.z / Math.abs(player.realSpeed.z)
    clearInterval(inertiaSmothlyMove)
        inertiaSmothlyMove = setInterval(() => {
            if (isGrounded(playerModel)){
                checkCollision()
                isOnLanding = false
                player.flyHorizontalSpeed.x = player.realSpeed.x || 0
                player.flyHorizontalSpeed.z = player.realSpeed.z || 0
                playerModel.prevPosition = {
                    x: playerModel.position.x,
                    y: playerModel.position.y,
                    z: playerModel.position.z
                }
                if ((player.speed.x == 0 && player.speed.x !== player.realSpeed.x) || (player.speed.z == 0 && player.speed.z !== player.realSpeed.z)){
                    if (inertiaSpeed.x > 0){
                        player.realSpeed.x = Math.max(0, player.realSpeed.x - inertiaSpeed.x/50)
                        playerModel.position.x += Math.sin(camera.rotation.y + Math.PI / 2) * player.realSpeed.x 
                        playerModel.position.z += -Math.cos(camera.rotation.y + Math.PI / 2) * -player.realSpeed.x
                    }
                    if (inertiaSpeed.x < 0){
                        player.realSpeed.x = Math.min(0, player.realSpeed.x - inertiaSpeed.x/50)
                        playerModel.position.x += Math.sin(camera.rotation.y - Math.PI / 2) * -player.realSpeed.x 
                        playerModel.position.z += -Math.cos(camera.rotation.y - Math.PI / 2) * player.realSpeed.x
                    }
                    if (inertiaSpeed.z > 0){
                        player.realSpeed.z = Math.max(0, player.realSpeed.z - inertiaSpeed.z/50)
                        playerModel.position.x += Math.sin(camera.rotation.y) * -player.realSpeed.z
                        playerModel.position.z += Math.cos(Math.PI - camera.rotation.y) * player.realSpeed.z
                    }
                    if (inertiaSpeed.z < 0){
                        player.realSpeed.z = Math.min(0, player.realSpeed.z - inertiaSpeed.z/50)
                        playerModel.position.x += Math.sin(camera.rotation.y) * -player.realSpeed.z
                        playerModel.position.z += -Math.cos(camera.rotation.y) * player.realSpeed.z 
                    }
                } else {
                    clearInterval(inertiaSmothlyMove)
                }
            } else {
                onLanding()
                gravityAttraction()
                clearInterval(inertiaSmothlyMove)
            }
        })
}
function checkCollision(){
        playerModel.userData.obb.copy(playerModel.geometry.userData.obb)
        playerModel.userData.obb.applyMatrix4(playerModel.matrixWorld)
        for (const obj of collisionResponsiveObjects){
            obj.userData.obb.copy(obj.geometry.userData.obb)
            obj.userData.obb.applyMatrix4(obj.matrixWorld)
            if (obj.userData.obb.intersectsOBB(playerModel.userData.obb)) {
                let objectPosition
                if (obj.geometry.boundingBox.max.x > obj.geometry.boundingBox.max.z){
                    objectPosition = {x: playerModel.position.x, z: obj.position.z}
                } else if (obj.geometry.boundingBox.max.x < obj.geometry.boundingBox.max.z){
                    objectPosition = {x: obj.position.x, z: playerModel.position.z}
                } else {
                    objectPosition = {x: obj.position.x, z: obj.position.z}
                }
                let xDiff = Math.abs(playerModel.position.x - objectPosition.x)
                let zDiff = Math.abs(playerModel.position.z - objectPosition.z)
                if (xDiff < zDiff){
                    if (Math.abs(playerModel.position.z - obj.position.z) > Math.abs(playerModel.prevPosition.z - obj.position.z)){
                        playerModel.position.set(playerModel.position.x, playerModel.position.y, playerModel.position.z)
                    } else {
                        playerModel.position.set(playerModel.position.x, playerModel.position.y, playerModel.prevPosition.z)
                    }
                } else if (xDiff > zDiff) {
                    if (Math.abs(playerModel.position.x - obj.position.x) > Math.abs(playerModel.prevPosition.x - obj.position.x)){
                        playerModel.position.set(playerModel.position.x, playerModel.position.y, playerModel.position.z)
                    } else {
                        playerModel.position.set(playerModel.prevPosition.x, playerModel.position.y, playerModel.position.z)
                    }
                } else {
                    playerModel.position.set(playerModel.prevPosition.x, playerModel.position.y, playerModel.prevPosition.z)
                }
            }
        }
}
let isFuseSpamSpace, jumpHorizontalMoving, velOfJumpIndex
function makeJump(){
    if (isGrounded(playerModel) && !isFuseSpamSpace){
        isFuseSpamSpace = true
        onLanding()
        velOfJumpIndex = 60
        setTimeout(() => {
            isFuseSpamSpace = false
            clearInterval(smoothlyJump)
            gravityAttraction()
        }, 240)
        smoothlyJump = setInterval(() => {
            if (onlineMode){
                connection.send({position: {y: playerModel.position.y,  x: playerModel.position.x, z: playerModel.position.z}});
            }
            --velOfJumpIndex
            playerModel.position.y += 0.002 * velOfJumpIndex
        }, 5)
    }
}
let smoothDucking
function makeDuck(front){
    if (front){
        clearInterval(smoothDucking)
        smoothDucking = setInterval(() => {
            if (playerModel.scale.y > 0.5){
                playerModel.scale.y -=  1/50
                playerModel.position.y -= playerModel.geometry.parameters.depth / 50
            } else {
                playerModel.scale.y = 0.5
                clearInterval(smoothDucking)
            }
            if (onlineMode){
                connection.send({position: {y: playerModel.position.y,  x: playerModel.position.x, z: playerModel.position.z}, scale: {y: playerModel.scale.y}});
            }
        }, 5)

    } else {
        clearInterval(smoothDucking)
        smoothDucking = setInterval(() => {
            if (playerModel.scale.y < 1){
                playerModel.scale.y += 1/50
                playerModel.position.y += playerModel.geometry.parameters.depth / 50
            } else {
                playerModel.scale.y = 1
                clearInterval(smoothDucking)
            }
            if (onlineMode){
                connection.send({position: {y: playerModel.position.y,  x: playerModel.position.x, z: playerModel.position.z}, scale: {y: playerModel.scale.y}});
            }
        }, 5)
    }
}
let onLandingInterval, isOnLanding
function onLanding(){
    if (!isOnLanding){
        isOnLanding = true
        clearInterval(onLandingInterval)
        onLandingInterval = setInterval(() => {
            if (Math.abs(player.flyHorizontalSpeed.z) + Math.abs(player.flyHorizontalSpeed.x) > player.maxSpeed.horizontal){
                player.flyHorizontalSpeed.z = player.flyHorizontalSpeed.z /2
                player.flyHorizontalSpeed.x = player.flyHorizontalSpeed.x /2
            }
            if (!isGrounded(playerModel)){
                checkCollision()
                playerModel.prevPosition = {
                    x: playerModel.position.x,
                    y: playerModel.position.y,
                    z: playerModel.position.z
                }
                if (player.flyHorizontalSpeed.z > 0){
                        playerModel.position.x += Math.sin(camera.rotation.y) * -player.flyHorizontalSpeed.z
                        playerModel.position.z += Math.cos(Math.PI - camera.rotation.y) * player.flyHorizontalSpeed.z
                }
                if (player.flyHorizontalSpeed.z < 0){
                        playerModel.position.x += Math.sin(camera.rotation.y) * -player.flyHorizontalSpeed.z
                        playerModel.position.z += -Math.cos(camera.rotation.y) * player.flyHorizontalSpeed.z
                }
                if (player.flyHorizontalSpeed.x > 0){
                        playerModel.position.x += Math.sin(camera.rotation.y + Math.PI / 2) * player.flyHorizontalSpeed.x
                        playerModel.position.z += -Math.cos(camera.rotation.y + Math.PI / 2) * -player.flyHorizontalSpeed.x
                }
                if (player.flyHorizontalSpeed.x < 0){
                        playerModel.position.x += Math.sin(camera.rotation.y - Math.PI / 2) * -player.flyHorizontalSpeed.x
                        playerModel.position.z += -Math.cos(camera.rotation.y - Math.PI / 2) * player.flyHorizontalSpeed.x
                }
            } else {
                inertiaMove()
                clearInterval(onLandingInterval)
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
                player.maxSpeed.horizontal = defaultSpeed
                makeDuck(false)
                isFuseSpamCtrl = false
            }
            break;
        case 'ShiftLeft':
            player.maxSpeed.horizontal = defaultSpeed
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
            if (!isCtrlStamina && Math.round(playerModel.geometry.parameters.height) == 4){
                isCtrlStamina = true
                player.maxSpeed.horizontal = 0.06
                makeDuck(true)
                setTimeout(() => {
                    isCtrlStamina = false
                }, 500)
            } else {
                keys[event.code] = false
            }
            break;
        case 'ShiftLeft':
            player.maxSpeed.horizontal = 0.08
            break;
        case 'Space':
            makeJump()
            break;
        case 'KeyR':
            makeReload()
            break;
        }
    }
}
let reloadingTime, isReloading = false
function makeReload(){
    if (weapons[randomWeapon].ammo < weapons[randomWeapon].characteristics.ammo && !isReloading){
        isReloading = true
        clearInterval(reloadingTime)
        let rotateToReload = setInterval(() => {
            if (weapons[randomWeapon].rotationZ > -Math.PI/4){
                weapons[randomWeapon].rotationZ += -0.05
            } else {
                clearInterval(rotateToReload)
            }
        }, 5)
        setTimeout(() => {
            let rotateBack = setInterval(() => {
                if (weapons[randomWeapon].rotationZ < 0){
                    weapons[randomWeapon].rotationZ += 0.05
                } else {
                    clearInterval(rotateBack)
                }
            }, 5)
        }, (weapons[randomWeapon].characteristics.reloadTime * 1000) - 500)
        reloadingTime = setTimeout(() => {
            weapons[randomWeapon].ammo = weapons[randomWeapon].characteristics.ammo
            document.getElementById('amountAmmo').innerText = weapons[randomWeapon].ammo
            isReloading = false
        }, weapons[randomWeapon].characteristics.reloadTime * 1000)
    }
}
let mouseClick = true
function onMouseClick(event){
    switch (event.button) {
        case 0:
            mouseClick = true
            onFireAttack()
            break;
        case 2:
            onScope()
            break;
    }
}
function onMouseUp(event){
    switch (event.button) {
        case 0:
            mouseClick = false
            break;
    }
}
let fireShootInterval, fireRate
function onFireAttack(){
    if (weapons[randomWeapon].canShoot && !isReloading){
        switch (weapons[randomWeapon].name) {
            case 'sniperRifle':
                makeShoot()
                fireRate = setTimeout(() => {
                    sniperRifle.canShoot = true
                }, sniperRifle.characteristics.fireRate * 1000)
                break;
            case 'famasRifle':
                makeShoot()
                setTimeout(() => {
                    makeShoot()
                }, 100)
                setTimeout(() => {
                    makeShoot()
                }, 100)
                fireRate = setTimeout(() => {
                    famasRifle.canShoot = true
                }, famasRifle.characteristics.fireRate * 1000)
                break;
            case 'rifle':
                makeShoot()
                clearInterval(fireShootInterval)
                fireRate = setTimeout(() => {
                    rifle.canShoot = true
                }, rifle.characteristics.fireRate * 1000)
                fireShootInterval = setInterval(() => {
                    if (mouseClick){
                        clearTimeout(fireRate)
                        makeShoot()
                    } else {
                        rifle.canShoot = true
                        clearInterval(fireShootInterval)
                    }
                }, rifle.characteristics.fireRate * 1000)
                break;
            case 'pistol':
                makeShoot()
                fireRate = setTimeout(() => {
                    pistol.canShoot = true
                }, pistol.characteristics.fireRate * 1000)
                break;
        }
    }
}
function onScope(){
    if (weapons[randomWeapon].name == 'sniperRifle'){
        if (document.getElementById('awpScope').style.display !== 'none'){
            if (camera.zoom == 2){
                camera.zoom = 5
                camera.updateProjectionMatrix();
                sensitivity /= 2.5
            } else {
                sensitivity *= camera.zoom
                camera.zoom = 1
                camera.updateProjectionMatrix();
                document.getElementById('awpScope').style.display = 'none'
            }
        } else {
            camera.zoom = 2
            camera.updateProjectionMatrix();
            document.getElementById('awpScope').style.display = 'grid'
            sensitivity /= 2
        }
    }
}
let timeToRestoreInterval, timeToRestore = 0
function makeShoot(){
    if (weapons[randomWeapon].ammo > 0 && !isReloading){
        clearInterval(timeToRestoreInterval)
        timeToRestoreInterval = setInterval(() => {
            if (timeToRestore < weapons[randomWeapon].characteristics.timeToRestore*1000){
                timeToRestore += 5
            } else {
                clearInterval(timeToRestoreInterval)
            }
        }, 5)
        let recoil = ((weapons[randomWeapon].characteristics.timeToRestore*1000 - timeToRestore) * weapons[randomWeapon].characteristics.recoil) / 250
        if (!isGrounded(playerModel)){
            recoil += 10
        }
        recoil += ((Math.abs(player.realSpeed.x) + Math.abs(player.realSpeed.z)) / defaultSpeed) * 10
        let recoilY = (recoil*8) * (Math.random() + 0.5) * 2
        let recoilX = recoil * (Math.random() - 0.5) * 5
        if (bullets.length > 50){
            scene.remove(bullets[0])
            bullets.splice(0, 1)
        }
        let bullet = new THREE.Mesh( new THREE.BoxGeometry( 0.1, 0.1, 0.2 ), new THREE.MeshBasicMaterial( {color: '#ff5900'} ) );
        bullet.position.copy(camera.position)
        bullet.quaternion.copy(camera.quaternion)
        bullet.name = "bullet"
        bullets.push(bullet)
        scene.add( bullet )
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        raycaster.far = 500
        pointer.x = ( (window.innerWidth/2 + recoilX) / window.innerWidth ) * 2 - 1;
        pointer.y = - ( ((window.innerHeight)/2  - recoilY) / window.innerHeight ) * 2 + 1;
        raycaster.setFromCamera( pointer, camera );
        const intersects = raycaster.intersectObjects( scene.children );
        let intersetsFiltered = intersects.filter(e => e.object.name !== 'bullet' && e.object.name !== 'playermodel' && e.object.name !== 'hitbox' && e.object.name !== 'bbox' && e.object.name !== 'modelForBotTarget' && e.object.name !== 'enemymodel')
        if (intersetsFiltered[0]){
            let distanceToEndPosition = intersetsFiltered[0].distance
            bullet.endPosition = {
                x: intersetsFiltered[0].point.x,
                y: intersetsFiltered[0].point.y,
                z: intersetsFiltered[0].point.z,
            }
            bullet.cameraPosition = {
                x: camera.rotation.x,
                y: camera.rotation.y
            }
            if (onlineMode){
                connection.send({bullet: {startPosition: {x: weapons[randomWeapon].position.x + Math.sin(camera.rotation.y) * -2, y: weapons[randomWeapon].position.y + Math.tan(camera.rotation.x) * 1,
                    z: weapons[randomWeapon].position.z + Math.cos(Math.PI - camera.rotation.y) * 2}, endPosition: { x: intersetsFiltered[0].point.x, y: intersetsFiltered[0].point.y, z: intersetsFiltered[0].point.z }}});
            }
            let velocity = 500 / 200
            let time = distanceToEndPosition / velocity
            let bulletSpeedX = (bullet.endPosition.x - weapons[randomWeapon].position.x + Math.sin(camera.rotation.y) * -2) / time
            let bulletSpeedY = (bullet.endPosition.y - weapons[randomWeapon].position.y + Math.tan(camera.rotation.x) * 1) / time
            let bulletSpeedZ = (bullet.endPosition.z - weapons[randomWeapon].position.z + Math.cos(Math.PI - camera.rotation.y) * 2) / time
            bullet.position.set(weapons[randomWeapon].position.x + Math.sin(camera.rotation.y) * -2, weapons[randomWeapon].position.y + Math.tan(camera.rotation.x) * 1, weapons[randomWeapon].position.z + Math.cos(Math.PI - camera.rotation.y) * 2)
            let smoothBulletShooting = setInterval(() => {
            let distanceBtwBulletAndPlayer = Math.sqrt(Math.pow(bullet.position.x - enemyModel.position.x, 2) + Math.pow(bullet.position.z - enemyModel.position.z, 2) + Math.pow(bullet.position.y - enemyModel.position.y, 2))
            let distanceBtwBulletAndEndPos = Math.sqrt(Math.pow(bullet.position.x - bullet.endPosition.x, 2) + Math.pow(bullet.position.z - bullet.endPosition.z, 2) + Math.pow(bullet.position.y - bullet.endPosition.y, 2))
            if (distanceBtwBulletAndPlayer > velocity/Math.sqrt(2) && distanceBtwBulletAndEndPos > velocity/Math.sqrt(2) && Math.abs(bullet.position.x) < 300 && Math.abs(bullet.position.z) < 300 && Math.abs(bullet.position.y) < 20) {
                    bullet.position.x += bulletSpeedX
                    bullet.position.y += bulletSpeedY
                    bullet.position.z += bulletSpeedZ
                } else {
                    if (distanceBtwBulletAndPlayer < velocity/Math.sqrt(2)){
                        if (onlineMode){
                            connection.send({hit: true});
                        }
                        enemyModel.healthPoints -= weapons[randomWeapon].characteristics.damage
                        checkIfNextRound()
                    }
                    bullet.position.set(bullet.endPosition.x, bullet.endPosition.y, bullet.endPosition.z)
                    clearInterval(smoothBulletShooting)
                }
            }, 5)
        }
        weapons[randomWeapon].canShoot = false
        timeToRestore = 0
        weapons[randomWeapon].ammo--
        document.getElementById('amountAmmo').innerText = weapons[randomWeapon].ammo
        if (weapons[randomWeapon].ammo < 1 && !isReloading){
            makeReload()
        }
    } else {
        makeReload()
    }
}
document.getElementById('onPlay').addEventListener('click', onPlay)
let randomWeapon = 0
function onPlay(){
    document.getElementById('menuBg').style.display = 'none'
    player.flyMode = document.getElementById('playOrDevChoose').checked
    if (player.flyMode){
        player.maxSpeed.horizontal = 0.2
    } else {
        player.maxSpeed.horizontal = 0.12
    }
    document.querySelector('canvas').requestPointerLock = document.querySelector('canvas').requestPointerLock ||
    document.querySelector('canvas').mozRequestPointerLock ||
    document.querySelector('canvas').webkitRequestPointerLock;
    document.querySelector('canvas').requestPointerLock()
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('keydown', onKeyboard, false)
    window.addEventListener('keyup', offKeyboard, false)
    window.addEventListener('mousedown', onMouseClick)
    window.addEventListener('mouseup', onMouseUp)
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) {
        document.documentElement.msRequestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) {
        document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
    }
    scoreboard.player = 0
    scoreboard.enemy = 0
    document.getElementById('playerScore').innerText = scoreboard.player
    document.getElementById('enemyScore').innerText = scoreboard.enemy
    playerModel.healthPoints = 100
    document.getElementById('healthPointsLbl').innerText = playerModel.healthPoints
    document.getElementById('healthBar').style.width = `${playerModel.healthPoints}%`
    randomWeapon = Math.floor(Math.random() * 4)
    onNextRound()
}
function checkIfNextRound(){
    if (inGame){
        document.getElementById('healthPointsLbl').innerText = playerModel.healthPoints
        document.getElementById('healthBar').style.width = `${playerModel.healthPoints}%`
        if (enemyModel.healthPoints < 1){
            scoreboard.player++
            randomWeapon = Math.floor(Math.random() * 4)
            if (onlineMode){
                connection.send({weapon: weapons[randomWeapon].name, score: scoreboard});
            }
            onNextRound()
        }
        if (playerModel.healthPoints < 1){
            scoreboard.enemy++
            randomWeapon = Math.floor(Math.random() * 4)
            if (onlineMode){
                connection.send({weapon: weapons[randomWeapon].name, score: scoreboard});
            }
            onNextRound()
        }
    }
}
let onNextRoundTimeOut
function onNextRound(){
    document.getElementById('playerScore').innerText = scoreboard.player
    document.getElementById('enemyScore').innerText = scoreboard.enemy
    bullets.forEach(e => scene.remove(e))
    bullets = []
    player.speed.z = 0
    player.speed.x = 0
    clearInterval(fireShootInterval)
    clearInterval(timeToRestoreInterval)
    weapons[randomWeapon].ammo = weapons[randomWeapon].characteristics.ammo
    weapons[randomWeapon].canShoot = true
    nextRoundTransition()
    clearTimeout(onNextRoundTimeOut)
    onNextRoundTimeOut = setTimeout(() => {
        nextRoundTransitionHide()
        weapons.forEach(e => e.visible = false)
        weapons[randomWeapon].visible = true
        document.getElementById('awpScope').style.display = 'none'
        sensitivity *= camera.zoom
        camera.zoom = 1
        camera.updateProjectionMatrix();
        document.getElementById('amountAmmo').innerText = weapons[randomWeapon].ammo
        document.getElementById('totalAmmo').innerText = weapons[randomWeapon].characteristics.ammo
        timeToRestore = weapons[randomWeapon].characteristics.timeToRestore*1000
        playerModel.healthPoints = 100
        enemyModel.healthPoints = 100
        document.getElementById('healthPointsLbl').innerText = playerModel.healthPoints
        document.getElementById('healthBar').style.width = `${playerModel.healthPoints}%`
        spawnModels()
        if (!onlineMode){
            botLifeCycle()
        }
    }, 3000)
}
function nextRoundTransition(){
    document.getElementById('nextRoundTransitionBlock').classList.add('nextRoundBlackout')
    setTimeout(() => { document.getElementById('nextRoundTransitionBlock').classList.remove('nextRoundBlackout') }, 3000)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('keydown', onKeyboard)
    window.removeEventListener('keyup', offKeyboard)
    window.removeEventListener('mousedown', onMouseClick)
    window.removeEventListener('mouseup', onMouseUp)
    clearInterval(inertiaSmothlyMove)
    clearInterval( smoothlyMove )
    inGame = false
}
function nextRoundTransitionHide(){
    document.getElementById('nextRoundAnnounceBlock').classList.add('nextRoundAnnounce')
    setTimeout(() => { document.getElementById('nextRoundAnnounceBlock').classList.remove('nextRoundAnnounce') }, 5000)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('keydown', onKeyboard)
    window.addEventListener('keyup', offKeyboard)
    window.addEventListener('mousedown', onMouseClick)
    window.addEventListener('mouseup', onMouseUp)
    inGame = true
}
function onMenu(){
    inGame = false
    bullets.forEach(e => scene.remove(e))
    bullets = []
    player.speed.z = 0
    player.speed.x = 0
    clearTimeout(onNextRoundTimeOut)
    document.getElementById('onPlay').removeEventListener('click', onPlay)
    document.getElementById('menuBg').style.display = 'grid'
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('keydown', onKeyboard)
    window.removeEventListener('keyup', offKeyboard)
    window.removeEventListener('mousedown', onMouseClick)
    window.removeEventListener('mouseup', onMouseUp)
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
    weapons.forEach(e => {e.visible = false; e.position.set(0, 40, 0)})
    enemyModel.visible = false
    playerModel.healthPoints = 100
    enemyModel.healthPoints = 100
}
function spawnModels(){
    let randomSpawnIndex = Math.floor(Math.random() * 4)
    let randomSpawn = spawnArea[randomSpawnIndex]
    let randomPositionX = randomSpawn.position.x + randomSpawn.scale.x * (Math.random()-0.5) * 2
    let randomPositionZ = randomSpawn.position.z + randomSpawn.scale.z * (Math.random()-0.5) * 2
    playerModel.position.set(randomPositionX, randomSpawn.position.y + 2, randomPositionZ)
    if (!onlineMode){
        randomSpawnIndex = Math.floor(Math.random() * 4)
        randomSpawn = spawnEnemyAndPath.filter(e => e.name.slice(0, 10) == 'SpawnEnemy')[randomSpawnIndex]
        randomPositionX = randomSpawn.position.x + randomSpawn.scale.x * (Math.random()-0.5) * 2
        randomPositionZ = randomSpawn.position.z + randomSpawn.scale.z * (Math.random()-0.5) * 2
        enemyModel.position.set(randomPositionX, randomSpawn.position.y + 2, randomPositionZ)
        enemyModel.zoneName = randomSpawn.name
        enemyModel.visible = true
    }
    gravityAttraction()
    playerModel.updateMatrixWorld()
    enemyModel.updateMatrixWorld()
}
function checkBotVisionContact(){
    let intersects = [], direction
    const raycaster = new THREE.Raycaster();
    raycaster.far = 400
    direction = new THREE.Vector3((playerModel.position.x + playerModel.geometry.parameters.width/2) - enemyModel.position.x, playerModel.position.y - enemyModel.position.y, (playerModel.position.z + playerModel.geometry.parameters.depth/2) - enemyModel.position.z)
    direction.normalize()
    raycaster.set( new THREE.Vector3(enemyModel.position.x, enemyModel.position.y+3, enemyModel.position.z), direction );
    intersects.push(raycaster.intersectObjects( scene.children ))
    direction = new THREE.Vector3((playerModel.position.x + playerModel.geometry.parameters.width/2) - enemyModel.position.x, playerModel.position.y - enemyModel.position.y, (playerModel.position.z - playerModel.geometry.parameters.depth/2) - enemyModel.position.z)
    direction.normalize()
    raycaster.set( new THREE.Vector3(enemyModel.position.x, enemyModel.position.y+3, enemyModel.position.z), direction );
    intersects.push(raycaster.intersectObjects( scene.children ))
    direction = new THREE.Vector3((playerModel.position.x - playerModel.geometry.parameters.width/2) - enemyModel.position.x, playerModel.position.y - enemyModel.position.y, (playerModel.position.z + playerModel.geometry.parameters.depth/2) - enemyModel.position.z)
    direction.normalize()
    raycaster.set( new THREE.Vector3(enemyModel.position.x, enemyModel.position.y+3, enemyModel.position.z), direction );
    intersects.push(raycaster.intersectObjects( scene.children ))
    direction = new THREE.Vector3((playerModel.position.x - playerModel.geometry.parameters.width/2) - enemyModel.position.x, playerModel.position.y - enemyModel.position.y, (playerModel.position.z - playerModel.geometry.parameters.depth/2) - enemyModel.position.z)
    direction.normalize()
    raycaster.set( new THREE.Vector3(enemyModel.position.x, enemyModel.position.y+3, enemyModel.position.z), direction );
    intersects.push(raycaster.intersectObjects( scene.children ))
    intersects = intersects.flat(1)
    intersects.sort((a, b) => {
        if (a.distance > b.distance) return 1
        if (a.distance < b.distance) return -1
        return 0
    })
    intersects = intersects.filter(e => e.object.name !== 'enemymodel')
    intersects = intersects[0].object.name == 'playermodel' || intersects[0].object.name == 'modelForBotTarget' ? [intersects[0]] : []
    if (intersects[0]) return true
    return false
}
let botTargetPosition, pathToAnyBotZone = ['SpawnEnemy002', 'SpawnEnemy001', 'Path003', 'SpawnEnemy', 'Path002', 'Path001', 'Path', 'Path004', 'SpawnEnemy006']
function generateBotTargetPosition(){
    let currentZonePositionIndex = pathToAnyBotZone.findIndex(e => e == enemyModel.zoneName)
    let randomTargetPositionIndex = Math.round((Math.random()-0.5) * 3) + currentZonePositionIndex
    let randomTargetPosition = pathToAnyBotZone[Math.max(Math.min(randomTargetPositionIndex, pathToAnyBotZone.length-1), 0)]
    randomTargetPosition = spawnEnemyAndPath.find(e => e.name == randomTargetPosition) 
    let randomPositionX = randomTargetPosition.position.x + randomTargetPosition.scale.x * (Math.random()-0.5) * 2
    let randomPositionZ = randomTargetPosition.position.z + randomTargetPosition.scale.z * (Math.random()-0.5) * 2
    return botTargetPosition = new THREE.Vector3(randomPositionX, randomTargetPosition.position.y + 2, randomPositionZ)
}
function checkZoneOfBotPosition(){
    for (let i = 0; i < spawnEnemyAndPath.length; i++){
        if (spawnEnemyAndPath[i].position.x + spawnEnemyAndPath[i].scale.x > enemyModel.position.x && spawnEnemyAndPath[i].position.x - spawnEnemyAndPath[i].scale.x < enemyModel.position.x
        && spawnEnemyAndPath[i].position.z + spawnEnemyAndPath[i].scale.z > enemyModel.position.z && spawnEnemyAndPath[i].position.z - spawnEnemyAndPath[i].scale.z < enemyModel.position.z){
            enemyModel.zoneName = spawnEnemyAndPath[i].name
            break
        }
    }
}
let botMakeSmoothlyMove, smoothBotGravityAttraction, BotGravityAttraction
function botMakeMove(targetPosition){
    let distance = Math.sqrt(Math.pow(targetPosition.x - enemyModel.position.x, 2) + Math.pow(targetPosition.z - enemyModel.position.z, 2))
    let time = distance / (defaultSpeed/1.5)
    let botSpeedX = (targetPosition.x - enemyModel.position.x) / time
    let botSpeedZ = (targetPosition.z - enemyModel.position.z) / time
    clearInterval(botMakeSmoothlyMove)
    botMakeSmoothlyMove = setInterval(() => {
        if (!onlineMode){
        if (!isGrounded(enemyModel) && !BotGravityAttraction){
            BotGravityAttraction = true
            let velOfBotGravityAttractionIndex = 0
            smoothBotGravityAttraction = setInterval(() => {
                if (!isGrounded(enemyModel)){
                    ++velOfBotGravityAttractionIndex
                    enemyModel.position.y -= 0.002 * velOfBotGravityAttractionIndex
                } else {
                    BotGravityAttraction = false
                    clearInterval(smoothBotGravityAttraction)
                }
            }, 5)
        }
        if (!checkBotVisionContact() && Math.floor(enemyModel.position.x) !== Math.floor(targetPosition.x) && Math.floor(enemyModel.position.z) !== Math.floor(targetPosition.z)){
            enemyModel.position.x += botSpeedX
            enemyModel.position.z += botSpeedZ
        } else {
            botLifeCycle()
            clearInterval(botMakeSmoothlyMove)
        }
    }
    }, 5)
}
function makeBotShoot(){
        if (bullets.length > 50){
            scene.remove(bullets[0])
            bullets.splice(0, 1)
        }
        let bullet = new THREE.Mesh( new THREE.BoxGeometry( 0.1, 0.1, 0.2 ), new THREE.MeshBasicMaterial( {color: '#ff5900'} ) );
        bullet.position.copy(enemyModel.position)
        bullet.name = "bullet"
        bullets.push(bullet)
        scene.add( bullet )
        bullet.position.set(enemyModel.position.x, enemyModel.position.y+2, enemyModel.position.z)
        let velocity = 500 / 200
        let distance = Math.sqrt(Math.pow(playerModel.position.x - enemyModel.position.x, 2) + Math.pow(playerModel.position.z - enemyModel.position.z, 2) + Math.pow(playerModel.position.y - enemyModel.position.y, 2))
        let time = distance / velocity
        bullet.endPosition = {
            x: playerModel.position.x,
            y: playerModel.position.y,
            z: playerModel.position.z
        }
        bullet.startPosition = {
            x: enemyModel.position.x,
            y: enemyModel.position.y+2,
            z: enemyModel.position.z
        }
        let bulletSpeedX = (playerModel.position.x - enemyModel.position.x) / time
        let bulletSpeedZ = (playerModel.position.z - enemyModel.position.z) / time
        let bulletSpeedY = (playerModel.position.y - enemyModel.position.y) / time
        let bulletMakeSmoothlyMove = setInterval(() => {
            if (!inGame){
                scene.remove(bullet)
                bullets.splice(bullets.length-1, 1)
                clearInterval(bulletMakeSmoothlyMove)
            }
            let distanceBtwBulletAndPlayer = Math.sqrt(Math.pow(bullet.position.x - playerModel.position.x, 2) + Math.pow(bullet.position.z - playerModel.position.z, 2) + Math.pow(bullet.position.y - playerModel.position.y, 2))
            if (distanceBtwBulletAndPlayer > velocity && Math.abs(bullet.position.x) < 300 && Math.abs(bullet.position.z) < 300 && Math.abs(bullet.position.y) < 20) {
                bullet.position.x += bulletSpeedX
                bullet.position.y += bulletSpeedY
                bullet.position.z += bulletSpeedZ
            } else {
                if (distanceBtwBulletAndPlayer < velocity){
                    if (!onlineMode){
                        playerModel.healthPoints -= weapons[randomWeapon].characteristics.damage
                        document.getElementById('hitEventShow').classList.add('hitEventShow')
                        setTimeout(() => {
                            document.getElementById('hitEventShow').classList.remove('hitEventShow')
                        }, 500)
                        checkIfNextRound()
                    }
                }
                scene.remove(bullet)
                bullets.splice(bullets.length-1, 1)
                clearInterval(bulletMakeSmoothlyMove)
            }
        }, 5)
        botLifeCycle()
}
function makeEnemyShoot(startPosition, endPosition){
        if (bullets.length > 50){
            scene.remove(bullets[0])
            bullets.splice(0, 1)
        }
        let bullet = new THREE.Mesh( new THREE.BoxGeometry( 0.1, 0.1, 0.2 ), new THREE.MeshBasicMaterial( {color: '#ff5900'} ) );
        bullet.position.set(startPosition.x, startPosition.y, startPosition.z)
        bullet.name = "bullet"
        bullets.push(bullet)
        scene.add( bullet )
        bullet.position.set(enemyModel.position.x, enemyModel.position.y+2, enemyModel.position.z)
        let velocity = 500 / 200
        let distance = Math.sqrt(Math.pow(startPosition.x - endPosition.x, 2) + Math.pow(startPosition.z - endPosition.z, 2) + Math.pow(startPosition.y - endPosition.y, 2))
        let time = distance / velocity
        bullet.endPosition = endPosition
        bullet.startPosition = startPosition
        let bulletSpeedX = (endPosition.x - startPosition.x) / time
        let bulletSpeedZ = (endPosition.z - startPosition.z) / time
        let bulletSpeedY = (endPosition.y - startPosition.y) / time
        let bulletMakeSmoothlyMove = setInterval(() => {
            let distanceBtwBulletAndPlayer = Math.sqrt(Math.pow(bullet.position.x - playerModel.position.x, 2) + Math.pow(bullet.position.z - playerModel.position.z, 2) + Math.pow(bullet.position.y - playerModel.position.y, 2))
            if (distanceBtwBulletAndPlayer > velocity && Math.abs(bullet.position.x) < 300 && Math.abs(bullet.position.z) < 300 && Math.abs(bullet.position.y) < 20) {
                bullet.position.x += bulletSpeedX
                bullet.position.y += bulletSpeedY
                bullet.position.z += bulletSpeedZ
            } else {
                if (distanceBtwBulletAndPlayer < velocity){
                    scene.remove(bullet)
                    bullets.splice(bullets.length-1, 1)
                } else {
                    bullet.position.set(bullet.endPosition.x, bullet.endPosition.y, bullet.endPosition.z)
                }
                clearInterval(bulletMakeSmoothlyMove)
            }
        }, 5)
}
function botLifeCycle(){
    if (!onlineMode && inGame){
        setTimeout(() => {
            checkZoneOfBotPosition()
            if (checkBotVisionContact()){
                let direction = new THREE.Vector3(playerModel.position.x - enemyModel.position.x, playerModel.position.y - enemyModel.position.y, playerModel.position.z - enemyModel.position.z)
                makeBotShoot(direction)
            } else {
                botMakeMove(generateBotTargetPosition())
            }
        }, 2100 / botDifficult)
    }
}
function onMouseMove( event ){
    const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
	const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

    euler.x -= movementY / (1 / sensitivity * 1000)
    euler.y -= movementX / (1 / sensitivity * 1000)

    euler.x = Math.max(Math.min(Math.PI/2, euler.x), -Math.PI/2)
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
    if (player){
        document.getElementById('speedX').innerText = player.realSpeed.x
        document.getElementById('speedZ').innerText = player.realSpeed.z
    }
}
peer.on('open', function(id) {
    document.getElementById('yourCode').value = id
    console.log(id)
});
document.getElementById('ConnectBtn').addEventListener('click', onConnectBtn)
let connection
function onConnectBtn(){
    connection = peer.connect(document.getElementById('enemyCode').value);
    onConnectionOpen()
}
peer.on('connection', function(conn) {
    connection = conn
    onConnectionOpen()
});
function onConnectionOpen(){
    onlineMode = true
    enemyModel.visible = true
    // connection.send({nickName: nick});
    connection.on('data', function(data){
        // console.log(data);
        if (data.position){
            enemyModel.position.x = -data.position.x || enemyModel.position.x
            enemyModel.position.y = data.position.y || enemyModel.position.y
            enemyModel.position.z = -data.position.z || enemyModel.position.z
        }
        if (data.scale){
            enemyModel.scale.y = data.scale.y
        }
        if (data.bullet){
            makeEnemyShoot({ x: -data.bullet.startPosition.x, y: data.bullet.startPosition.y, z: -data.bullet.startPosition.z,}, 
                {x: -data.bullet.endPosition.x, y: data.bullet.endPosition.y, z: -data.bullet.endPosition.z })
        }
        if (data.hit){
            playerModel.healthPoints -= weapons[randomWeapon].characteristics.damage
            document.getElementById('hitEventShow').classList.remove('hitEventShow')
            document.getElementById('hitEventShow').classList.add('hitEventShow')
            hitEventShow
            checkIfNextRound()
        }
        if (data.weapon){
            randomWeapon = Math.max(Math.min(weapons.findIndex(weapon => weapon.name == data.weapon), weapons.length-1), 0)
        }
        if (data.score){
            scoreboard.enemy = data.score.player
            scoreboard.player = data.score.enemy
            onNextRound()
        }
        if (data.nickName){
            console.log(data.nickName)
        }
    });
}
// onLeave
// peer.destroy()
function onConnectionClose(){
    onlineMode = false
    onMenu()
}
peer.on('disconnected', function() { 
    onConnectionClose()
 });
peer.on('close', function() { 
    onConnectionClose()
 });
