
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
// const world = new CANNON.World()
// world.gravity.set(0, -9.8, 0) 

// let groundMaterial = new CANNON.Material()

// var upVector = new CANNON.Vec3(0, 1, 0);
// var contactNormal = new CANNON.Vec3(0, 0, 0);
const playerModel = new THREE.Mesh(  new THREE.BoxGeometry( 2, 4, 2 ), new THREE.MeshBasicMaterial( {color: 0x00ff00} ) );
playerModel.position.set(0, 2, 0)
playerModel.geometry.computeBoundingBox()
playerModel.geometry.userData.obb = new THREE.OBB().fromBox3(
    playerModel.geometry.boundingBox
)
playerModel.userData.obb = new THREE.OBB()
scene.add(playerModel)
const playerModelTest = new THREE.Mesh(  new THREE.BoxGeometry( 2, 4, 2 ), new THREE.MeshBasicMaterial( {color: 0x00ff00} ) );
playerModelTest.visible = false
playerModelTest.position.set(0, 2, 0)
playerModelTest.geometry.computeBoundingBox()
playerModelTest.geometry.userData.obb = new THREE.OBB().fromBox3(
playerModelTest.geometry.boundingBox
)
playerModelTest.userData.obb = new THREE.OBB()
scene.add(playerModelTest)
console.log(playerModel)
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
    flyHorizontalSpeed: {
        x: 0,
        z: 0
    },
    isFlying: false,
    flyMode: false
}
let removeBody
let modelHeight = 3
let flyMode, speedSide = 0, speedForward = 0, speedForwardmax, vSpeed = 0, loadedAssets = 0, loadedTime = 0
let sensitivity = 1
let boxes = [], helpers = [], modelBodies = [], bulletsBody = [], bullets = [], weapons = [], collisionResponsiveObjects = []
let prevPosition = {}
const loader = new THREE.GLTFLoader();
let model, sniperRifle, famasRifle, rifle, pistol
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
                const geometry = new THREE.BoxGeometry( child.scale.x * 2, child.scale.y * 2, child.scale.z * 2 )
                // geometry.userData.obb = new THREE.OBB();
                const hitbox = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true } ) )
                hitbox.geometry.computeBoundingBox()
                hitbox.geometry.userData.obb = new THREE.OBB().fromBox3(
                    hitbox.geometry.boundingBox
                )
                hitbox.userData.obb = new THREE.OBB()

                hitbox.position.set(child.position.x, child.position.y , child.position.z)
                hitbox.rotation.set(child.rotation.x, child.rotation.y , child.rotation.z)
                hitbox.userData.obb.copy(hitbox.geometry.userData.obb)
                scene.add(hitbox)
                collisionResponsiveObjects.push(hitbox)
                const bbox = new THREE.LineSegments( new THREE.EdgesGeometry( new THREE.BoxGeometry( child.scale.x * 2 + 0.02, child.scale.y * 2 + 0.02, child.scale.z * 2 + 0.02 ) ), new THREE.LineBasicMaterial( { color: '#ff5900' } ) );
                bbox.position.set(child.position.x, child.position.y , child.position.z)
                bbox.rotation.set(child.rotation.x, child.rotation.y , child.rotation.z)
                // const helper = new THREE.VertexNormalsHelper( child, 1, 0xff0000 );
                // scene.add( helper );
                // collisionResponsiveObjects.push(bbox)
                scene.add(bbox);
                // let modelBody = new CANNON.Body({
                //     mass: 0,
                //     position: new CANNON.Vec3((box.max.x+box.min.x)/2, (box.max.y+box.min.y)/2, (box.max.z+box.min.z)/2),
                //     shape: new CANNON.Box( new CANNON.Vec3(child.scale.x, child.scale.y, child.scale.z)),
                //     material: groundMaterial
                // })
                // modelBody.quaternion.set(child.quaternion.x, child.quaternion.y, child.quaternion.z, child.quaternion.w)
                // modelBody.quaternion.normalize()
                // world.addBody(modelBody)
                // modelBodies.push(modelBody)
            })
            // model.updateMatrixWorld( true )
            hideLoader()
        }})        
        loader.load('bobs_sniper-rifle.glb', (glb) =>  {
            if (glb){
                scene.add(glb.scene)
                sniperRifle = glb.scene
                sniperRifle.visible = false
                sniperRifle.position.set(0, 40, 0)
                sniperRifle.rotationCameraX = 0.4
                sniperRifle.rotationCameraZ = 0.4
                sniperRifle.rotationCameraY = 0.1
                sniperRifle.rotationCameraKefX = 2
                sniperRifle.rotationCameraKefZ = 2
                sniperRifle.rotationCameraKefY = 0.5
                weapons.push(sniperRifle)
                hideLoader()
            }
        })
        loader.load('famas/scene.glb', (glb) =>  {
            if (glb){
                scene.add(glb.scene)
                famasRifle = glb.scene
                famasRifle.visible = false
                famasRifle.scale.set(0.1,0.1,0.1)
                famasRifle.position.set(0, 40, 0)
                famasRifle.rotationCameraX = 0.4
                famasRifle.rotationCameraZ = 0.4
                famasRifle.rotationCameraY = 0.2
                famasRifle.rotationCameraKefX = 1.5
                famasRifle.rotationCameraKefZ = 1.5
                famasRifle.rotationCameraKefY = 1
                weapons.push(famasRifle)
                hideLoader()
            }
        })
        loader.load('m4/scene.glb', (glb) =>  {
            if (glb){
                scene.add(glb.scene)
                rifle = glb.scene
                rifle.visible = false
                rifle.scale.set(15,15,15)
                rifle.position.set(0, 40, 0)
                rifle.rotationCameraX = 0.4
                rifle.rotationCameraZ = 0.4
                rifle.rotationCameraY = 0.2
                rifle.rotationCameraKefX = 1.5
                rifle.rotationCameraKefZ = 1.5
                rifle.rotationCameraKefY = 0.8
                weapons.push(rifle)
                hideLoader()
            }
        })
        loader.load('pistol/scene.glb', (glb) =>  {
            if (glb){
                scene.add(glb.scene)
                pistol = glb.scene
                pistol.visible = false
                pistol.scale.set(0.15,0.15,0.15)
                pistol.position.set(0, 40, 0)
                pistol.rotationCameraX = 0.6
                pistol.rotationCameraZ = 0.6
                pistol.rotationCameraY = 0.2
                pistol.rotationCameraKefX = 1.5
                pistol.rotationCameraKefZ = 1.5
                pistol.rotationCameraKefY = 1.2
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
// let playerModelMaterial = new CANNON.Material()
// let playerModelBody = new CANNON.Body({
//     mass: 10,
//     position: new CANNON.Vec3(0, 2, 0),
//     shape: new CANNON.Box( new CANNON.Vec3(1, 2, 1) ),
//     fixedRotation: true,
//     type: CANNON.DYNAMIC,
//     material: playerModelMaterial
// })
// const playerGroundContactMaterial = new CANNON.ContactMaterial(playerModelMaterial, groundMaterial, {restitution: 0})
// playerModelBody.name = 'playerModel';
// playerModelBody.mass = 0;
// playerModelBody.updateMassProperties();
// world.addBody(playerModelBody)
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );
renderer.shadowMap.enabled = true;

let floor = new THREE.Mesh( new THREE.BoxGeometry(500, 3, 500), new THREE.MeshBasicMaterial( { color: '#2b2b2b' } ) );
floor.name = 'floor'
// floor.geometry.computeBoundingBox()
// floor.geometry.userData.obb = new THREE.OBB().fromBox3(
//     floor.geometry.boundingBox
// )
// floor.userData.obb = new THREE.OBB()

floor.position.set(0,-1.55,0)
scene.add( floor );
let roof = new THREE.Mesh( new THREE.BoxGeometry(150, 3, 200), new THREE.MeshBasicMaterial( { color: '#2b2b2b' } ) );
roof.visible = false
roof.position.set(0, 31.5, 0)
scene.add( roof );
const stats = Stats()
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( stats.dom );
// let floorBody = new CANNON.Body({
//     mass: 0,
//     position: new CANNON.Vec3(floor.position.x, floor.position.y, floor.position.z),
//     shape: new CANNON.Box(new CANNON.Vec3(250, 1.5, 250)),
//     material: groundMaterial
// }) 
// world.addBody(floorBody) 
// let roofBody = new CANNON.Body({
//     mass: 0,
//     position:  new CANNON.Vec3(roof.position.x, roof.position.y, roof.position.z),
//     shape: new CANNON.Box( new CANNON.Vec3(75, 1.5, 100)),
//     material: groundMaterial
// }) 
// world.addBody(roofBody) 
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
// let prevposition = playerModelBody.position.y
// let prevpositionY = []
// prevpositionY.push(playerModelBody.position.y)
// prevpositionY.push(playerModelBody.position.y)
initSky()
animate();
function animate() {
    composer.render()
    requestAnimationFrame(animate)
    stats.update()

    // if(removeBody) world.remove(removeBody)
    // world.step(1 / 60)
    // cannonDebugRenderer.update()
    // player.isFlying = Math.round(prevposition * 100) - Math.round(playerModelBody.position.y * 100) !== 0
    // player.isFlying = Math.round(prevposition[0] * 100) - Math.round(playerModelBody.position.y * 100) !== 0
    // player.isFlying = playerModelBody.velocity.y < 0
    // console.log(playerModelBody.velocity.y)
    // if (!isGrounded()){
    //     playerModelBody.velocity.x = 0
    //     playerModelBody.velocity.z = 0
    // }
    // console.log(isGrounded())
    
    // prevpositionY = playerModelBody.position.y
    // prevpositionY.push(playerModelBody.position.y)
    // prevpositionY.shift()
    // console.log(playerModelBody.position.y)
    // if (player.isFlying){
    //     console.log('SUIIIII')
    // }

    if (!player.flyMode){
        camera.position.x = playerModel.position.x
        camera.position.y = playerModel.position.y + playerModel.geometry.parameters.height/2 * playerModel.scale.y
        camera.position.z = playerModel.position.z
    }

    // bullets.forEach((bullet, i) => {
    //     bullet.position.copy( bulletsBody[i].position )
    // })
    if (loadedAssets > 4){
        weapons[randomWeapon].position.x = camera.position.x - Math.sin(camera.rotation.y - weapons[randomWeapon].rotationCameraX) * weapons[randomWeapon].rotationCameraKefX
        weapons[randomWeapon].position.z = camera.position.z + Math.cos(Math.PI - camera.rotation.y + weapons[randomWeapon].rotationCameraZ) * weapons[randomWeapon].rotationCameraKefZ
        weapons[randomWeapon].position.y = camera.position.y + Math.min(Math.max((Math.tan(camera.rotation.x + weapons[randomWeapon].rotationCameraY) - weapons[randomWeapon].rotationCameraKefY), -2), 2)
        weapons[randomWeapon].quaternion.copy(camera.quaternion)
    }
    getAdvancedData()

    stats.begin()
    renderer.render( scene, camera );
    stats.end()
};
window.addEventListener('resize', onResize)
document.oncontextmenu = document.body.oncontextmenu = function() {return false;}
let groundedObjectID
function isGrounded(){
    let downDirection = new THREE.Vector3(0, -1, 0);
    const raycaster1 = new THREE.Raycaster();
    raycaster1.far = playerModel.geometry.parameters.height/2 * playerModel.scale.y + 0.1
    raycaster1.set(new THREE.Vector3( playerModel.position.x + playerModel.geometry.parameters.depth/2 ,
         playerModel.position.y, playerModel.position.z + playerModel.geometry.parameters.width/2 ), downDirection)
    let intersects = []
    intersects.push(raycaster1.intersectObjects( scene.children ))
    const raycaster2 = new THREE.Raycaster();
    raycaster2.far = playerModel.geometry.parameters.height/2 * playerModel.scale.y + 0.1
    raycaster2.set(new THREE.Vector3( playerModel.position.x - playerModel.geometry.parameters.depth/2,
        playerModel.position.y, playerModel.position.z - playerModel.geometry.parameters.width/2 ), downDirection)
    intersects.push(raycaster2.intersectObjects( scene.children ))
    const raycaster3 = new THREE.Raycaster();
    raycaster3.far = playerModel.geometry.parameters.height/2 * playerModel.scale.y + 0.1
    raycaster3.set(new THREE.Vector3( playerModel.position.x + playerModel.geometry.parameters.depth/2,
        playerModel.position.y, playerModel.position.z - playerModel.geometry.parameters.width/2 ), downDirection)
    intersects.push(raycaster3.intersectObjects( scene.children ))
    const raycaster4 = new THREE.Raycaster();
    raycaster4.far = playerModel.geometry.parameters.height/2 * playerModel.scale.y + 0.1
    raycaster4.set(new THREE.Vector3( playerModel.position.x - playerModel.geometry.parameters.depth/2 ,
        playerModel.position.y, playerModel.position.z + playerModel.geometry.parameters.width/2 ), downDirection)
    intersects.push(raycaster4.intersectObjects( scene.children ))

    // const raycaster1 = new THREE.Raycaster();
    // raycaster1.far = playerModel.geometry.parameters.height/2 * playerModel.scale.y + 0.05
    // raycaster1.set(new THREE.Vector3( playerModel.position.x, playerModel.position.y, playerModel.position.z), downDirection)
    // let intersects = []
    // intersects.push(raycaster1.intersectObjects( scene.children ))
    // console.log(raycaster1.intersectObjects( scene.children ))
    // playerModel.userData.obb.copy(playerModel.geometry.userData.obb)
    // playerModel.userData.obb.applyMatrix4(playerModel.matrixWorld)
    intersects = intersects.flat(1)
    // console.log(intersects)
    if (intersects[0]){
        intersects.sort((a, b) => {
            if (a.distance > b.distance) return -1
            if (a.distance < b.distance) return 1
            return 0
        })
        console.log(intersects[0])
        if (intersects[0].distance > raycaster1.far * 0.85){
            groundedObjectID = intersects[0].object.id
            playerModel.position.y += (raycaster1.far-0.05) - intersects[0].distance
            // playerModelTest.position.y += raycaster1.far - intersects[0].distance
            console.log('Ground')
            return true 
        }
        // return true    
    }
    // if (intersects.length > 0){
        // intersects.forEach(obj => {
            // let obj = intersects[0]
            // console.log(obj)
            // console.log(obj.object.name == 'floor')
            // if (obj.object.name == 'floor') return true
            // if (obj.object.userData !== undefined){
            //     obj.object.userData.obb.copy(obj.object.geometry.userData.obb)
            //     obj.object.userData.obb.applyMatrix4(obj.object.matrixWorld)
            //     if (obj.object.userData.obb.intersectsOBB(playerModel.userData.obb)) return true
            // }
            // console.log(obj)
            
        // })
        // console.log(intersects[0])
        // if (intersects[0]) {
        //     if (intersects[0].object.name = 'floor') return true
        //     if (obj.object.userData !== undefined){
        //         console.log('OBB')
        //         obj.object.userData.obb.copy(obj.object.geometry.userData.obb)
        //         obj.object.userData.obb.applyMatrix4(obj.object.matrixWorld)
        //         if (obj.object.userData.obb.intersectsOBB(playerModel.userData.obb)) return true
        //     }
        // }
        // if (intersects[0].object.name == 'floor') return true
        // } else {
            //     return true
            // }
            console.log('Fly')
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
    if (!isGrounded() && !isFuseSpamSpace && !isGravityAttractioning){
        clearInterval(smoothGravityAttraction)
        isGravityAttractioning = true
        velOfGravityAttractionIndex = 0
        smoothGravityAttraction = setInterval(() => {
            if (!isGrounded()){
                ++velOfGravityAttractionIndex
                playerModel.position.y -= 0.002 * velOfGravityAttractionIndex
                playerModelTest.position.y -= 0.002 * velOfGravityAttractionIndex
            } else {
                isGravityAttractioning = false
                clearInterval(smoothGravityAttraction)
            }
        }, 5)
    }
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
                // if (isGrounded() && !checkCollision()){
                    if (isGrounded()){
                        checkCollision()
                    isOnLanding = false
                    player.flyHorizontalSpeed.x = player.speed.x
                    player.flyHorizontalSpeed.z = player.speed.z
                    playerModel.prevPosition = {
                        x: playerModel.position.x,
                        y: playerModel.position.y,
                        z: playerModel.position.z
                    }
                    // if (player.speed.z > 0){
                    //     playerModel.position.x += Math.sin(camera.rotation.y) * -player.speed.z
                    //     playerModel.position.z += Math.cos(Math.PI - camera.rotation.y) * player.speed.z
                    // }
                    // if (player.speed.z < 0){
                    //     playerModel.position.x += Math.sin(camera.rotation.y) * -player.speed.z
                    //     playerModel.position.z += -Math.cos(camera.rotation.y) * player.speed.z  
                    // }
                    // if (player.speed.x > 0){
                    //     playerModel.position.x += Math.sin(camera.rotation.y + Math.PI / 2) * player.speed.x 
                    //     playerModel.position.z += -Math.cos(camera.rotation.y + Math.PI / 2) * -player.speed.x 
                    // }
                    // if (player.speed.x < 0){
                    //     playerModel.position.x += Math.sin(camera.rotation.y - Math.PI / 2) * -player.speed.x 
                    //     playerModel.position.z += -Math.cos(camera.rotation.y - Math.PI / 2) * player.speed.x
                    // }
                    if (player.speed.z > 0){
                        // console.log(checkCollision(Math.sin(camera.rotation.y) * -player.speed.z, Math.cos(Math.PI - camera.rotation.y) * player.speed.z))
                        // if (!checkCollision(Math.sin(camera.rotation.y) * -player.speed.z, Math.cos(Math.PI - camera.rotation.y) * player.speed.z)){
                        //     playerModel.position.x += Math.sin(camera.rotation.y) * -player.speed.z
                        //     playerModel.position.z += Math.cos(Math.PI - camera.rotation.y) * player.speed.z
                        // }
                        playerModel.position.x += Math.sin(camera.rotation.y) * -player.speed.z
                        playerModel.position.z += Math.cos(Math.PI - camera.rotation.y) * player.speed.z
                    }
                    if (player.speed.z < 0){
                        // if (!checkCollision(Math.sin(camera.rotation.y) * -player.speed.z, -Math.cos(camera.rotation.y) * player.speed.z)){
                        //     playerModel.position.x += Math.sin(camera.rotation.y) * -player.speed.z
                        //     playerModel.position.z += -Math.cos(camera.rotation.y) * player.speed.z  
                        // }
                        playerModel.position.x += Math.sin(camera.rotation.y) * -player.speed.z
                        playerModel.position.z += -Math.cos(camera.rotation.y) * player.speed.z  
                    }
                    if (player.speed.x > 0){
                        // if (!checkCollision(Math.sin(camera.rotation.y + Math.PI / 2) * player.speed.x , -Math.cos(camera.rotation.y + Math.PI / 2) * -player.speed.x)){
                        //     playerModel.position.x += Math.sin(camera.rotation.y + Math.PI / 2) * player.speed.x 
                        //     playerModel.position.z += -Math.cos(camera.rotation.y + Math.PI / 2) * -player.speed.x 
                        // }
                        playerModel.position.x += Math.sin(camera.rotation.y + Math.PI / 2) * player.speed.x 
                        playerModel.position.z += -Math.cos(camera.rotation.y + Math.PI / 2) * -player.speed.x 
                    }
                    if (player.speed.x < 0){
                        // if (!checkCollision(Math.sin(camera.rotation.y - Math.PI / 2) * -player.speed.x , -Math.cos(camera.rotation.y - Math.PI / 2) * player.speed.x)){
                        //     playerModel.position.x += Math.sin(camera.rotation.y - Math.PI / 2) * -player.speed.x 
                        //     playerModel.position.z += -Math.cos(camera.rotation.y - Math.PI / 2) * player.speed.x
                        // }
                        playerModel.position.x += Math.sin(camera.rotation.y - Math.PI / 2) * -player.speed.x 
                        playerModel.position.z += -Math.cos(camera.rotation.y - Math.PI / 2) * player.speed.x
                    }
                    // checkCollision()
                }
                else {
                    // if (!checkCollision()){
                        onLanding()
                    // }
                    gravityAttraction()
                }
            }
        } else {
            clearInterval( smoothlyMove )
        }
    }, 5)
}
// function checkCollision(){
//     playerModel.userData.obb.copy(playerModel.geometry.userData.obb)
//     playerModel.userData.obb.applyMatrix4(playerModel.matrixWorld)
//     collisionResponsiveObjects.forEach(obj => {
//         obj.userData.obb.copy(obj.geometry.userData.obb)
//         obj.userData.obb.applyMatrix4(obj.matrixWorld)
//         if (obj.userData.obb.intersectsOBB(playerModel.userData.obb)) {
//             if (!isGrounded()){
//                 clearInterval(onLandingInterval)
//                 clearInterval(smoothlyJump)
//                 gravityAttraction()
//             }
//             obj.material.color.set('red')
//             // console.log('COLLISION')
//             // console.log((obj.userData.obb.intersectsOBB(playerModel.userData.obb)))
//             // console.log(playerModel.prevPosition)
//             // console.log(playerModel.position.z - playerModel.prevPosition.z)
//             // playerModel.position.set(playerModel.prevPosition.x, playerModel.position.y, playerModel.prevPosition.z)
//             playerModel.position.x -= (playerModel.position.x - playerModel.prevPosition.x) * 3
//             playerModel.position.z -= (playerModel.position.z - playerModel.prevPosition.z) * 3
//             if (obj.userData.obb.intersectsOBB(playerModel.userData.obb)) {
//                 obj.material.color.set('red')
//             } else {
//                 obj.material.color.set('green')
//             }
//             return true
//         } else {
//             obj.material.color.set('green')
//             return false
//         }
//     })
// }
function checkCollision(){
        playerModel.userData.obb.copy(playerModel.geometry.userData.obb)
        playerModel.userData.obb.applyMatrix4(playerModel.matrixWorld)
        let isCollision = false
        for (const obj of collisionResponsiveObjects){
            obj.userData.obb.copy(obj.geometry.userData.obb)
            obj.userData.obb.applyMatrix4(obj.matrixWorld)
            // console.log(groundedObject)
            // console.log(obj)
            if (obj.userData.obb.intersectsOBB(playerModel.userData.obb)) {
                if (!isGrounded()){
                    clearInterval(onLandingInterval)
                    clearInterval(smoothlyJump)
                    gravityAttraction()
                }
                obj.material.color.set('red')
                // console.log('COLLISION')
                // console.log((obj.userData.obb.intersectsOBB(playerModel.userData.obb)))
                // console.log(playerModel.prevPosition)
                // console.log(playerModel.position.z - playerModel.prevPosition.z)
                playerModel.position.set(playerModel.prevPosition.x, playerModel.position.y, playerModel.prevPosition.z)
                // playerModel.position.x -= (playerModel.position.x - playerModel.prevPosition.x) * 2
                // playerModel.position.z -= (playerModel.position.z - playerModel.prevPosition.z) * 2
                isCollision = true
                break
            } else {
                obj.material.color.set('green')
            }
        }
        return isCollision

}
// function checkCollision(xCor, zCor){
//     playerModelTest.position.set(playerModel.position.x + xCor*2, playerModel.position.y, playerModel.position.z + zCor*2)
//     playerModelTest.userData.obb.copy(playerModelTest.geometry.userData.obb)
//     playerModelTest.userData.obb.applyMatrix4(playerModelTest.matrixWorld)
//     playerModel.userData.obb.copy(playerModel.geometry.userData.obb)
//     playerModel.userData.obb.applyMatrix4(playerModel.matrixWorld)
//     let isCollision = false
//     // collisionResponsiveObjects.forEach(obj => {
//     for (const obj of collisionResponsiveObjects){
//         obj.userData.obb.copy(obj.geometry.userData.obb)
//         obj.userData.obb.applyMatrix4(obj.matrixWorld)
//         // console.log('A')
//         // console.log(obj.userData.obb.intersectsOBB(playerModelTest.userData.obb))
//         if (obj.userData.obb.intersectsOBB(playerModel.userData.obb)) {
//             obj.material.color.set('red')
//             break
//         } else {
//             obj.material.color.set('green')
//         }
//         if (obj.userData.obb.intersectsOBB(playerModelTest.userData.obb)) {
//             // if (!isGrounded()){
//             //     clearInterval(onLandingInterval)
//             //     clearInterval(smoothlyJump)
//             //     gravityAttraction()
//             // }
//             isCollision = true
//             break
//         }
//         // if (obj.userData.obb.intersectsOBB(playerModelTest.userData.obb)) return true
//         // return false
//     }
//     return isCollision
// }
let isFuseSpamSpace, jumpHorizontalMoving, velOfJumpIndex
function makeJump(){
    if (isGrounded() && !isFuseSpamSpace){
        isFuseSpamSpace = true
        onLanding()
        velOfJumpIndex = 60
        setTimeout(() => {
            isFuseSpamSpace = false
            clearInterval(smoothlyJump)
            gravityAttraction()
        }, 240)
        smoothlyJump = setInterval(() => {
            --velOfJumpIndex
            playerModel.position.y += 0.002 * velOfJumpIndex
            playerModelTest.position.y += 0.002 * velOfJumpIndex
        }, 5)
    }
}
let smoothDucking
function makeDuck(front){
    console.log('DUCK')
    if (front){
        clearInterval(smoothDucking)
        smoothDucking = setInterval(() => {
            if (playerModel.scale.y > 0.5){
                playerModel.scale.y -=  1/50
                playerModel.position.y -= playerModel.geometry.parameters.depth / 50
                playerModelTest.scale.y -=  1/50
                playerModelTest.position.y -= playerModelTest.geometry.parameters.depth / 50
                // playerModel.geometry.computeBoundingBox()
            } else {
                playerModel.scale.y = 0.5
                playerModelTest.scale.y = 0.5
                clearInterval(smoothDucking)
            }
        }, 5)

    } else {
        clearInterval(smoothDucking)
        smoothDucking = setInterval(() => {
            if (playerModel.scale.y < 1){
                playerModel.scale.y += 1/50
                playerModel.position.y += playerModel.geometry.parameters.depth / 50
                playerModelTest.scale.y += 1/50
                playerModelTest.position.y += playerModel.geometry.parameters.depth / 50
                // playerModel.geometry.computeBoundingBox()
            } else {
                playerModel.scale.y = 1
                playerModelTest.scale.y = 1
                clearInterval(smoothDucking)
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
            // if (!isGrounded() && !checkCollision()){
                if (!isGrounded()){
                checkCollision()
                playerModel.prevPosition = {
                    x: playerModel.position.x,
                    y: playerModel.position.y,
                    z: playerModel.position.z
                }
                if (player.flyHorizontalSpeed.z > 0){
                    // if (!checkCollision(Math.sin(camera.rotation.y) * -player.flyHorizontalSpeed.z, Math.cos(Math.PI - camera.rotation.y) * player.flyHorizontalSpeed.z)){
                        playerModel.position.x += Math.sin(camera.rotation.y) * -player.flyHorizontalSpeed.z
                        playerModel.position.z += Math.cos(Math.PI - camera.rotation.y) * player.flyHorizontalSpeed.z
                    // }
                    // if (!checkCollision(Math.sin(camera.rotation.y) * -player.flyHorizontalSpeed.z, 0)){
                    //     playerModel.position.x += Math.sin(camera.rotation.y) * -player.flyHorizontalSpeed.z
                    // }
                    // if (!checkCollision(0, Math.cos(Math.PI - camera.rotation.y) * player.flyHorizontalSpeed.z)){
                    //     playerModel.position.z += Math.cos(Math.PI - camera.rotation.y) * player.flyHorizontalSpeed.z
                    // }
                }
                if (player.flyHorizontalSpeed.z < 0){
                    // if (!checkCollision(Math.sin(camera.rotation.y) * -player.flyHorizontalSpeed.z, -Math.cos(camera.rotation.y) * player.flyHorizontalSpeed.z)){
                        playerModel.position.x += Math.sin(camera.rotation.y) * -player.flyHorizontalSpeed.z
                        playerModel.position.z += -Math.cos(camera.rotation.y) * player.flyHorizontalSpeed.z
                    // }
                }
                if (player.flyHorizontalSpeed.x > 0){
                    // if (!checkCollision(Math.sin(camera.rotation.y + Math.PI / 2) * player.flyHorizontalSpeed.x, -Math.cos(camera.rotation.y + Math.PI / 2) * -player.flyHorizontalSpeed.x)){
                        playerModel.position.x += Math.sin(camera.rotation.y + Math.PI / 2) * player.flyHorizontalSpeed.x
                        playerModel.position.z += -Math.cos(camera.rotation.y + Math.PI / 2) * -player.flyHorizontalSpeed.x
                    // }
                }
                if (player.flyHorizontalSpeed.x < 0){
                    // if (!checkCollision(Math.sin(camera.rotation.y - Math.PI / 2) * -player.flyHorizontalSpeed.x, -Math.cos(camera.rotation.y - Math.PI / 2) * player.flyHorizontalSpeed.x)){
                        playerModel.position.x += Math.sin(camera.rotation.y - Math.PI / 2) * -player.flyHorizontalSpeed.x
                        playerModel.position.z += -Math.cos(camera.rotation.y - Math.PI / 2) * player.flyHorizontalSpeed.x
                    // }
                }
            } else {
                clearInterval(onLandingInterval)
            }
        }, 5)
    }
}
// function onPlayerModelCollide({ contact: { bi } }) {
//     if (bi.name !== 'bullet'){
//         console.log('TAKE IT')
//         // console.log(bi)
//         // playerModelBody.velocity.x = playerModelBody.velocity.x * 2
//         // playerModelBody.velocity.z = playerModelBody.velocity.z * 2
//         // clearInterval(onLandingInterval)
//         // playerModelBody.removeEventListener('collide', onPlayerModelCollide);
//     }
// }
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
            // if (!player.isFlying){
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
    // let bulletBody = new CANNON.Body({
    //     mass: 1,
    //     position: camera.position,
    //     shape: new CANNON.Box( new CANNON.Vec3(0.05, 0.05, 0.2)),
    //     quaternion: camera.quaternion
    // })
    // bulletsBody.push(bulletBody)
    // bulletBody.quaternion.normalize()
    // bulletBody.position.x += Math.sin(camera.rotation.y) * -2
    // bulletBody.position.z += Math.cos(Math.PI - camera.rotation.y) * 2
    // bulletBody.position.y += Math.tan(camera.rotation.x) * 1 - 0.5
    // bulletBody.name = 'bullet'
    // const raycaster = new THREE.Raycaster();
    // const pointer = new THREE.Vector2();
    // pointer.x = ( (window.innerWidth/2) / window.innerWidth ) * 2 - 1;
    // pointer.y = - ( ((window.innerHeight+2)/2) / window.innerHeight ) * 2 + 1;
    // raycaster.setFromCamera( pointer, camera );
    // const intersects = raycaster.intersectObjects( scene.children );
    // let intersetsExpectBullets = intersects.filter(e => e.object.name !== 'bullet')
    // bulletBody.endPosition = {
    //     x: intersetsExpectBullets[0].point.x - Math.sin(camera.rotation.y) * -0.3,
    //     y: Math.max((intersetsExpectBullets[0].point.y - Math.tan(camera.rotation.x) * 0.15 - intersetsExpectBullets[0].distance * 0.02), 0),
    //     z: intersetsExpectBullets[0].point.z - Math.cos(Math.PI - camera.rotation.y) * 0.3,
    // }
    // world.addBody(bulletBody)
    // let grounded
    // bulletBody.velocity.x += Math.sin(camera.rotation.y) * -200
    // bulletBody.velocity.z += Math.cos(Math.PI - camera.rotation.y) * 200
    // bulletBody.velocity.y += Math.tan(camera.rotation.x) * 200
    // bulletBody.addEventListener('collide', function onBulletCollide({ contact: { bi } }) {
    //     if (bi.name !== 'bullet' && bi.name !== 'playerModel'){
    //         bulletBody.velocity.set(0,0,0)
    //         // const vTo = new CANNON.Vec3(Math.sin(camera.rotation.y) * -2000, Math.cos(Math.PI - camera.rotation.y) * 2000, Math.tan(camera.rotation.x) * 1000)
    //         // const ray = new CANNON.Ray(bulletBody.position, vTo)
    //         // const result = new CANNON.RaycastResult()
    //         // ray.intersectBody(bi, result)
    //         // grounded = result.hasHit
    //         // bi.id == 25 ? console.log('HIT') : null
    //         let endPosition = bulletBody.endPosition
    //         bulletBody.position.x = endPosition.x
    //         bulletBody.position.y = endPosition.y
    //         bulletBody.position.z = endPosition.z
    //         removeBody = bulletBody;
    //         this.removeEventListener('collide', onBulletCollide);
    //     }
    // })
}
document.getElementById('onPlay').addEventListener('click', onPlay)
let randomWeapon = 0
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
    // playerModelBody.mass = 10;
    // playerModelBody.updateMassProperties();
    // playerModelBody.velocity.y = 1
    gravityAttraction()
    randomWeapon = Math.floor(Math.random() * 3.9)
    weapons[randomWeapon].visible = true
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
    weapons.forEach(e => {e.visible = false; e.position.set(0, 40, 0)})
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







