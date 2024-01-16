const menuBg = document.getElementById('menuBg')
const weaponsBtns = Array.from(document.getElementsByClassName('weapons'))
const activeBtnColor = 'rgb(255, 89, 0)'
const playerScore = document.getElementById('playerScore')
const enemyScore = document.getElementById('enemyScore')
const healthPointsLbl = document.getElementById('healthPointsLbl')
const healthBar = document.getElementById('healthBar')
const easyDiff = document.getElementById('easyDiff')
const mediumDiff = document.getElementById('mediumDiff')
const hardDiff = document.getElementById('hardDiff')
const playerNick = document.getElementById('playerNick')
const enemyNick = document.getElementById('enemyNick')
const playerNickname = document.getElementById('playerNickname')
const enemyShowNick = document.getElementById('enemyShowNick')

const defaultSpeed = 0.1;

const cameraPOV = 45;
const cameraNear = 0.1;
const cameraFar = 1000;

const skyScale = 4500;
const skyTurbidity = 10;
const skyRayleigh = 4;
const skyMieCoefficient = 0.05;
const skyMieDirectionalG = 1;

const rightAngle = 90;

const maxHealthPoints = 100;

const scene = new THREE.Scene();

const aspectRatio = window.innerWidth / window.innerHeight
const camera = new THREE.PerspectiveCamera(cameraPOV, aspectRatio, cameraNear, cameraFar);

const vector = new THREE.Vector3();
const euler = new THREE.Euler(0, 0, 0, 'YXZ');

const peer = new Peer();

let onlineMode, inGame;
const scoreboard = { player: 0, enemy: 0 };

let soundVolume = 0.5
let musicVolume = 0.5
let botDifficult = 1

function initSky() {
    const sky = new Sky();
    sky.scale.setScalar(skyScale);
    scene.add(sky);

    const sun = new THREE.Vector3();
    sky.material.uniforms['turbidity'].value = skyTurbidity;
    sky.material.uniforms['rayleigh'].value = skyRayleigh;
    sky.material.uniforms['mieCoefficient'].value = skyMieCoefficient;
    sky.material.uniforms['mieDirectionalG'].value = skyMieDirectionalG;

    const phi = THREE.MathUtils.degToRad(rightAngle);
    const theta = THREE.MathUtils.degToRad(rightAngle);
    sun.setFromSphericalCoords(1, phi, theta);
    sky.material.uniforms['sunPosition'].value.copy(sun);
}
initSky();

const modelColor = 'aqua';
const modelSize = 2;
const modelHeight = 4;
const isThisEnemyModel = true;

const playerModelGeometry = new THREE.BoxGeometry(modelSize, modelHeight, modelSize);
const playerModelMaterial = new THREE.MeshBasicMaterial({ color: modelColor, visible: !isThisEnemyModel });
const playerModel = new THREE.Mesh(playerModelGeometry, playerModelMaterial);

function addPlayerModel() {
    playerModel.position.set(0, modelHeight / 2, 0)
    playerModel.name = "playermodel"
    playerModel.geometry.computeBoundingBox()
    playerModel.geometry.userData.obb = new THREE.OBB().fromBox3(playerModel.geometry.boundingBox)
    playerModel.userData.obb = new THREE.OBB()
    playerModel.healthPoints = maxHealthPoints
    scene.add(playerModel)
}
addPlayerModel()

const modelForBotTargetGeometry = new THREE.BoxGeometry(modelSize, modelHeight / 2, modelSize);
const modelForBotTargetMaterial = new THREE.MeshBasicMaterial({ color: modelColor, visible: !isThisEnemyModel });
const modelForBotTarget = new THREE.Mesh(modelForBotTargetGeometry, modelForBotTargetMaterial);

function addModelForBotTarget() {
    modelForBotTarget.name = 'modelForBotTarget'
    scene.add(modelForBotTarget)
}
addModelForBotTarget()

const enemyModelGeometry = new THREE.BoxGeometry(modelSize, modelHeight, modelSize);
const enemyModelMaterial = new THREE.MeshBasicMaterial({ color: modelColor, visible: isThisEnemyModel, wireframe: isThisEnemyModel });
const enemyModel = new THREE.Mesh(enemyModelGeometry, enemyModelMaterial);

function addEnemyModel() {
    enemyModel.position.set(0, modelHeight / 2, 0)
    enemyModel.name = "enemymodel"
    enemyModel.geometry.computeBoundingBox()
    enemyModel.geometry.userData.obb = new THREE.OBB().fromBox3(enemyModel.geometry.boundingBox)
    enemyModel.userData.obb = new THREE.OBB()
    enemyModel.healthPoints = maxHealthPoints
    scene.add(enemyModel)
}
addEnemyModel()

const player = {};

function createPlayer() {
    player.speed = new THREE.Vector3();
    player.realSpeed = new THREE.Vector3();
    player.maxSpeed = new THREE.Vector2();
    player.position = new THREE.Vector3();
    player.flyHorizontalSpeed = new THREE.Vector2();
    player.isFlying = false;
}
createPlayer();

function createHitBox(child) {
    const [x, y, z] = [child.scale.x * 2, child.scale.y * 2, child.scale.z * 2]
    const hitboxGeometry = new THREE.BoxGeometry(x, y, z);
    const hitboxMaterial = new THREE.MeshBasicMaterial({ color: 'white', wireframe: false, visible: false });
    const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);

    hitbox.geometry.computeBoundingBox()
    hitbox.geometry.userData.obb = new THREE.OBB().fromBox3(hitbox.geometry.boundingBox);
    hitbox.userData.obb = new THREE.OBB()
    hitbox.position.set(child.position.x, child.position.y, child.position.z)
    hitbox.rotation.set(child.rotation.x, child.rotation.y, child.rotation.z)
    hitbox.userData.obb.copy(hitbox.geometry.userData.obb)
    hitbox.name = "hitbox"

    scene.add(hitbox)
    collisionResponsiveObjects.push(hitbox)
}

function createBbox(child) {
    const padding = 0.02;
    const [x, y, z] = [child.scale.x * 2, child.scale.y * 2, child.scale.z * 2]
    const bboxBoxGeometry = new THREE.BoxGeometry(x + padding, y + padding, z + padding);
    const bboxGeometry = new THREE.EdgesGeometry(bboxBoxGeometry);
    const bboxMaterial = new THREE.LineBasicMaterial({ color: '#ff5900' });
    const bbox = new THREE.LineSegments(bboxGeometry, bboxMaterial);

    bbox.position.set(child.position.x, child.position.y, child.position.z)
    bbox.rotation.set(child.rotation.x, child.rotation.y, child.rotation.z)
    bbox.name = "bbox"

    scene.add(bbox);
}

const modelHeadLevel = 3
let sensitivity = 1, sensitivityX = 1, sensitivityY = 1
let boxes = [], helpers = [], bullets = [], weapons = [];
let enemyWeapons = [], collisionResponsiveObjects = [], spawnEnemyAndPath = [], spawnArea = [], allWeapons = []
let model, sniperRifle, famasRifle, rifle, pistol;

const loader = new THREE.GLTFLoader();

async function loadModels() {
    await loadMap();
    await loadSniperRifleWeapon();
    await loadFamasWeapon();
    await loadRifleWeapon();
    await loadPistolWeapon();

    hideLoader();
}
loadModels();

async function loadMap() {
    return new Promise((resolve) => {
        loader.load('models/aimmap.glb', (glb) => {
            if (glb) {
                model = glb.scene;
                model.scale.set(1, 1, 1);
                model.position.set(0, 0, 0);
                model.rotation.set(0, 0, 0);
                model.castShadow = true;
                scene.add(model);
                model.children.forEach(child => {
                    if (child.name.slice(0, 4) == 'Cube') {
                        createHitBox(child);
                        createBbox(child);
                    } else {
                        child.visible = false;

                        if (child.name.slice(0, 4) == 'Path' || child.name.slice(0, 10) == 'SpawnEnemy') {
                            spawnEnemyAndPath.push(child);
                        } else {
                            spawnArea.push(child);
                        }
                    }
                })
            }
            resolve(0);
        })
    })
}

async function loadSniperRifleWeapon() {
    return new Promise((resolve) => {
        loader.load('models/bobs_sniper-rifle.glb', (glb) => {
            if (glb) {
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
                allWeapons.push(sniperRifle)
            }
            resolve(0);
        })
    })
}

async function loadFamasWeapon() {
    return new Promise((resolve) => {
        loader.load('models/famas/scene.glb', (glb) => {
            if (glb) {
                famasRifle = glb.scene
                scene.add(famasRifle)
                famasRifle.visible = false
                famasRifle.scale.set(0.1, 0.1, 0.1)
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
                allWeapons.push(famasRifle)
            }
            resolve(0);
        })
    })
}

async function loadRifleWeapon() {
    return new Promise((resolve) => {
        loader.load('models/m4/scene.glb', (glb) => {
            if (glb) {
                rifle = glb.scene
                scene.add(rifle)
                rifle.visible = false
                rifle.scale.set(15, 15, 15)
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
                allWeapons.push(rifle)
            }
            resolve(0);
        })
    })
}

async function loadPistolWeapon() {
    return new Promise((resolve) => {
        loader.load('models/pistol/scene.glb', (glb) => {
            if (glb) {
                pistol = glb.scene
                scene.add(pistol)
                pistol.visible = false
                pistol.scale.set(0.15, 0.15, 0.15)
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
                allWeapons.push(pistol)
            }
            resolve(0);
        })
    })
}

const loaderBlock = document.getElementById('loader');
const hideDisplay = 'none';

function hideLoader() {
    loaderBlock.style.display = hideDisplay;
}

const renderToneMappingExposure = 1;
const renderer = new THREE.WebGLRenderer();

function initRender() {
    document.body.appendChild(renderer.domElement);

    renderer.setSize(window.innerWidth, window.innerHeight);

    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.enabled = true

    renderer.toneMapping = THREE.LinearToneMapping
    renderer.toneMappingExposure = renderToneMappingExposure
}
initRender();


const sceneMapDefaultColor = '#2b2b2b';
const mapSize = 500;
const boxDepth = 3;
const floorLevel = -1.55;
const roofLevel = 31.5;

function createMapBase() {
    createFloor();
    createRoof();
}
createMapBase();

function createFloor() {
    const floorGeometry = new THREE.BoxGeometry(mapSize, boxDepth, mapSize);
    const floorMaterial = new THREE.MeshBasicMaterial({ color: sceneMapDefaultColor })
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);

    floor.name = 'floor'
    floor.position.set(0, floorLevel, 0)

    scene.add(floor);
}

function createRoof() {
    const roofGeometry = new THREE.BoxGeometry(mapSize, boxDepth, mapSize);
    const roofMaterial = new THREE.MeshBasicMaterial({ color: sceneMapDefaultColor });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);

    roof.visible = false
    roof.position.set(0, roofLevel, 0)
    scene.add(roof);
}

const stats = Stats();

function initStats() {
    stats.showPanel(4); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild(stats.dom);
}
initStats();

function createDirectionalLight(position, color, intensity) {
    const { x, y, z } = position;
    const directionalLight1 = new THREE.DirectionalLight(color, intensity);

    directionalLight1.position.set(x, y, z);

    scene.add(directionalLight1);
}

const defaultDirectionalLightColor = '#ffffff';
const defaultDirectionalLightIntensity = 0.2;
const lightDistanceRange = 200;

function initLight() {
    let position;
    const [color, intensity] = [defaultDirectionalLightColor, defaultDirectionalLightIntensity];

    position = new THREE.Vector3(0, lightDistanceRange, lightDistanceRange);
    createDirectionalLight(position, color, intensity);

    position = new THREE.Vector3(0, lightDistanceRange, -lightDistanceRange);
    createDirectionalLight(position, color, intensity);

    position = new THREE.Vector3(lightDistanceRange, lightDistanceRange, 0);
    createDirectionalLight(position, color, intensity);

    position = new THREE.Vector3(-lightDistanceRange, lightDistanceRange, 0);
    createDirectionalLight(position, color, intensity);
}
initLight();

const composer = new THREE.EffectComposer(renderer);
const windowResolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
const bloomPassStength = 3;
const bloomPassRadius = 1;
const bloomPassThreshold = 0;

function initShaders() {
    const renderPass = new THREE.RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new THREE.UnrealBloomPass(windowResolution, 0.1, 0.1, 0.2);
    composer.addPass(bloomPass);

    bloomPass.stength = bloomPassStength;
    bloomPass.radius = bloomPassRadius;
    bloomPass.threshold = bloomPassThreshold;
}
initShaders();

const defaultPositionOrder = 'YXZ';
const defaultPosition = new THREE.Vector3(0, modelHeadLevel, 0);
function initCamera() {
    camera.position.set(defaultPosition);
    camera.rotation.order = defaultPositionOrder;
}
initCamera();

function cameraPositionUpdate() {
    const halfPlayerModelHeight = playerModel.geometry.parameters.height / 2;
    const cameraLevel = halfPlayerModelHeight * playerModel.scale.y;

    camera.position.copy(playerModel.position);
    camera.position.y += cameraLevel;
}

function modelForBotTargetPositionUpdate() {
    modelForBotTarget.position.copy(playerModel.position)
    modelForBotTarget.position.y += playerModel.geometry.parameters.height
}

Math.range = function (value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function updateWeaponPosition() {
    if (weapons.length > 0) {
        const weapon = weapons[randomWeapon];
        const tanEdgeValue = 2;

        const { rotationCameraKefX, rotationCameraKefZ, rotationCameraKefY } = weapon;
        const { rotationCameraX, rotationCameraZ, rotationCameraY } = weapon;

        const sinParam = camera.rotation.y - rotationCameraX;
        const cosParam = Math.PI - camera.rotation.y + rotationCameraZ;
        const tanParam = camera.rotation.x + rotationCameraY;

        weapon.position.copy(camera.position);
        weapon.position.x += -Math.sin(sinParam) * rotationCameraKefX;
        weapon.position.z += Math.cos(cosParam) * rotationCameraKefZ;
        weapon.position.y += Math.range(Math.tan(tanParam) - rotationCameraKefY, -tanEdgeValue, tanEdgeValue);

        weapon.quaternion.copy(camera.quaternion);
        weapon.rotation.z += weapon.rotationZ;
    }
}

function render() {
    stats.begin();
    renderer.render(scene, camera);
    stats.end();
}

function animate() {
    composer.render();
    requestAnimationFrame(animate);
    stats.update();

    cameraPositionUpdate();
    modelForBotTargetPositionUpdate();

    updateWeaponPosition();
    getAdvancedData();

    render();
};
animate();

playerNickname.value = localStorage.getItem('nick') || 'Player'
window.addEventListener('resize', onResize)
document.oncontextmenu = () => false;

const downDirection = new THREE.Vector3(0, -1, 0);
function isGrounded(model) {
    const raycaster = new THREE.Raycaster();
    const modelHalfSize = model.geometry.parameters.depth / 2;
    const { x, y, z } = model.position;
    let raycasterPositions = [], intersects = [], position;

    position = new THREE.Vector3(x + modelHalfSize, y, z + modelHalfSize);
    raycasterPositions.push(position);

    position = new THREE.Vector3(x - modelHalfSize, y, z - modelHalfSize);
    raycasterPositions.push(position);

    position = new THREE.Vector3(x + modelHalfSize, y, z - modelHalfSize);
    raycasterPositions.push(position);

    position = new THREE.Vector3(x - modelHalfSize, y, z + modelHalfSize);
    raycasterPositions.push(position);

    position = new THREE.Vector3(x + modelHalfSize, y, z);
    raycasterPositions.push(position);

    position = new THREE.Vector3(x - modelHalfSize, y, z);
    raycasterPositions.push(position);

    position = new THREE.Vector3(x, y, z + modelHalfSize);
    raycasterPositions.push(position);

    position = new THREE.Vector3(x, y, z - modelHalfSize);
    raycasterPositions.push(position);

    position = new THREE.Vector3(x, y, z);
    raycasterPositions.push(position);

    const padding = 0.1;
    raycaster.far = model.geometry.parameters.height / 2 * model.scale.y + padding;
    raycasterPositions.forEach(ray => {
        raycaster.set(ray, downDirection);
        intersects.push(raycaster.intersectObjects(scene.children));
    })

    const raycasterFarKef = 0.85;

    intersects = intersects.flat(1)
    intersects = intersects.filter(e => e.distance > raycaster.far * raycasterFarKef);
    intersects = intersects.filter(e =>
        e.object.name.slice(0, 4) !== 'Path' &&
        e.object.name.slice(0, 10) !== 'SpawnEnemy' &&
        e.object.name.slice(0, 5) !== 'Spawn'
    );

    if (intersects[0]) {
        intersects.sort((a, b) => {
            if (a.distance > b.distance) return 1
            if (a.distance < b.distance) return -1
            return 0
        })

        
        model.position.y += (raycaster.far - padding/2) - intersects[0].distance
        if (onlineMode && model.name == 'playermodel') {
            connection.send({ 
                position: { 
                    y: playerModel.position.y,
                    x: playerModel.position.x,
                    z: playerModel.position.z 
                }
            });
        }
        return true
    }
    return false
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('beforeunload', function (event) {
    event.stopPropagation();
    event.preventDefault();
    return false;
}, true);

let keys;
let smoothGravityAttraction, velOfGravityAttractionIndex, isGravityAttractioning;
const defaultPlayerModelScale = 1;
const duckPlayerModelScale = 0.5;
const gravityKef = 0.002;
const notFullSizePlayerModelKef = 75;

function gravityAttraction() {
    if (!isGrounded(playerModel) && !isFuseSpamSpace && !isGravityAttractioning) {
        clearInterval(smoothGravityAttraction)
        
        isGravityAttractioning = true
        velOfGravityAttractionIndex = 0

        smoothGravityAttraction = setInterval(() => {
            if (!isGrounded(playerModel)) {
                ++velOfGravityAttractionIndex

                if (playerModel.scale.y > duckPlayerModelScale &&
                    playerModel.scale.y < defaultPlayerModelScale
                ) {
                    const playerModeSize = playerModel.geometry.parameters.depth;
                    playerModel.position.y += gravityKef * -velOfGravityAttractionIndex - playerModeSize / notFullSizePlayerModelKef
                } else {
                    playerModel.position.y += gravityKef * -velOfGravityAttractionIndex
                }
            } else {
                if (sounds.jump) {
                    if (soundPlayerSteps.isPlaying) {
                        soundPlayerSteps.stop();
                    }

                    soundPlayerSteps.setBuffer(sounds.jump);
                    soundPlayerSteps.setLoop(false);
                    soundPlayerSteps.setVolume(soundVolume / 8);
                    soundPlayerSteps.play();
                }
                
                isGravityAttractioning = false
                clearInterval(smoothGravityAttraction)
            }
            if (onlineMode) {
                connection.send({
                    position: {
                        y: playerModel.position.y,
                        x: playerModel.position.x,
                        z: playerModel.position.z 
                    }
                });
            }
        }, 5)
    }
}

let smoothlyMove, smoothlyJump;
const inertiaSpeed = { x: 0, z: 0 };

function playerMove() {
    clearInterval(inertiaSmothlyMove)
    clearInterval(smoothlyMove)
    
    smoothlyMove = setInterval(() => {
        if (Math.abs(player.speed.x) + Math.abs(player.speed.z) > player.maxSpeed.x) {
            player.speed.x = Math.abs(player.speed.x) > player.maxSpeed.x / 1.5 ?
                                player.speed.x / 1.5 :
                                player.speed.x

            player.speed.z = Math.abs(player.speed.z) > player.maxSpeed.x / 1.5 ?
                                player.speed.z / 1.5 :
                                player.speed.z
        } else {
            player.speed.x = Math.abs(player.speed.x) > 0 ?
                                player.maxSpeed.x * (player.speed.x / Math.abs(player.speed.x)) :
                                player.speed.x

            player.speed.z = Math.abs(player.speed.z) > 0 ?
                                player.maxSpeed.x * (player.speed.z / Math.abs(player.speed.z)) :
                                player.speed.z
        }

        if (player.speed.x != 0 || player.speed.y != 0 || player.speed.z != 0) {
            if (isGrounded(playerModel)) {
                checkCollision()

                isOnLanding = false

                player.flyHorizontalSpeed.x = player.realSpeed.x || 0
                player.flyHorizontalSpeed.z = player.realSpeed.z || 0

                playerModel.prevPosition = {
                    x: playerModel.position.x,
                    y: playerModel.position.y,
                    z: playerModel.position.z
                }

                if (player.speed.z > 0) {
                    player.realSpeed.z = Math.max(Math.min(player.speed.z, player.realSpeed.z + player.speed.z / 50), 0)
                    playerModel.position.x += Math.sin(camera.rotation.y) * -player.realSpeed.z
                    playerModel.position.z += Math.cos(Math.PI - camera.rotation.y) * player.realSpeed.z
                }

                if (player.speed.z < 0) {
                    player.realSpeed.z = Math.min(Math.max(player.speed.z, player.realSpeed.z + player.speed.z / 50), 0)
                    playerModel.position.x += Math.sin(camera.rotation.y) * -player.realSpeed.z
                    playerModel.position.z += -Math.cos(camera.rotation.y) * player.realSpeed.z
                }

                if (player.speed.x > 0) {
                    player.realSpeed.x = Math.max(Math.min(player.speed.x, player.realSpeed.x + player.speed.x / 50), 0)
                    playerModel.position.x += Math.sin(camera.rotation.y + Math.PI / 2) * player.realSpeed.x
                    playerModel.position.z += -Math.cos(camera.rotation.y + Math.PI / 2) * -player.realSpeed.x
                }

                if (player.speed.x < 0) {
                    player.realSpeed.x = Math.min(Math.max(player.speed.x, player.realSpeed.x + player.speed.x / 50), 0)
                    playerModel.position.x += Math.sin(camera.rotation.y - Math.PI / 2) * -player.realSpeed.x
                    playerModel.position.z += -Math.cos(camera.rotation.y - Math.PI / 2) * player.realSpeed.x
                }

                if (player.speed.x !== 0 && player.speed.z == 0) {
                    player.realSpeed.z = 0
                }

                if (player.speed.z !== 0 && player.speed.x == 0) {
                    player.realSpeed.x = 0
                }

                if (sounds.step) {
                    if (!soundPlayerSteps.isPlaying) {
                        soundPlayerSteps.setBuffer(sounds.step);
                        soundPlayerSteps.setLoop(false);
                        soundPlayerSteps.setVolume(soundVolume / 4);
                        soundPlayerSteps.play();
                    }
                }
            }
            else {
                onLanding()
                gravityAttraction()
            }
        } else {
            inertiaMove()
            clearInterval(smoothlyMove)
        }
    }, 5)
}
let inertiaSmothlyMove
function inertiaMove() {
    inertiaSpeed.x = player.maxSpeed.x * player.realSpeed.x / Math.abs(player.realSpeed.x)
    inertiaSpeed.z = player.maxSpeed.x * player.realSpeed.z / Math.abs(player.realSpeed.z)

    clearInterval(inertiaSmothlyMove)

    inertiaSmothlyMove = setInterval(() => {
        if (isGrounded(playerModel)) {
            checkCollision()

            isOnLanding = false

            player.flyHorizontalSpeed.x = player.realSpeed.x || 0
            player.flyHorizontalSpeed.z = player.realSpeed.z || 0

            playerModel.prevPosition = {
                x: playerModel.position.x,
                y: playerModel.position.y,
                z: playerModel.position.z
            }

            if ((player.speed.x == 0 && player.speed.x !== player.realSpeed.x) ||
                (player.speed.z == 0 && player.speed.z !== player.realSpeed.z)
            ) {
                if (inertiaSpeed.x > 0) {
                    player.realSpeed.x = Math.max(0, player.realSpeed.x - inertiaSpeed.x / 50)
                    playerModel.position.x += Math.sin(camera.rotation.y + Math.PI / 2) * player.realSpeed.x
                    playerModel.position.z += -Math.cos(camera.rotation.y + Math.PI / 2) * -player.realSpeed.x
                }

                if (inertiaSpeed.x < 0) {
                    player.realSpeed.x = Math.min(0, player.realSpeed.x - inertiaSpeed.x / 50)
                    playerModel.position.x += Math.sin(camera.rotation.y - Math.PI / 2) * -player.realSpeed.x
                    playerModel.position.z += -Math.cos(camera.rotation.y - Math.PI / 2) * player.realSpeed.x
                }

                if (inertiaSpeed.z > 0) {
                    player.realSpeed.z = Math.max(0, player.realSpeed.z - inertiaSpeed.z / 50)
                    playerModel.position.x += Math.sin(camera.rotation.y) * -player.realSpeed.z
                    playerModel.position.z += Math.cos(Math.PI - camera.rotation.y) * player.realSpeed.z
                }
                
                if (inertiaSpeed.z < 0) {
                    player.realSpeed.z = Math.min(0, player.realSpeed.z - inertiaSpeed.z / 50)
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
function checkCollision() {
    playerModel.userData.obb.copy(playerModel.geometry.userData.obb)
    playerModel.userData.obb.applyMatrix4(playerModel.matrixWorld)

    for (const obj of collisionResponsiveObjects) {
        obj.userData.obb.copy(obj.geometry.userData.obb)
        obj.userData.obb.applyMatrix4(obj.matrixWorld)

        if (obj.userData.obb.intersectsOBB(playerModel.userData.obb)) {
            const { x, y, z } = playerModel.position
            const [xPrev, zPrev] = [playerModel.prevPosition.x, playerModel.prevPosition.z]
            let objectPosition

            if (obj.geometry.boundingBox.max.x > obj.geometry.boundingBox.max.z) {
                objectPosition = { x: x, z: obj.position.z }
            } else if (obj.geometry.boundingBox.max.x < obj.geometry.boundingBox.max.z) {
                objectPosition = { x: obj.position.x, z: z }
            } else {
                objectPosition = { x: obj.position.x, z: obj.position.z }
            }

            let xDiff = Math.abs(x - objectPosition.x)
            let zDiff = Math.abs(z - objectPosition.z)

            if (xDiff < zDiff) {
                if (Math.abs(z - obj.position.z) > Math.abs(zPrev - obj.position.z)) {
                    playerModel.position.set(x, y, z)
                } else {
                    playerModel.position.set(x, y, zPrev)
                }
            } else if (xDiff > zDiff) {
                if (Math.abs(x - obj.position.x) > Math.abs(xPrev - obj.position.x)) {
                    playerModel.position.set(x, y, z)
                } else {
                    playerModel.position.set(xPrev, y, z)
                }
            } else {
                playerModel.position.set(xPrev, y, zPrev)
            }
        }
    }
}

let isFuseSpamSpace, jumpHorizontalMoving, velOfJumpIndex
const startJumpVelocity = 60;
const jumpDuration = 240

function makeJump() {
    if (isGrounded(playerModel) && !isFuseSpamSpace) {
        isFuseSpamSpace = true

        onLanding()

        velOfJumpIndex = startJumpVelocity

        setTimeout(() => {
            isFuseSpamSpace = false
            
            clearInterval(smoothlyJump)
            gravityAttraction()
        }, jumpDuration)

        smoothlyJump = setInterval(() => {
            if (onlineMode) {
                connection.send({ 
                    position: {
                        y: playerModel.position.y,
                        x: playerModel.position.x,
                        z: playerModel.position.z 
                    }
                });
            }
            --velOfJumpIndex
            playerModel.position.y += gravityKef * velOfJumpIndex
        }, 5)
    }
}

let smoothDucking
const scaleChangePerTick = 0.02
const positionChangeKef = 50;

function makeDuck(front) {
    const playerModelSize = playerModel.geometry.parameters.depth

    if (front) {
        clearInterval(smoothDucking)

        smoothDucking = setInterval(() => {
            if (playerModel.scale.y > duckPlayerModelScale) {
                playerModel.scale.y -= scaleChangePerTick
                playerModel.position.y -= playerModelSize / positionChangeKef
            } else {
                playerModel.scale.y = duckPlayerModelScale
                clearInterval(smoothDucking)
            }

            if (onlineMode) {
                connection.send({
                    position: {
                        y: playerModel.position.y,
                        x: playerModel.position.x,
                        z: playerModel.position.z 
                    }, 
                    scale: { 
                        y: playerModel.scale.y 
                    } 
                });
            }
        }, 5)
    } else {
        clearInterval(smoothDucking)

        smoothDucking = setInterval(() => {
            if (playerModel.scale.y < defaultPlayerModelScale) {
                playerModel.scale.y += scaleChangePerTick
                playerModel.position.y += playerModelSize / positionChangeKef
            } else {
                playerModel.scale.y = defaultPlayerModelScale
                clearInterval(smoothDucking)
            }
            
            if (onlineMode) {
                connection.send({
                    position: {
                        y: playerModel.position.y,
                        x: playerModel.position.x,
                        z: playerModel.position.z 
                    }, 
                    scale: {
                        y: playerModel.scale.y 
                    } 
                });
            }
        }, 5)
    }
}

let onLandingInterval, isOnLanding

function onLanding() {
    if (!isOnLanding) {
        isOnLanding = true

        clearInterval(onLandingInterval)

        onLandingInterval = setInterval(() => {
            const speedSum = Math.abs(player.flyHorizontalSpeed.z) + Math.abs(player.flyHorizontalSpeed.x)
            if (speedSum > player.maxSpeed.x) {
                player.flyHorizontalSpeed.z = player.flyHorizontalSpeed.z / 2
                player.flyHorizontalSpeed.x = player.flyHorizontalSpeed.x / 2
            }

            if (!isGrounded(playerModel)) {
                checkCollision()

                playerModel.prevPosition = {
                    x: playerModel.position.x,
                    y: playerModel.position.y,
                    z: playerModel.position.z
                }

                const [xSpeed, zSpeed] = [player.flyHorizontalSpeed.x, player.flyHorizontalSpeed.z]

                if (zSpeed > 0) {
                    playerModel.position.x += Math.sin(camera.rotation.y) * -zSpeed
                    playerModel.position.z += Math.cos(Math.PI - camera.rotation.y) * zSpeed
                }

                if (zSpeed < 0) {
                    playerModel.position.x += Math.sin(camera.rotation.y) * -zSpeed
                    playerModel.position.z += -Math.cos(camera.rotation.y) * zSpeed
                }

                if (xSpeed > 0) {
                    playerModel.position.x += Math.sin(camera.rotation.y + Math.PI / 2) * xSpeed
                    playerModel.position.z += -Math.cos(camera.rotation.y + Math.PI / 2) * -xSpeed
                }

                if (xSpeed < 0) {
                    playerModel.position.x += Math.sin(camera.rotation.y - Math.PI / 2) * -xSpeed
                    playerModel.position.z += -Math.cos(camera.rotation.y - Math.PI / 2) * xSpeed
                }
            } else {
                inertiaMove()
                clearInterval(onLandingInterval)
            }
        }, 5)
    }
}
function offKeyboard(event) {
    event.preventDefault();

    switch (event.code) {
        case localStorage.getItem('runningFoward'):
            keys[localStorage.getItem('runningBack')] ?
                player.speed.z = -player.maxSpeed.x :
                player.speed.z = 0
            break;
        case localStorage.getItem('runningLeft'):
            keys[localStorage.getItem('runningRight')] ?
                player.speed.x = player.maxSpeed.x :
                player.speed.x = 0
            break;
        case localStorage.getItem('runningBack'):
            keys[localStorage.getItem('runningFoward')] ?
                player.speed.z = player.maxSpeed.x :
                player.speed.z = 0
            break;
        case localStorage.getItem('runningRight'):
            keys[localStorage.getItem('runningLeft')] ?
                player.speed.x = -player.maxSpeed.x :
                player.speed.x = 0
            break;
        case localStorage.getItem('ducking'):
            if (!isFuseSpamCtrl && keys[localStorage.getItem('ducking')]) {
                isFuseSpamCtrl = true
                player.maxSpeed.x = defaultSpeed
                makeDuck(false)
                isFuseSpamCtrl = false
            }
            break;
        case localStorage.getItem('creeping'):
            player.maxSpeed.x = defaultSpeed
            break;
        case 'F2':
            onAdvancedInfo()
            helpers.forEach(element => element.visible = !element.visible)
            break;
    }
    keys[event.code] = false
}

let isFuseSpamCtrl, isCtrlStamina
const staminaDuration = 500
const maxSpeedDucking = 0.06
const maxSpeedCreeping = 0.08

function onKeyboard(event) {
    event.preventDefault();
    if (!keys[event.code]) {
        keys[event.code] = true
        switch (event.code) {
            case localStorage.getItem('runningFoward'):
                player.speed.z = player.maxSpeed.x
                playerMove()
                break;
            case localStorage.getItem('runningLeft'):
                player.speed.x = -player.maxSpeed.x
                playerMove()
                break;
            case localStorage.getItem('runningBack'):
                player.speed.z = -player.maxSpeed.x
                playerMove()
                break;
            case localStorage.getItem('runningRight'):
                player.speed.x = player.maxSpeed.x
                playerMove()
                break;
            case localStorage.getItem('ducking'):
                if (!isCtrlStamina && Math.round(playerModel.geometry.parameters.height) == modelHeight) {
                    isCtrlStamina = true

                    player.maxSpeed.x = maxSpeedDucking

                    makeDuck(true)

                    setTimeout(() => {
                        isCtrlStamina = false
                    }, staminaDuration)
                } else {
                    keys[event.code] = false
                }
                break;
            case localStorage.getItem('creeping'):
                player.maxSpeed.x = maxSpeedCreeping
                break;
            case localStorage.getItem('space'):
                makeJump()
                break;
            case localStorage.getItem('reloading'):
                makeReload()
                break;
        }
    }
}

let reloadingTime, isReloading = false
const milesecondsInSecond = 1000

function makeReload() {
    const weapon = weapons[randomWeapon]
    const [currentAmmo, maxAmmo] = [weapon.ammo, weapon.characteristics.ammo]
    const { reloadTime } = weapon.characteristics
    const reloadDuration = reloadTime * milesecondsInSecond - 500
    const weaponRotationSpeed = 0.05
    const reloadSoundDuration = 400

    if (currentAmmo < maxAmmo && !isReloading) {
        isReloading = true

        clearInterval(reloadingTime)

        setTimeout(() => {
            if (sounds.fullReload) {
                if (soundPlayerShoot.isPlaying) {
                    soundPlayerShoot.stop();
                }

                soundPlayerShoot.setBuffer(sounds.fullReload);
                soundPlayerShoot.setLoop(false);
                soundPlayerShoot.setVolume(soundVolume / 2);
                soundPlayerShoot.play();
            }
        }, reloadSoundDuration)

        let rotateToReload = setInterval(() => {
            if (weapon.rotationZ > -Math.PI / 4) {
                weapon.rotationZ += -weaponRotationSpeed
            } else {
                clearInterval(rotateToReload)
            }
        }, 5)

        setTimeout(() => {
            let rotateBack = setInterval(() => {
                if (weapon.rotationZ < 0) {
                    weapon.rotationZ += weaponRotationSpeed
                } else {
                    soundPlayerShoot.stop();
                    clearInterval(rotateBack)
                }
            }, 5)
        }, reloadDuration)

        reloadingTime = setTimeout(() => {
            weapon.ammo = weapon.characteristics.ammo
            document.getElementById('amountAmmo').innerText = weapon.ammo
            isReloading = false
        }, reloadTime * milesecondsInSecond)
    }
}

let mouseClick = true

function onMouseClick(event) {
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

function onMouseUp(event) {
    switch (event.button) {
        case 0:
            mouseClick = false
            break;
    }
}

let fireShootInterval, fireRate

function onFireAttack() {
    const weapon = weapons[randomWeapon];
    const famasTimeOnSingleShoot = 100

    if (weapon.canShoot && !isReloading) {
        switch (weapon.name) {
            case 'sniperRifle':
                makeShoot()

                fireRate = setTimeout(() => {
                    sniperRifle.canShoot = true
                }, sniperRifle.characteristics.fireRate * milesecondsInSecond)
                break;
            case 'famasRifle':
                makeShoot()

                setTimeout(() => {
                    makeShoot()
                }, famasTimeOnSingleShoot)

                setTimeout(() => {
                    makeShoot()
                }, famasTimeOnSingleShoot)

                fireRate = setTimeout(() => {
                    famasRifle.canShoot = true
                }, famasRifle.characteristics.fireRate * milesecondsInSecond)
                break;
            case 'rifle':
                makeShoot()

                clearInterval(fireShootInterval)

                fireRate = setTimeout(() => {
                    rifle.canShoot = true
                }, rifle.characteristics.fireRate * milesecondsInSecond)

                fireShootInterval = setInterval(() => {
                    if (mouseClick) {
                        clearTimeout(fireRate)
                        makeShoot()
                    } else {
                        rifle.canShoot = true
                        
                        clearInterval(fireShootInterval)
                    }
                }, rifle.characteristics.fireRate * milesecondsInSecond)
                break;
            case 'pistol':
                makeShoot()
                fireRate = setTimeout(() => {
                    pistol.canShoot = true
                }, pistol.characteristics.fireRate * milesecondsInSecond)
                break;
        }
    }
}

function onScope() {
    const weapon = weapons[randomWeapon];
    const firtstScope = 2
    const secondScope = 5

    if (weapon.name == 'sniperRifle') {
        if (sounds.sniperZoom) {
            if (soundPlayerScope.isPlaying) {
                soundPlayerScope.stop();
            }

            soundPlayerScope.setBuffer(sounds.sniperZoom);
            soundPlayerScope.setLoop(false);
            soundPlayerScope.setVolume(soundVolume / 4);
            soundPlayerScope.play();
        }

        if (document.getElementById('awpScope').style.display !== 'none') {
            if (camera.zoom == firtstScope) {
                camera.zoom = secondScope

                camera.updateProjectionMatrix();

                sensitivity /= 2.5
            } else {
                sensitivity *= camera.zoom

                camera.zoom = 1
                camera.updateProjectionMatrix();

                document.getElementById('awpScope').style.display = 'none'
            }
        } else {
            camera.zoom = firtstScope
            camera.updateProjectionMatrix();

            document.getElementById('awpScope').style.display = 'grid'

            sensitivity /= 2
        }
    }
}

let timeToRestoreInterval, timeToRestore = 0

function makeShoot() {
    const weapon = weapons[randomWeapon];
    const {timeToRestore, recoil, damage} = weapon.characteristics
    const recoilKef = 250
    const recoilUnderSpeedKeft = 10
    const flyingRecord = 10
    const maxBulletsOnScene = 50

    if (weapon.ammo > 0 && !isReloading) {
        clearInterval(timeToRestoreInterval)

        timeToRestoreInterval = setInterval(() => {
            if (timeToRestore < timeToRestore * milesecondsInSecond) {
                weapon.characteristicstimeToRestore += 5
            } else {
                clearInterval(timeToRestoreInterval)
            }
        }, 5)

        let mainRecoil = ((timeToRestore * milesecondsInSecond - timeToRestore) * recoil) / recoilKef
        if (!isGrounded(playerModel)) {
            mainRecoil += flyingRecord
        }

        mainRecoil += ((Math.abs(player.realSpeed.x) + Math.abs(player.realSpeed.z)) / defaultSpeed) * recoilUnderSpeedKeft

        let recoilY = (mainRecoil * 4) * (Math.random() + 0.5) * 2
        let recoilX = mainRecoil * (Math.random() - 0.5) * 5

        if (bullets.length > maxBulletsOnScene) {
            scene.remove(bullets[0])
            bullets.splice(0, 1)
        }

        const bulletColor = '#ff5900'
        const bulletSize = 0.1
        const bulletGeometery = new THREE.BoxGeometry(bulletSize, bulletSize, bulletSize * 2)
        const bulletMaterial = new THREE.MeshBasicMaterial({color: bulletColor})
        let bullet = new THREE.Mesh(bulletGeometery, bulletMaterial);

        bullet.position.copy(camera.position)
        bullet.quaternion.copy(camera.quaternion)
        bullet.name = "bullet"
        bullets.push(bullet)
        scene.add(bullet)

        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();

        raycaster.far = 500

        pointer.x = ((window.innerWidth / 2 + recoilX) / window.innerWidth) * 2 - 1;
        pointer.y = - (((window.innerHeight) / 2 - recoilY) / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(pointer, camera);

        const intersects = raycaster.intersectObjects(scene.children);
        
        let intersetsFiltered = intersects
            .filter(e =>    e.object.name !== 'bullet' &&
                            e.object.name !== 'playermodel' &&
                            e.object.name !== 'hitbox' &&
                            e.object.name !== 'bbox' &&
                            e.object.name !== 'modelForBotTarget' &&
                            e.object.name !== 'enemymodel'
            )

        if (intersetsFiltered[0]) {
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

            if (onlineMode) {
                connection.send({
                    bullet: {
                        startPosition: {
                            x: weapons[randomWeapon].position.x + Math.sin(camera.rotation.y) * -2, 
                            y: weapons[randomWeapon].position.y + Math.tan(camera.rotation.x) * 1,
                            z: weapons[randomWeapon].position.z + Math.cos(Math.PI - camera.rotation.y) * 2
                        }, 
                        endPosition: { 
                            x: intersetsFiltered[0].point.x,
                            y: intersetsFiltered[0].point.y,
                            z: intersetsFiltered[0].point.z 
                        }
                    }
                });
            }

            if (sounds[weapons[randomWeapon].name]) {
                if (soundPlayerShoot.isPlaying) {
                    soundPlayerShoot.stop();
                }

                soundPlayerShoot.setBuffer(sounds[weapons[randomWeapon].name]);
                soundPlayerShoot.setLoop(false);
                soundPlayerShoot.setVolume(soundVolume / 8);
                soundPlayerShoot.play();
            }

            const sniperRifleReloadDuration = 750

            if (weapons[randomWeapon].name == 'sniperRifle') {
                setTimeout(() => {
                    if (sounds.miniReload) {
                        if (soundPlayerShoot.isPlaying) {
                            soundPlayerShoot.stop();
                        }
                        
                        soundPlayerShoot.setBuffer(sounds.miniReload);
                        soundPlayerShoot.setLoop(false);
                        soundPlayerShoot.setVolume(soundVolume / 4);
                        soundPlayerShoot.play();
                    }
                }, sniperRifleReloadDuration)
            }

            const velocity = 500 / 200
            const time = distanceToEndPosition / velocity

            const bulletX = weapon.position.x + Math.sin(camera.rotation.y) * -2
            const bulletY = weapon.position.y + Math.tan(camera.rotation.x) * 1
            const bulletZ = weapon.position.z + Math.cos(Math.PI - camera.rotation.y) * 2

            const bulletSpeedX = (bullet.endPosition.x - bulletX) / time
            const bulletSpeedY = (bullet.endPosition.y - bulletY) / time
            const bulletSpeedZ = (bullet.endPosition.z - bulletZ) / time

            bullet.position.set(bulletX, bulletY, bulletZ)
            
            const smoothBulletShooting = setInterval(() => {
                const xDistanceToEnemy = Math.pow(bullet.position.x - enemyModel.position.x, 2)
                const yDistanceToEnemy = Math.pow(bullet.position.y - enemyModel.position.y, 2)
                const zDistanceToEnemy = Math.pow(bullet.position.z - enemyModel.position.z, 2)

                const distanceBtwBulletAndPlayer = Math.sqrt(xDistanceToEnemy + yDistanceToEnemy + zDistanceToEnemy)

                const xDistanceToEnd = Math.pow(bullet.position.x - bullet.endPosition.x, 2)
                const yDistanceToEnd = Math.pow(bullet.position.y - bullet.endPosition.y, 2)
                const zDistanceToEnd = Math.pow(bullet.position.z - bullet.endPosition.z, 2)

                const distanceBtwBulletAndEndPos = Math.sqrt(xDistanceToEnd + yDistanceToEnd + zDistanceToEnd)

                if (distanceBtwBulletAndPlayer > velocity / 1.25 &&
                    distanceBtwBulletAndEndPos > velocity / 1.25 &&
                    Math.abs(bullet.position.x) < 300 &&
                    Math.abs(bullet.position.z) < 300 &&
                    Math.abs(bullet.position.y) < 20
                ) {
                    bullet.position.x += bulletSpeedX
                    bullet.position.y += bulletSpeedY
                    bullet.position.z += bulletSpeedZ
                } else {
                    if (distanceBtwBulletAndPlayer < velocity / 1.25) {
                        if (onlineMode) {
                            connection.send({ hit: true });
                        }

                        enemyModel.healthPoints -= damage

                        if (sounds.enemyHit) {
                            if (soundEnemyHit.isPlaying) {
                                soundEnemyHit.stop();
                            }

                            soundEnemyHit.setBuffer(sounds.enemyHit);
                            soundEnemyHit.setLoop(false);
                            soundEnemyHit.setVolume(soundVolume / 4);
                            soundEnemyHit.play();
                        }

                        checkIfNextRound()
                    }

                    bullet.position.set(bullet.endPosition.x, bullet.endPosition.y, bullet.endPosition.z)
                    clearInterval(smoothBulletShooting)
                }
            }, 5)
        }

        weapon.canShoot = false

        weapon.characteristics.timeToRestore = 0

        weapon.ammo--

        document.getElementById('amountAmmo').innerText = weapon.ammo

        const lastBullet = 1

        if (weapon.ammo < lastBullet && !isReloading) {
            makeReload()
        }
    } else {
        makeReload()
    }
}

const onPlayBtn = document.getElementById('onPlay')
onPlayBtn.addEventListener('click', onPlay)
let randomWeapon = 0

function onPlay() {
    const canvas = document.querySelector('canvas')
    menuBg.style.display = hideDisplay

    player.maxSpeed.x = defaultSpeed

    canvas.requestPointerLock = canvas.requestPointerLock ||
        canvas.mozRequestPointerLock ||
        canvas.webkitRequestPointerLock;

    canvas.requestPointerLock()

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

    playerScore.innerText = scoreboard.player
    enemyScore.innerText = scoreboard.enemy

    playerModel.healthPoints = maxHealthPoints

    healthPointsLbl.innerText = playerModel.healthPoints
    healthBar.style.width = `${playerModel.healthPoints}%`

    let btnWeapons = weaponsBtns
        .filter(e => e.style.color == activeBtnColor)
        .map(e => e.id)

    if (btnWeapons.length > 0) {
        weapons = allWeapons.filter(e => btnWeapons.includes(e.name));
    } else {
        weapons = allWeapons
    }

    if (easyDiff.style.color == activeBtnColor) {
        botDifficult = 1 
    }

    if (mediumDiff.style.color == activeBtnColor) {
        botDifficult = 4
    }

    if (hardDiff.style.color == activeBtnColor) {
        botDifficult = 10
    }

    randomWeapon = Math.floor(Math.random() * weapons.length);
    onNextRound()

    playerNick.innerText = playerNickname.value.slice(0, 12) || 'Player'
    enemyNick.innerText = enemyShowNick.innerText.slice(0, 12) || 'Enemy'

    audio.pause()
    audio = new Audio(`sounds/music${2 + Math.round(Math.random())}.mp3`)
    audio.volume = musicVolume
    audio.loop = true
    audio.play()
}

function checkIfNextRound() {
    if (inGame) {
        healthPointsLbl.innerText = playerModel.healthPoints
        healthBar.style.width = `${playerModel.healthPoints}%`
        if (enemyModel.healthPoints < 1) {
            scoreboard.player++
            randomWeapon = Math.floor(Math.random() * weapons.length)
            if (onlineMode) {
                connection.send({ weapon: weapons[randomWeapon].name, score: scoreboard });
            }
            onNextRound()
        }
        if (playerModel.healthPoints < 1) {
            scoreboard.enemy++
            randomWeapon = Math.floor(Math.random() * weapons.length)
            if (onlineMode) {
                connection.send({ weapon: weapons[randomWeapon].name, score: scoreboard });
            }
            onNextRound()
        }
    }
}

let onNextRoundTimeOut

function onNextRound() {
    if (weapons[randomWeapon].name == 'sniperRifle') {
        document.getElementById('crosshair').style.display = 'none'
    } else {
        document.getElementById('crosshair').style.display = 'initial'
    }

    playerScore.innerText = scoreboard.player
    enemyScore.innerText = scoreboard.enemy

    bullets.forEach(e => scene.remove(e))
    bullets = []

    player.speed.z = 0
    player.speed.x = 0
    player.realSpeed.z = 0
    player.realSpeed.x = 0
    playerModel.scale.y = 1
    
    isCtrlStamina = false
    isFuseSpamCtrl = false

    player.maxSpeed.x = defaultSpeed

    if (onlineMode) {
        connection.send({ 
            position: { 
                y: playerModel.position.y,
                x: playerModel.position.x,
                z: playerModel.position.z 
            }, 
            scale: { 
                y: playerModel.scale.y 
            } 
        });
    }

    keyAssignmentsUp()

    clearInterval(fireShootInterval)
    clearInterval(timeToRestoreInterval)

    weapons[randomWeapon].ammo = weapons[randomWeapon].characteristics.ammo
    weapons[randomWeapon].canShoot = true

    enemyModel.visible = true

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

        timeToRestore = weapons[randomWeapon].characteristics.timeToRestore * 1000

        playerModel.healthPoints = 100
        enemyModel.healthPoints = 100

        healthPointsLbl.innerText = playerModel.healthPoints
        healthBar.style.width = `${playerModel.healthPoints}%`
        spawnModels()

        if (!onlineMode) {
            botLifeCycle()
        }
    }, 3000)
}

function nextRoundTransition() {
    document.getElementById('nextRoundTransitionBlock').classList.add('nextRoundBlackout')
    setTimeout(() => { document.getElementById('nextRoundTransitionBlock').classList.remove('nextRoundBlackout') }, 3000)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('keydown', onKeyboard)
    window.removeEventListener('keyup', offKeyboard)
    window.removeEventListener('mousedown', onMouseClick)
    window.removeEventListener('mouseup', onMouseUp)
    clearInterval(inertiaSmothlyMove)
    clearInterval(smoothlyMove)
    inGame = false
}

function nextRoundTransitionHide() {
    document.getElementById('nextRoundAnnounceBlock').classList.add('nextRoundAnnounce')
    setTimeout(() => { document.getElementById('nextRoundAnnounceBlock').classList.remove('nextRoundAnnounce') }, 5000)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('keydown', onKeyboard)
    window.addEventListener('keyup', offKeyboard)
    window.addEventListener('mousedown', onMouseClick)
    window.addEventListener('mouseup', onMouseUp)
    inGame = true
}

function onMenu() {
    inGame = false
    bullets.forEach(e => scene.remove(e))
    bullets = []
    player.speed.z = 0
    player.speed.x = 0
    clearTimeout(onNextRoundTimeOut)
    document.getElementById('menuBg').style.display = 'grid'
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('keydown', onKeyboard)
    window.removeEventListener('keyup', offKeyboard)
    window.removeEventListener('mousedown', onMouseClick)
    window.removeEventListener('mouseup', onMouseUp)
    keyAssignmentsUp()
    weapons.forEach(e => { e.visible = false; e.position.set(0, 40, 0) })
    enemyModel.visible = false
    playerModel.healthPoints = 100
    enemyModel.healthPoints = 100
    playerNickname.value = localStorage.getItem('nick') || 'Player'
    document.getElementById('enemyAvatar').setAttribute('src', 'img/robot.png')
    enemyNick.innerText = 'Robot'
    audio.pause()
    audio = new Audio('sounds/music1.mp3')
    audio.volume = musicVolume
    audio.loop = true
    audio.play()
}

function onGameMenu() {
    document.getElementById('gameMenu').style.display = 'grid'
    inGame = false
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('keydown', onKeyboard)
    window.removeEventListener('keyup', offKeyboard)
    window.removeEventListener('mousedown', onMouseClick)
    window.removeEventListener('mouseup', onMouseUp)
    player.speed.z = 0
    player.speed.x = 0
    keyAssignmentsUp()
}

function onLeaveGameBtn() {
    document.getElementById('gameMenu').style.display = 'none'
    if (onlineMode) {
        peer.destroy()
    }
    onMenu()
}

function onResumeGameBtn() {
    const canvas = document.querySelector('canvas')

    document.getElementById('gameMenu').style.display = 'none'
    inGame = true

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('keydown', onKeyboard)
    window.addEventListener('keyup', offKeyboard)
    window.addEventListener('mousedown', onMouseClick)
    window.addEventListener('mouseup', onMouseUp)

    canvas.requestPointerLock = canvas.requestPointerLock ||
        canvas.mozRequestPointerLock ||
        canvas.webkitRequestPointerLock;

    canvas.requestPointerLock()

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

function spawnModels() {
    let randomSpawnIndex = Math.floor(Math.random() * 4)
    let randomSpawn = spawnArea[randomSpawnIndex]
    let randomPositionX = randomSpawn.position.x + randomSpawn.scale.x * (Math.random() - 0.5) * 2
    let randomPositionZ = randomSpawn.position.z + randomSpawn.scale.z * (Math.random() - 0.5) * 2
    
    playerModel.position.set(randomPositionX, randomSpawn.position.y + 2, randomPositionZ)

    if (!onlineMode) {
        randomSpawnIndex = Math.floor(Math.random() * 4)
        randomSpawn = spawnEnemyAndPath.filter(e => e.name.slice(0, 10) == 'SpawnEnemy')[randomSpawnIndex]
        randomPositionX = randomSpawn.position.x + randomSpawn.scale.x * (Math.random() - 0.5) * 2
        randomPositionZ = randomSpawn.position.z + randomSpawn.scale.z * (Math.random() - 0.5) * 2
        enemyModel.position.set(randomPositionX, randomSpawn.position.y + 2, randomPositionZ)
        enemyModel.zoneName = randomSpawn.name
        enemyModel.visible = true
    }

    gravityAttraction()
    playerModel.updateMatrixWorld()
    enemyModel.updateMatrixWorld()
}

function checkBotVisionContact() {
    let intersects = [], direction
    const raycaster = new THREE.Raycaster();

    raycaster.far = 400
    direction = new THREE.Vector3(
        (playerModel.position.x + playerModel.geometry.parameters.width / 2) - enemyModel.position.x, 
        playerModel.position.y - enemyModel.position.y, 
        (playerModel.position.z + playerModel.geometry.parameters.depth / 2) - enemyModel.position.z
    )
    direction.normalize()

    raycaster.set(new THREE.Vector3(enemyModel.position.x, enemyModel.position.y + 3, enemyModel.position.z), direction);
    intersects.push(raycaster.intersectObjects(scene.children))
    direction = new THREE.Vector3(
        (playerModel.position.x + playerModel.geometry.parameters.width / 2) - enemyModel.position.x,
        playerModel.position.y - enemyModel.position.y,
        (playerModel.position.z - playerModel.geometry.parameters.depth / 2) - enemyModel.position.z
    )
    direction.normalize()

    raycaster.set(new THREE.Vector3(enemyModel.position.x, enemyModel.position.y + 3, enemyModel.position.z), direction);
    intersects.push(raycaster.intersectObjects(scene.children))
    direction = new THREE.Vector3(
        (playerModel.position.x - playerModel.geometry.parameters.width / 2) - enemyModel.position.x,
        playerModel.position.y - enemyModel.position.y,
        (playerModel.position.z + playerModel.geometry.parameters.depth / 2) - enemyModel.position.z
    )
    direction.normalize()

    raycaster.set(new THREE.Vector3(enemyModel.position.x, enemyModel.position.y + 3, enemyModel.position.z), direction);
    intersects.push(raycaster.intersectObjects(scene.children))
    direction = new THREE.Vector3(
        (playerModel.position.x - playerModel.geometry.parameters.width / 2) - enemyModel.position.x,
        playerModel.position.y - enemyModel.position.y,
        (playerModel.position.z - playerModel.geometry.parameters.depth / 2) - enemyModel.position.z
    )
    direction.normalize()

    raycaster.set(new THREE.Vector3(enemyModel.position.x, enemyModel.position.y + 3, enemyModel.position.z), direction);

    intersects.push(raycaster.intersectObjects(scene.children))
    intersects = intersects.flat(1)

    intersects.sort((a, b) => {
        if (a.distance > b.distance) return 1
        if (a.distance < b.distance) return -1
        return 0
    })
    
    intersects = intersects.filter(e => e.object.name !== 'enemymodel')
    intersects = intersects[0].object.name == 'playermodel' ||
                intersects[0].object.name == 'modelForBotTarget' ?
                                            [intersects[0]] : 
                                            []

    if (intersects[0]) 
        return true
    return false
}

let botTargetPosition, pathToAnyBotZone = ['SpawnEnemy002', 'SpawnEnemy001', 'Path003', 'SpawnEnemy', 'Path002', 'Path001', 'Path', 'Path004', 'SpawnEnemy006']

function generateBotTargetPosition() {
    let currentZonePositionIndex = pathToAnyBotZone.findIndex(e => e == enemyModel.zoneName)
    let randomTargetPositionIndex = Math.round((Math.random() - 0.5) * 3) + currentZonePositionIndex
    let randomTargetPosition = pathToAnyBotZone[Math.max(Math.min(randomTargetPositionIndex, pathToAnyBotZone.length - 1), 0)]

    randomTargetPosition = spawnEnemyAndPath.find(e => e.name == randomTargetPosition)

    let randomPositionX = randomTargetPosition.position.x + randomTargetPosition.scale.x * (Math.random() - 0.5) * 2
    let randomPositionZ = randomTargetPosition.position.z + randomTargetPosition.scale.z * (Math.random() - 0.5) * 2

    return botTargetPosition = new THREE.Vector3(randomPositionX, randomTargetPosition.position.y + 2, randomPositionZ)
}
function checkZoneOfBotPosition() {
    for (let i = 0; i < spawnEnemyAndPath.length; i++) {
        if (spawnEnemyAndPath[i].position.x + spawnEnemyAndPath[i].scale.x > enemyModel.position.x &&
            spawnEnemyAndPath[i].position.x - spawnEnemyAndPath[i].scale.x < enemyModel.position.x &&
            spawnEnemyAndPath[i].position.z + spawnEnemyAndPath[i].scale.z > enemyModel.position.z &&
            spawnEnemyAndPath[i].position.z - spawnEnemyAndPath[i].scale.z < enemyModel.position.z
        ) {
            enemyModel.zoneName = spawnEnemyAndPath[i].name
            break
        }
    }
}

let botMakeSmoothlyMove, smoothBotGravityAttraction, BotGravityAttraction

function botMakeMove(targetPosition) {
    let distance = Math.sqrt(Math.pow(targetPosition.x - enemyModel.position.x, 2) + Math.pow(targetPosition.z - enemyModel.position.z, 2))
    let time = distance / (defaultSpeed / 1.5)
    let botSpeedX = (targetPosition.x - enemyModel.position.x) / time
    let botSpeedZ = (targetPosition.z - enemyModel.position.z) / time

    clearInterval(botMakeSmoothlyMove)

    botMakeSmoothlyMove = setInterval(() => {
        if (!onlineMode) {
            if (!isGrounded(enemyModel) && !BotGravityAttraction) {
                BotGravityAttraction = true
                let velOfBotGravityAttractionIndex = 0

                smoothBotGravityAttraction = setInterval(() => {
                    if (!isGrounded(enemyModel)) {
                        ++velOfBotGravityAttractionIndex
                        enemyModel.position.y -= 0.002 * velOfBotGravityAttractionIndex
                    } else {
                        BotGravityAttraction = false
                        clearInterval(smoothBotGravityAttraction)
                    }
                }, 5)
            }

            if (!checkBotVisionContact() && Math.floor(enemyModel.position.x) !== Math.floor(targetPosition.x) && Math.floor(enemyModel.position.z) !== Math.floor(targetPosition.z)) {
                enemyModel.position.x += botSpeedX
                enemyModel.position.z += botSpeedZ
            } else {
                botLifeCycle()
                clearInterval(botMakeSmoothlyMove)
            }
        }
    }, 5)
}

function makeBotShoot() {
    if (bullets.length > 50) {
        scene.remove(bullets[0])
        bullets.splice(0, 1)
    }

    let bullet = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.2), new THREE.MeshBasicMaterial({ color: '#ff5900' }));
    bullet.position.copy(enemyModel.position)
    bullet.name = "bullet"
    bullets.push(bullet)
    scene.add(bullet)

    bullet.position.set(enemyModel.position.x, enemyModel.position.y + 2, enemyModel.position.z)
    if (sondEnemyShoot.isPlaying) {
        sondEnemyShoot.stop();
    }

    sondEnemyShoot.setBuffer(sounds[weapons[randomWeapon].name]);
    sondEnemyShoot.setLoop(false);
    sondEnemyShoot.setVolume(soundVolume / 4);
    sondEnemyShoot.setRefDistance(40);
    sondEnemyShoot.play();

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
        y: enemyModel.position.y + 2,
        z: enemyModel.position.z
    }

    let bulletSpeedX = (playerModel.position.x - enemyModel.position.x) / time
    let bulletSpeedZ = (playerModel.position.z - enemyModel.position.z) / time
    let bulletSpeedY = (playerModel.position.y - enemyModel.position.y) / time

    let bulletMakeSmoothlyMove = setInterval(() => {
        if (!inGame) {
            scene.remove(bullet)
            bullets.splice(bullets.length - 1, 1)
            clearInterval(bulletMakeSmoothlyMove)
        }

        const xPos = Math.pow(bullet.position.x - playerModel.position.x, 2)
        const yPos = Math.pow(bullet.position.y - playerModel.position.y, 2)
        const zPos = Math.pow(bullet.position.z - playerModel.position.z, 2)
        let distanceBtwBulletAndPlayer = Math.sqrt(xPos + yPos + zPos)

        if (distanceBtwBulletAndPlayer > velocity
            && Math.abs(bullet.position.x) < 300
            && Math.abs(bullet.position.z) < 300
            && Math.abs(bullet.position.y) < 20
        ) {
            bullet.position.x += bulletSpeedX
            bullet.position.y += bulletSpeedY
            bullet.position.z += bulletSpeedZ
        } else {
            if (distanceBtwBulletAndPlayer < velocity) {
                if (!onlineMode) {
                    playerModel.healthPoints -= weapons[randomWeapon].characteristics.damage

                    if (sounds.playerHit) {
                        if (soundPlayerHit.isPlaying) {
                            soundPlayerHit.stop();
                        }

                        soundPlayerHit.setBuffer(sounds.playerHit);
                        soundPlayerHit.setLoop(false);
                        soundPlayerHit.setVolume(soundVolume / 4);
                        soundPlayerHit.play();
                    }

                    document.getElementById('hitEventShow').classList.add('hitEventShow')

                    setTimeout(() => {
                        document.getElementById('hitEventShow').classList.remove('hitEventShow')
                    }, 500)

                    checkIfNextRound()
                }
            }
            scene.remove(bullet)
            bullets.splice(bullets.length - 1, 1)
            clearInterval(bulletMakeSmoothlyMove)
        }
    }, 5)

    botLifeCycle()
}

function makeEnemyShoot(startPosition, endPosition) {
    if (bullets.length > 50) {
        scene.remove(bullets[0])
        bullets.splice(0, 1)
    }

    let bullet = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.2), new THREE.MeshBasicMaterial({ color: '#ff5900' }));
    bullet.position.set(startPosition.x, startPosition.y, startPosition.z)
    bullet.name = "bullet"
    bullets.push(bullet)
    scene.add(bullet)

    bullet.position.set(enemyModel.position.x, enemyModel.position.y + 2, enemyModel.position.z)

    if (sondEnemyShoot.isPlaying) {
        sondEnemyShoot.stop();
    }

    sondEnemyShoot.setBuffer(sounds[weapons[randomWeapon].name]);
    sondEnemyShoot.setLoop(false);
    sondEnemyShoot.setVolume(soundVolume / 4);
    sondEnemyShoot.setRefDistance(40);
    sondEnemyShoot.play();

    let velocity = 500 / 200
    let distance = Math.sqrt(Math.pow(startPosition.x - endPosition.x, 2) + Math.pow(startPosition.z - endPosition.z, 2) + Math.pow(startPosition.y - endPosition.y, 2))
    let time = distance / velocity
    bullet.endPosition = endPosition
    bullet.startPosition = startPosition
    let bulletSpeedX = (endPosition.x - startPosition.x) / time
    let bulletSpeedZ = (endPosition.z - startPosition.z) / time
    let bulletSpeedY = (endPosition.y - startPosition.y) / time

    let bulletMakeSmoothlyMove = setInterval(() => {
        const xPos = Math.pow(bullet.position.x - playerModel.position.x, 2)
        const yPos = Math.pow(bullet.position.y - playerModel.position.y, 2)
        const zPos = Math.pow(bullet.position.z - playerModel.position.z, 2)

        let distanceBtwBulletAndPlayer = Math.sqrt(xPos + yPos + zPos)

        if (distanceBtwBulletAndPlayer > velocity &&
            Math.abs(bullet.position.x) < 300 &&
            Math.abs(bullet.position.z) < 300 &&
            Math.abs(bullet.position.y) < 20
        ) {
            bullet.position.x += bulletSpeedX
            bullet.position.y += bulletSpeedY
            bullet.position.z += bulletSpeedZ
        } else {
            if (distanceBtwBulletAndPlayer < velocity) {
                scene.remove(bullet)
                bullets.splice(bullets.length - 1, 1)
            } else {
                bullet.position.set(bullet.endPosition.x, bullet.endPosition.y, bullet.endPosition.z)
            }

            clearInterval(bulletMakeSmoothlyMove)
        }
    }, 5)
}

function botLifeCycle() {
    if (!onlineMode && inGame) {
        setTimeout(() => {
            checkZoneOfBotPosition()

            if (checkBotVisionContact()) {
                let direction = new THREE.Vector3(playerModel.position.x - enemyModel.position.x, playerModel.position.y - enemyModel.position.y, playerModel.position.z - enemyModel.position.z)
                makeBotShoot(direction)
            } else {
                botMakeMove(generateBotTargetPosition())
            }
        }, 2100 / botDifficult)
    }
}

function onMouseMove(event) {
    const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

    euler.x -= movementY / (1 / sensitivity * 1000) * (1 / sensitivityX)
    euler.y -= movementX / (1 / sensitivity * 1000) * (1 / sensitivityY)

    euler.x = Math.max(Math.min(Math.PI / 2, euler.x), -Math.PI / 2)
    camera.quaternion.setFromEuler(euler);
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
    const canvas = document.querySelector('canvas')

    if (document.pointerLockElement === canvas ||
        document.mozPointerLockElement === canvas ||
        document.webkitPointerLockElement === canvas) {

    } else {
        onGameMenu()
    }
}
function onAdvancedInfo() {
    if (document.getElementById('advancedInfoBlock').style.display !== 'none') {
        document.getElementById('advancedInfoBlock').style.display = 'none'
    } else {
        document.getElementById('advancedInfoBlock').style.display = 'grid'
    }
}

document.getElementById('sensSilder').addEventListener('input', onSensSilder)
document.getElementById('sensInp').addEventListener('input', onSensInp)

function onSensSilder() {
    document.getElementById('sensInp').value = document.getElementById('sensSilder').value / 10
    sensitivity = document.getElementById('sensInp').value
}

function onSensInp() {
    document.getElementById('sensSilder').value = document.getElementById('sensInp').value * 10
    sensitivity = document.getElementById('sensInp').value
}

function getAdvancedData() {
    document.getElementById('xCords').innerText = String(camera.position.x).slice(0, 5)
    document.getElementById('zCords').innerText = String(camera.position.z).slice(0, 5)
    document.getElementById('yCords').innerText = String(camera.position.y).slice(0, 5)

    document.getElementById('povX').innerText = String(camera.rotation.x / (Math.PI * 2) * 100).slice(0, 5)
    document.getElementById('povY').innerText = String(camera.rotation.y / (Math.PI * 2) * 100).slice(0, 5)
    document.getElementById('povZ').innerText = String(camera.rotation.z / (Math.PI * 2) * 100).slice(0, 5)

    let povY = camera.rotation.y / (Math.PI * 2) - Math.floor(camera.rotation.y / (Math.PI * 2))

    if (povY > 0.875) {
        document.getElementById('axis').innerText = 'x'
    } else if (povY > 0.625) {
        document.getElementById('axis').innerText = '-z'
    } else if (povY > 0.375) {
        document.getElementById('axis').innerText = '-x'
    } else if (povY > 0.125) {
        document.getElementById('axis').innerText = 'z'
    } else {
        document.getElementById('axis').innerText = 'x'
    }

    if (player) {
        document.getElementById('speedX').innerText = player.realSpeed.x
        document.getElementById('speedZ').innerText = player.realSpeed.z
    }
}

peer.on('open', function (id) {
    document.getElementById('yourCode').value = id
});

document.getElementById('ConnectBtn').addEventListener('click', onConnectBtn)

let connection

function onConnectBtn() {
    connection = peer.connect(document.getElementById('enemyCode').value);
    onConnectionOpen()
}

peer.on('connection', function (conn) {
    connection = conn
    onConnectionOpen()
});

function onConnectionOpen() {
    onlineMode = true

    enemyModel.visible = true

    document.getElementById('enemyAvatar').setAttribute('src', 'img/human.png')

    connection.on('open', () => { connection.send({ nickname: playerNickname.value }) })

    connection.on('data', function (data) {
        if (data.nickname) {
            enemyShowNick.innerText = data.nickname
        }
        if (data.position) {
            enemyModel.position.x = -data.position.x || enemyModel.position.x
            enemyModel.position.y = data.position.y || enemyModel.position.y
            enemyModel.position.z = -data.position.z || enemyModel.position.z
        }
        if (data.scale) {
            enemyModel.scale.y = data.scale.y
        }
        if (data.bullet) {
            makeEnemyShoot({ x: -data.bullet.startPosition.x, y: data.bullet.startPosition.y, z: -data.bullet.startPosition.z, },
                { x: -data.bullet.endPosition.x, y: data.bullet.endPosition.y, z: -data.bullet.endPosition.z })
        }
        if (data.hit) {
            playerModel.healthPoints -= weapons[randomWeapon].characteristics.damage
            if (sounds.playerHit) {
                if (soundPlayerHit.isPlaying) {
                    soundPlayerHit.stop();
                }
                soundPlayerHit.setBuffer(sounds.playerHit);
                soundPlayerHit.setLoop(false);
                soundPlayerHit.setVolume(soundVolume / 4);
                soundPlayerHit.play();
            }
            document.getElementById('hitEventShow').classList.remove('hitEventShow')
            document.getElementById('hitEventShow').classList.add('hitEventShow')
            checkIfNextRound()
        }
        if (data.weapon) {
            randomWeapon = Math.max(Math.min(weapons.findIndex(weapon => weapon.name == data.weapon), weapons.length - 1), 0)
            weapons = allWeapons
        }
        if (data.score) {
            scoreboard.enemy = data.score.player
            scoreboard.player = data.score.enemy
            onNextRound()
        }
    });
}

function onConnectionClose() {
    onlineMode = false
    onMenu()
}

peer.on('disconnected', function () {
    onConnectionClose()
    onMenu()
});

peer.on('close', function () {
    onConnectionClose()
    onMenu()
});

document.getElementById('copyCodeBtn').addEventListener('click', (e) => { 
    navigator.clipboard.writeText(document.getElementById('yourCode').value); e.target.innerText = 'Copied'; 
    setTimeout(() => { e.target.innerText = 'Copy' }, 2000) 
})

const listener = new THREE.AudioListener();
camera.add(listener);

const soundPlayerHit = new THREE.Audio(listener);

const soundEnemyHit = new THREE.Audio(listener);

const soundPlayerSteps = new THREE.Audio(listener);

const soundPlayerShoot = new THREE.Audio(listener);

const soundPlayerScope = new THREE.Audio(listener);

const sondEnemyShoot = new THREE.PositionalAudio(listener);
enemyModel.add(sondEnemyShoot)

const audioLoader = new THREE.AudioLoader();

let sounds = {}
audioLoader.load('sounds/step.mp3', function (buffer) { sounds.step = buffer });
audioLoader.load('sounds/sniperShoot.mp3', function (buffer) { sounds.sniperRifle = buffer });
audioLoader.load('sounds/famasShoot.mp3', function (buffer) { sounds.famasRifle = buffer });
audioLoader.load('sounds/pistolShoot.mp3', function (buffer) { sounds.pistol = buffer });
audioLoader.load('sounds/rifleReload.mp3', function (buffer) { sounds.rifle = buffer });
audioLoader.load('sounds/playerHit.mp3', function (buffer) { sounds.playerHit = buffer });
audioLoader.load('sounds/enemyHit.mp3', function (buffer) { sounds.enemyHit = buffer });
audioLoader.load('sounds/jump.mp3', function (buffer) { sounds.jump = buffer });
audioLoader.load('sounds/sniperZoom.mp3', function (buffer) { sounds.sniperZoom = buffer });
audioLoader.load('sounds/fullReload.mp3', function (buffer) { sounds.fullReload = buffer });
audioLoader.load('sounds/miniReload.mp3', function (buffer) { sounds.miniReload = buffer });

weaponsBtns.forEach(e => e.addEventListener('click', (event) => 
    event.target.style.color = event.target.style.color == 'rgb(12, 12, 12)' ? activeBtnColor : 'rgb(12, 12, 12)'))
weaponsBtns.forEach(e => e.style.color = activeBtnColor)

Array.from(document.getElementsByClassName('botDiffs')).forEach(e => e.addEventListener('click', (event) => { 
    Array.from(document.getElementsByClassName('botDiffs')).forEach(e => e.style.color = 'rgb(12, 12, 12)')
    event.target.style.color = activeBtnColor 
}))

Array.from(document.getElementsByClassName('botDiffs')).forEach(e => e.style.color = 'rgb(12, 12, 12)')
Array.from(document.getElementsByClassName('botDiffs'))[0].style.color = activeBtnColor

document.getElementById('leaveGameBtn').addEventListener('click', onLeaveGameBtn)
document.getElementById('resumeGameBtn').addEventListener('click', onResumeGameBtn)

playerNickname.addEventListener('change', (e) => { localStorage.setItem('nick', e.target.value) })

document.getElementById('onSettings').addEventListener('click', onSettings)
document.getElementById('onMenu').addEventListener('click', onMainMenu)

function onSettings() {
    document.getElementById('menuBg').style.display = 'none'
    document.getElementById('settingsBlock').style.display = 'grid'
}

function onMainMenu() {
    document.getElementById('menuBg').style.display = 'grid'
    document.getElementById('settingsBlock').style.display = 'none'
}

function drawCrosshair() {
    let lineWidth = Number(localStorage.getItem('crosshairLineWidth'))
    let length = Number(localStorage.getItem('crosshairLength'))
    let gap = Number(localStorage.getItem('crosshairGap')) + length
    let r = Number(localStorage.getItem('red')), 
    g = Number(localStorage.getItem('green')), 
    b = Number(localStorage.getItem('blue')), 
    a = Number(localStorage.getItem('alpha'))

    let lines1 = Array.from(document.getElementsByClassName('linesCrosshair'))
    let lines2 = Array.from(document.getElementsByClassName('settingsLinesCrosshair'))

    lines2[0].setAttribute('x1', 100 / 2 + gap / 2)
    lines2[0].setAttribute('x2', 100 / 2 + gap / 2)
    lines2[0].setAttribute('y1', 100 / 2 - lineWidth / 2)
    lines2[0].setAttribute('y2', 100 / 2 + lineWidth / 2)
    lines2[1].setAttribute('x1', 100 / 2 - gap / 2)
    lines2[1].setAttribute('x2', 100 / 2 - gap / 2)
    lines2[1].setAttribute('y1', 100 / 2 + lineWidth / 2)
    lines2[1].setAttribute('y2', 100 / 2 - lineWidth / 2)
    lines2[2].setAttribute('x1', 100 / 2 - lineWidth / 2)
    lines2[2].setAttribute('x2', 100 / 2 + lineWidth / 2)
    lines2[2].setAttribute('y1', 100 / 2 + gap / 2)
    lines2[2].setAttribute('y2', 100 / 2 + gap / 2)
    lines2[3].setAttribute('x1', 100 / 2 + lineWidth / 2)
    lines2[3].setAttribute('x2', 100 / 2 - lineWidth / 2)
    lines2[3].setAttribute('y1', 100 / 2 - gap / 2)
    lines2[3].setAttribute('y2', 100 / 2 - gap / 2)
    lines2.forEach(e => {
        e.setAttribute('stroke', `rgba(${r}, ${g}, ${b}, ${a})`)
        e.setAttribute('stroke-width', length)
    })
    lines1[0].setAttribute('x1', 100 / 2 + gap / 2)
    lines1[0].setAttribute('x2', 100 / 2 + gap / 2)
    lines1[0].setAttribute('y1', 100 / 2 - lineWidth / 2)
    lines1[0].setAttribute('y2', 100 / 2 + lineWidth / 2)
    lines1[1].setAttribute('x1', 100 / 2 - gap / 2)
    lines1[1].setAttribute('x2', 100 / 2 - gap / 2)
    lines1[1].setAttribute('y1', 100 / 2 + lineWidth / 2)
    lines1[1].setAttribute('y2', 100 / 2 - lineWidth / 2)
    lines1[2].setAttribute('x1', 100 / 2 - lineWidth / 2)
    lines1[2].setAttribute('x2', 100 / 2 + lineWidth / 2)
    lines1[2].setAttribute('y1', 100 / 2 + gap / 2)
    lines1[2].setAttribute('y2', 100 / 2 + gap / 2)
    lines1[3].setAttribute('x1', 100 / 2 + lineWidth / 2)
    lines1[3].setAttribute('x2', 100 / 2 - lineWidth / 2)
    lines1[3].setAttribute('y1', 100 / 2 - gap / 2)
    lines1[3].setAttribute('y2', 100 / 2 - gap / 2)
    lines1.forEach(e => {
        e.setAttribute('stroke', `rgba(${r}, ${g}, ${b}, ${a})`)
        e.setAttribute('stroke-width', length)
    })
}

let audio = new Audio('sounds/music1.mp3')
audio.volume = musicVolume
window.addEventListener('click', function onMusic() {
    if (document.getElementById('menuBg').style.display !== 'none') {
        audio.scr = 'sounds/music1.mp3'
        audio.loop = true
        audio.play()
    }
    window.removeEventListener('click', onMusic)
})

Array.from(document.getElementsByClassName('settingsSliderBlocks')).forEach(e => {
    if (localStorage.getItem(e.getAttribute('settingname'))) {
        e.getElementsByClassName('settingSlider')[0].value = Number(localStorage.getItem(e.getAttribute('settingname')))
        e.getElementsByClassName('settingInputs')[0].value = Number(localStorage.getItem(e.getAttribute('settingname')))
    } else {
        localStorage.setItem(String(e.getAttribute('settingname')), Number(e.getElementsByClassName('settingSlider')[0].value))
    }
})

Array.from(document.getElementsByClassName('settingSlider')).forEach(e => e.addEventListener('input', (event) => {
    event.target.parentElement.getElementsByClassName('settingInputs')[0].value = event.target.value;
    localStorage.setItem(String(event.target.parentElement.getAttribute('settingname')), Number(event.target.value)); settingsUp()
}))

Array.from(document.getElementsByClassName('settingInputs')).forEach(e => e.addEventListener('input', (event) => {
    event.target.parentElement.getElementsByClassName('settingSlider')[0].value = event.target.value;
    localStorage.setItem(String(event.target.parentElement.getAttribute('settingname')), Number(event.target.value)); settingsUp()
}))

Array.from(document.getElementsByClassName('crosshairInput')).forEach(e => e.addEventListener('input', drawCrosshair))

Array.from(document.getElementsByClassName('keyAssignmentsBtn')).forEach(e => {
    if (!localStorage.getItem(e.getAttribute('settingName'))) {
        localStorage.setItem(e.getAttribute('settingName'), e.getAttribute('defaultValue'))
    }
    e.innerText = localStorage.getItem(e.getAttribute('settingName'))
})

let settingedButton
Array.from(document.getElementsByClassName('keyAssignmentsBtn')).forEach(e => e.addEventListener('click', (event) => {
    event.target.innerText = ''
    settingedButton = event.target
    window.addEventListener('keydown', onSettingsKeyboard, false)
}))

function onSettingsKeyboard(event) {
    event.preventDefault()
    localStorage.setItem(settingedButton.getAttribute('settingName'), event.code)
    settingedButton.innerText = event.code
    keyAssignmentsUp()
    window.removeEventListener('keydown', onSettingsKeyboard, false)
}

settingsUp()
function settingsUp() {
    soundVolume = localStorage.getItem('soundsVolume') / 100
    musicVolume = localStorage.getItem('musicVolume') / 100
    audio.volume = musicVolume
    sensitivity = localStorage.getItem('mouseSensitivity')
    sensitivityX = localStorage.getItem('mouseAxlerationX')
    sensitivityY = localStorage.getItem('mouseAxlerationY')
}

keyAssignmentsUp()
function keyAssignmentsUp() {
    keys = {
        [localStorage.getItem('runningFoward')]: false,
        [localStorage.getItem('runningLeft')]: false,
        [localStorage.getItem('runningRight')]: false,
        [localStorage.getItem('runningBack')]: false,
        [localStorage.getItem('space')]: false,
        [localStorage.getItem('ducking')]: false,
        [localStorage.getItem('creeping')]: false,
        [localStorage.getItem('reloading')]: false,
        [localStorage.getItem('runningFoward')]: false
    }
}

document.getElementById('settingsBodyBlock').addEventListener('scroll', () => {
    let element = document.elementFromPoint(document.getElementById('settingsBodyBlock').offsetLeft, document.getElementById('settingsBodyBlock').offsetTop)
    if (element.getAttribute('settingBlockName')) {
        document.getElementById('settingsBlockLbl').innerText = element.getAttribute('settingBlockName')
    }
})

drawCrosshair()