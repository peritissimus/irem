import { deepMixIn, lerp, clamp } from '../utils/native.js'
import { config } from '../config.js'
import { stageReference } from '../stageReference.js'
import { animator } from '../animation/animator.js'
import { uiController } from './uiController.js'
import { inputController } from './inputController.js'
import { tutorialController } from './tutorialController.js'
import { map } from '../scene3d/map.js'
import { stepCircle } from '../scene3d/stepCircle.js'
import { postSubmitCircle } from '../scene3d/postSubmitCircle.js'
import { ParticleField } from '../scene3d/ParticleField.js'
import { searchPostParticles } from '../scene3d/searchPostParticles.js'
import { navPostParticles } from '../scene3d/navPostParticles.js'
import { fakeParticles } from '../scene3d/fakeParticles.js'
import { qs } from '../utils/dom.js'
import * as THREE from 'three'
import '../libs/threejs/Three.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { SavePass } from 'three/examples/jsm/postprocessing/SavePass.js'
import { RGBShiftShader } from 'three/examples/jsm/shaders/RGBShiftShader.js'
import { HorizontalTiltShiftShader } from 'three/examples/jsm/shaders/HorizontalTiltShiftShader.js'
import { VerticalTiltShiftShader } from 'three/examples/jsm/shaders/VerticalTiltShiftShader.js'
import { BlendShader } from '../postprocessing/shaders/BlendShader.js'
import { CustomShader } from '../postprocessing/shaders/CustomShader.js'

// NOTE: callers of moveTo/resetCamera pass ease strings using EKTweener's
// naming convention (e.g. 'easeInOutSine', 'easeOutSine', 'linear'). Map them
// to gsap equivalents here so call-sites don't need to change.
const EASE_MAP = {
  linear: 'none',
  easeOutCirc: 'circ.out',
  easeInOutCirc: 'circ.inOut',
  easeInCirc: 'circ.in',
  easeOutQuad: 'power1.out',
  easeInOutQuad: 'power1.inOut',
  easeInQuad: 'power1.in',
  easeOutCubic: 'power2.out',
  easeInOutCubic: 'power2.inOut',
  easeInCubic: 'power2.in',
  easeOutQuart: 'power3.out',
  easeInOutQuart: 'power3.inOut',
  easeOutExpo: 'expo.out',
  easeInExpo: 'expo.in',
  easeOutSine: 'sine.out',
  easeInOutSine: 'sine.inOut',
  easeInSine: 'sine.in',
  easeOutBack: 'back.out',
}

function mapEase(ease) {
  if (!ease) return ease
  return EASE_MAP[ease] || ease
}

// Config-derived module locals populated in init(). Reading config at module
// top-level would see undefined under the lazy-config rule.
let FOV_MIN
let FOV_MAX
let CAMERA_HORIZONTAL_DISTANCE
let CAMERA_VERTICAL_BASE
let CAMERA_VERTICAL_UP
let CAMERA_VERTICAL_DOWN
let GRID_SEG
let GRID_SIZE
let GRID_TOTAL
let GRID_ORIGIN

// DOM / renderer handles set in init()
let container
let containerStyle
let windowWidth
let windowHeight
let halfWidth
let camera
let raycaster
let mainScene
let particlesScene
let renderer
let composer

// Three.js helpers
const lookAtHelper = new THREE.Object3D()
const mapRotationHelper = new THREE.Object3D()
const fixedScalePoint = new THREE.Object3D()

// Camera + control state
let wasHasControl = false
let pixelToUnitRatio = 1

// Keyboard WASD state (not used in the default build but preserved)
let _isKeyD = false
let _isKeyS = false
let _isKeyA = false
let _isKeyW = false
let isDragging

// Vectors (created eagerly — THREE.Vector3 doesn't touch DOM)
const cameraPosition = new THREE.Vector3(0, 0, 0)
const cameraTargetPosition = new THREE.Vector3(0, 0, 0)
const lookAtPosition = new THREE.Vector3(0, 0, 0)
const lookAtTargetPosition = new THREE.Vector3(0, 0, 0)
const cameraVector = new THREE.Vector3(0, 0, 0)
const cameraPosOffset = new THREE.Vector3()

let rotationDeltaHorizontal = 0
let translateZDelta = 0
let translateXDelta = 0

let particleFields = []
let cameraSwingTime = 0

// Shader passes (assigned in init)
let hblurPass = null
let vblurPass = null
let blurBlendPass = null
let rgbShiftPass = null
let customShaderPass = null
let savePass
let renderPass

// Interactive raycast hover target
let hoveredInteractivePost = null
let normalizedMouseX = 0
let normalizedMouseY = 0

// Previous frame camera/lookAt positions (for derived map rotation)
let prevCameraX
let prevCameraZ
let prevLookAtX
let prevLookAtZ

let distanceWalked = 0 // eslint-disable-line no-unused-vars
let lastFrameTime = 0

function init() {
  FOV_MIN = config.SCENE_3D_FOV_MIN
  FOV_MAX = config.SCENE_3D_FOV_MAX
  CAMERA_HORIZONTAL_DISTANCE = config.SCENE_CAMERA_HORIZONTAL_DISTANCE
  CAMERA_VERTICAL_BASE = config.SCENE_CAMERA_VERTICAL_BASE_DISTANCE
  CAMERA_VERTICAL_UP = config.SCENE_CAMERA_VERTICAL_UP_DISTANCE
  CAMERA_VERTICAL_DOWN = config.SCENE_CAMERA_VERTICAL_DOWN_DISTANCE
  GRID_SEG = config.PARTICLE_FIELD_GRID_SEG
  GRID_SIZE = config.PARTICLE_FIELD_GRID_SIZE
  GRID_TOTAL = GRID_SIZE * GRID_SEG
  GRID_ORIGIN = -GRID_TOTAL / 2

  // Initial camera placement
  cameraPosition.set(0, CAMERA_VERTICAL_BASE, CAMERA_HORIZONTAL_DISTANCE)
  cameraTargetPosition.set(0, CAMERA_VERTICAL_BASE, CAMERA_HORIZONTAL_DISTANCE)
  prevCameraX = cameraPosition.x
  prevCameraZ = cameraPosition.z
  prevLookAtX = lookAtPosition.x
  prevLookAtZ = lookAtPosition.z

  scene3dController.cameraPosition = cameraPosition
  scene3dController.cameraTargetPosition = cameraTargetPosition
  scene3dController.lookAtPosition = lookAtPosition
  scene3dController.lookAtTargetPosition = lookAtTargetPosition
  scene3dController.cameraVector = cameraVector
  scene3dController.cameraPosOffset = cameraPosOffset
  scene3dController.fixedScalePoint = fixedScalePoint

  container = qs('.base-3d-container')
  containerStyle = container.style

  camera = new THREE.PerspectiveCamera(100, 1, 1, 3000)
  raycaster = new THREE.Raycaster()
  mainScene = new THREE.Scene()

  map.init()
  mainScene.add(map.particles)
  stepCircle.init()
  mainScene.add(stepCircle.particles)
  postSubmitCircle.init()
  mainScene.add(postSubmitCircle.mesh)

  particlesScene = new THREE.Scene()
  particlesScene.fog = new THREE.FogExp2(0x070707, 0.0006)

  particleFields = []
  for (let i = 0, len = GRID_SEG * GRID_SEG; i < len; i += 1) {
    const field = new ParticleField(
      config.amount,
      GRID_ORIGIN + (i % GRID_SEG) * GRID_SIZE,
      GRID_ORIGIN + Math.floor(i / GRID_SEG) * GRID_SIZE,
    )
    particleFields[i] = field
    particlesScene.add(field.particles)
  }

  particlesScene.add(lookAtHelper)
  fakeParticles.init(particlesScene)
  searchPostParticles.init(particlesScene)
  navPostParticles.init(particlesScene)

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    sortObjects: false,
  })
  // Match the original r71 rendering pipeline: shaders wrote directly to a linear
  // framebuffer without an output-side gamma encode. Modern three defaults to
  // SRGBColorSpace which adds that encode and shifts every color — pin it back.
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace
  renderer.setClearColor(0x070707, 1)
  renderer.autoClear = false

  composer = new EffectComposer(renderer)
  renderPass = new RenderPass(particlesScene, camera)
  rgbShiftPass = scene3dController.rgbShift = new ShaderPass(RGBShiftShader)
  savePass = new SavePass()
  hblurPass = scene3dController.hblur = new ShaderPass(HorizontalTiltShiftShader)
  vblurPass = scene3dController.vblur = new ShaderPass(VerticalTiltShiftShader)
  blurBlendPass = scene3dController.blurBlend = new ShaderPass(BlendShader)
  blurBlendPass.uniforms.tDiffuse2.value = savePass.renderTarget.texture
  customShaderPass = scene3dController.customShader = new ShaderPass(CustomShader)
  customShaderPass.noiseSpeed = 1

  composer.addPass(renderPass)
  composer.addPass(savePass)
  composer.addPass(rgbShiftPass)
  composer.addPass(hblurPass)
  composer.addPass(vblurPass)
  composer.addPass(blurBlendPass)
  composer.addPass(customShaderPass)
  customShaderPass.renderToScreen = true

  rgbShiftPass.uniforms.amount.value = 4e-4

  cameraPosOffset.tX = 0
  cameraPosOffset.tY = 0
  cameraPosOffset.tZ = 0
  cameraPosOffset.a = 0

  container.append(renderer.domElement)
  onResize()

  inputController.add(container, 'down', onDown)
  inputController.onMove.add(onMove)
  inputController.onUp.add(onUp)
  inputController.add(container, 'wheel', onWheel)

  window.addEventListener('keydown', onKeyboard)
  window.addEventListener('keyup', onKeyboard)

  stageReference.onResize.add(onResize)
  stageReference.onRender.add(render)

  animator.killTweensOf(customShaderPass.uniforms.alpha, 'value')
  animator.to(customShaderPass.uniforms.alpha, {
    duration: 3,
    value: config.DEFAULT_NOISE_RATIO,
    ease: 'none',
  })

  updateFading()
  initDevGUI()
}

async function initDevGUI() {
  if (!config.IS_DEV) return
  const { GUI } = await import('lil-gui')
  const gui = new GUI({ title: 'irem dev' })

  const noise = gui.addFolder('noise / post')
  noise.add(customShaderPass.uniforms.alpha, 'value', 0, 0.5, 0.001).name('grain alpha')
  noise.add(customShaderPass, 'noiseSpeed', 0, 5, 0.01).name('grain speed')
  noise.add(customShaderPass.uniforms.opacity, 'value', 0, 1, 0.01).name('scene opacity')
  noise.add(customShaderPass.uniforms.gradientOpacity, 'value', 0, 1, 0.01).name('gradient')
  noise.add(customShaderPass.uniforms.vRadius, 'value', 0, 2, 0.01).name('vignette radius')
  noise.add(customShaderPass.uniforms.vSoftness, 'value', 0, 2, 0.01).name('vignette soft')
  noise.add(customShaderPass.uniforms.vAlpha, 'value', 0, 1, 0.01).name('vignette alpha')
  noise.add(rgbShiftPass.uniforms.amount, 'value', 0, 0.01, 0.0001).name('rgb shift')
  noise.add(scene3dController, 'blurriness', 0, 5, 0.01).name('blur')

  const fp = gui.addFolder('fakeParticles')
  fp.add(fakeParticles, 'fade', 0, 1).name('fade')
  fp.add(fakeParticles, 'time', 0, 1).name('time')
  fp.add(fakeParticles.uniforms.skip, 'value', 1, 1000).name('skip')
  fp.add(fakeParticles.uniforms.amount, 'value', 1, 60000).name('amount')
  fp.add(fakeParticles.uniforms.heightPower, 'value', 0.5, 1.8).name('heightPower')

  const actions = {
    play() {
      const vector = cameraVector.clone().normalize()
      vector.y = 0
      fakeParticles.uniforms.posOffset.value.x = lookAtTargetPosition.x
      fakeParticles.uniforms.posOffset.value.z = lookAtTargetPosition.z
      fakeParticles.uniforms.cameraVector.value.copy(
        vector.multiplyScalar(CAMERA_HORIZONTAL_DISTANCE),
      )
      animator.killTweensOf(fakeParticles)
      animator.set(fakeParticles, { time: 0, fade: 0 })
      animator.to(fakeParticles, { duration: 15, time: 1, ease: 'sine.out' })
      animator.to(fakeParticles, { duration: 0.5, fade: 1, ease: 'none' })
    },
  }
  fp.add(actions, 'play').name('play')
  fp.close()
}

function onKeyboard(event) {
  const pressed = event.type.indexOf('down') > -1
  if (!scene3dController.hasControl && pressed) return
  switch (event.keyCode) {
    case 68:
      _isKeyD = pressed
      break
    case 83:
      _isKeyS = pressed
      break
    case 65:
      _isKeyA = pressed
      break
    case 87:
      _isKeyW = pressed
      break
  }
}

function onDown() {
  isDragging = true
}

function onMove(event) {
  normalizedMouseX = (event.x / windowWidth) * 2 - 1
  normalizedMouseY = -(event.y / windowHeight) * 2 + 1
  if (!scene3dController.hasControl || !isDragging) return
  rotationDeltaHorizontal += event.deltaX * 0.002 * (1 - scene3dController.zoom * 0.25)
  translateZDelta -= event.deltaY * (1 - scene3dController.zoom * 0.75) * 0.7
}

function onUp(event) {
  isDragging = false

  if (scene3dController.hasControl && event.isDoubleClick) {
    rotationDeltaHorizontal -=
      normalizedMouseX *
      halfWidth *
      0.001 *
      (1 - scene3dController.zoom * 0.25)
    scene3dController.targetZoom = clamp(scene3dController.targetZoom + 0.2, 0, 1)
  }

  if (scene3dController.canInteractiveWithPost) {
    if (event.isDoubleClick || (event.isClick && hoveredInteractivePost)) {
      hoveredInteractivePost.onOut()
      hoveredInteractivePost.onClick()
      hoveredInteractivePost = null
    }
  }
}

function onWheel(delta) {
  if (!scene3dController.hasControl) return
  if (delta > 0) {
    rotationDeltaHorizontal -=
      normalizedMouseX *
      halfWidth *
      2e-4 *
      (1 - scene3dController.zoom * 0.25) *
      (1 - scene3dController.targetZoom)
  }
  scene3dController.targetZoom = clamp(scene3dController.targetZoom + delta * 0.05, 0, 1)
}

function onResize() {
  windowWidth = window.innerWidth
  windowHeight = window.innerHeight
  halfWidth = windowWidth / 2

  if (camera) {
    camera.aspect = windowWidth / windowHeight
    camera.setViewOffset(windowWidth, windowHeight, 0, 0, windowWidth, windowHeight)
  }
  fakeParticles.uniforms.fov.value = 90 + 60 * clamp(windowWidth / 3000, 0, 1)
  if (renderer) renderer.setSize(windowWidth, windowHeight)
  if (composer) {
    composer.setSize(windowWidth, windowHeight)
    savePass.renderTarget = composer.renderTarget1.clone()
    blurBlendPass.uniforms.tDiffuse2.value = savePass.renderTarget.texture
  }
}

function horizontalAngle() {
  return (
    Math.atan2(
      lookAtTargetPosition.z - cameraTargetPosition.z,
      lookAtTargetPosition.x - cameraTargetPosition.x,
    ) +
    Math.PI / 2
  )
}

function hypot(x, y) {
  return Math.sqrt(x * x + y * y)
}

function render() {
  const now = +new Date()
  const dtMs = now - lastFrameTime // eslint-disable-line no-unused-vars
  const ease = scene3dController.movementEase

  scene3dController.zoom +=
    (scene3dController.targetZoom - scene3dController.zoom) * scene3dController.zoomSpeed
  const zoom = scene3dController.zoom
  uiController.scaleMapBtn(1 + zoom)

  scene3dController.cameraFov = camera.fov = lerp(zoom, FOV_MAX, FOV_MIN)
  camera.updateProjectionMatrix()

  let horizRotationApplied
  let translateZApplied
  let translateXApplied

  const radius = (1 - zoom) * (CAMERA_HORIZONTAL_DISTANCE - 5) + 5

  if (scene3dController.hasControl !== wasHasControl) {
    rotationDeltaHorizontal = 0
    translateZDelta = 0
  }

  if (scene3dController.hasControl) {
    let angle = horizontalAngle()
    horizRotationApplied = rotationDeltaHorizontal * 0.1
    rotationDeltaHorizontal -= horizRotationApplied
    distanceWalked += Math.abs(rotationDeltaHorizontal * 5)

    cameraTargetPosition.x = lookAtTargetPosition.x - Math.sin(angle) * radius
    cameraTargetPosition.y =
      CAMERA_VERTICAL_BASE +
      Math.pow(zoom, 0.15) * CAMERA_VERTICAL_UP -
      Math.pow(zoom, 40) * CAMERA_VERTICAL_DOWN
    cameraTargetPosition.z = lookAtTargetPosition.z + Math.cos(angle) * radius

    angle -= Math.PI
    angle -= horizRotationApplied

    lookAtTargetPosition.x = cameraTargetPosition.x - Math.sin(angle) * radius
    lookAtTargetPosition.y = (1 - zoom) * CAMERA_VERTICAL_BASE
    lookAtTargetPosition.z = cameraTargetPosition.z + Math.cos(angle) * radius
  }

  lookAtPosition.x += (lookAtTargetPosition.x - lookAtPosition.x) * ease
  lookAtPosition.y += (lookAtTargetPosition.y - lookAtPosition.y) * ease
  lookAtPosition.z += (lookAtTargetPosition.z - lookAtPosition.z) * ease
  cameraPosition.x += (cameraTargetPosition.x - cameraPosition.x) * ease
  cameraPosition.y += (cameraTargetPosition.y - cameraPosition.y) * ease
  cameraPosition.z += (cameraTargetPosition.z - cameraPosition.z) * ease

  const offsetAngle = cameraPosOffset.a
  const offsetScale = Math.pow(Math.sin(offsetAngle * Math.PI), 3)
  cameraPosOffset.x = offsetScale * cameraPosOffset.tX
  cameraPosOffset.y = offsetScale * cameraPosOffset.tY
  cameraPosOffset.z = offsetScale * cameraPosOffset.tZ

  cameraPosition.add(cameraPosOffset)
  camera.position.copy(cameraPosition)
  lookAtHelper.position.copy(lookAtPosition)

  if (scene3dController.hasControl) {
    lookAtHelper.position.y = cameraPosition.y
    camera.lookAt(lookAtHelper.position)
    translateZApplied = translateZDelta * 0.1
    translateZDelta -= translateZApplied
    translateXApplied = translateXDelta * 0.1
    translateXDelta -= translateXApplied
    camera.translateZ(translateZApplied)
    camera.position.y += Math.abs(translateZApplied) * 0.3
    camera.translateX(translateXApplied)
    distanceWalked += Math.abs(translateZApplied)

    const cameraShift = {
      x: camera.position.x - cameraPosition.x,
      y: 0,
      z: camera.position.z - cameraPosition.z,
    }
    cameraTargetPosition.add(cameraShift)
    lookAtTargetPosition.add(cameraShift)
    cameraPosition.add(cameraShift)
    lookAtPosition.add(cameraShift)
    lookAtHelper.position.copy(lookAtPosition)
  }

  lookAtHelper.lookAt(camera.position)

  cameraSwingTime += scene3dController.cameraSwingSpeed
  const swingRadius = scene3dController.cameraSwingRadius
  camera.translateX(Math.sin(cameraSwingTime) * swingRadius * (1 - zoom))
  camera.translateY((Math.sin(cameraSwingTime * 2) * swingRadius) / 2)
  camera.lookAt(lookAtHelper.position)

  scene3dController.lookAtHorizontalAngle = horizontalAngle()
  customShaderPass.uniforms.gradientOffset.value = scene3dController.lookAtHorizontalAngle

  const lookAtX = lookAtPosition.x
  const lookAtZ = lookAtPosition.z
  const camX = cameraPosition.x
  const camZ = cameraPosition.z

  cameraVector.copy(cameraPosition)
  cameraVector.sub(lookAtPosition)

  pixelToUnitRatio = (2 * Math.tan(((camera.fov / 360) * Math.PI))) / windowHeight
  fixedScalePoint.position.copy(camera.position)
  fixedScalePoint.rotation.copy(camera.rotation)
  scene3dController.fixedScalePointLength = 1 / pixelToUnitRatio
  fixedScalePoint.translateZ(-scene3dController.fixedScalePointLength)

  // Update particle fields — each wraps to follow the camera in GRID_TOTAL-sized tiles.
  let field
  for (let i = 0, len = GRID_SEG * GRID_SEG; i < len; i += 1) {
    field = particleFields[i]
    field.particles.position.x =
      -Math.floor((-lookAtX + field.offsetX + GRID_TOTAL / 2 + GRID_SIZE / 2) / GRID_TOTAL) *
      GRID_TOTAL
    field.particles.position.z =
      -Math.floor((-lookAtZ + field.offsetZ + GRID_TOTAL / 2 + GRID_SIZE / 2) / GRID_TOTAL) *
      GRID_TOTAL
    field.uniforms.posFieldOffset.value.x = field.offsetX + field.particles.position.x
    field.uniforms.posFieldOffset.value.z = field.offsetZ + field.particles.position.z
    field.move(lookAtX, lookAtZ)
    field.uniforms.time.value += 0.2
    field.uniforms.zoom.value = zoom
    field.uniforms.cameraVector.value.copy(cameraVector)
  }

  fakeParticles.update()
  const searchMeshes = searchPostParticles.update()
  const navMeshes = navPostParticles.update()

  if (scene3dController.canInteractiveWithPost) {
    const candidates = searchMeshes.concat(navMeshes)
    if (hoveredInteractivePost) candidates.unshift(hoveredInteractivePost)

    // Camera moved this frame; raycast runs before composer.render so the
    // matrix updates haven't happened yet. Update the camera + each candidate
    // manually so setFromCamera and intersectObject see fresh world matrices.
    camera.updateMatrixWorld()
    raycaster.setFromCamera({ x: normalizedMouseX, y: normalizedMouseY }, camera)

    let hit
    for (let i = 0, len = candidates.length; i < len; i += 1) {
      // Modern Three's Raycaster.intersectObject doesn't skip invisible meshes
      // (r71 did). Skip pooled-but-not-yet-positioned PostParticles explicitly.
      if (!candidates[i].visible) continue
      candidates[i].updateMatrixWorld()
      hit = raycaster.intersectObject(candidates[i])[0]
      if (hit) break
    }

    if ((!hit && hoveredInteractivePost) ||
        (hoveredInteractivePost && hit && hit.object !== hoveredInteractivePost)) {
      hoveredInteractivePost.onOut()
      hoveredInteractivePost = null
    }
    if (hit && hoveredInteractivePost !== hit.object) {
      hoveredInteractivePost = hit.object
      hoveredInteractivePost.onOver()
    }
  }

  if (hoveredInteractivePost) {
    containerStyle.cursor = 'pointer'
  } else if (scene3dController.hasControl) {
    containerStyle.cursor = isDragging ? 'grabbing' : 'grab'
    containerStyle.cursor = isDragging ? '-webkit-grabbing' : '-webkit-grab'
  } else {
    containerStyle.cursor = 'auto'
  }

  customShaderPass.uniforms.zoom.value = Math.pow(zoom, 1.5)
  customShaderPass.uniforms.time.value += customShaderPass.noiseSpeed

  const blurriness = scene3dController.blurriness
  hblurPass.uniforms.h.value = blurriness / (0.75 * windowWidth)
  vblurPass.uniforms.v.value = blurriness / (0.75 * windowHeight)
  blurBlendPass.uniforms.h.value = blurriness / (0.75 * windowWidth)
  blurBlendPass.uniforms.v.value = blurriness / (0.75 * windowHeight)
  hblurPass.uniforms.r.value =
    vblurPass.uniforms.r.value =
    blurBlendPass.uniforms.r.value =
      0.5
  blurBlendPass.uniforms.blendRatio.value = scene3dController.blurBlendRatio * (1 - zoom)

  composer.render(0.1)

  // Map particles ride the fixed-scale point with quaternion-derived rotation
  map.particles.position.copy(fixedScalePoint.position)
  map.particles.rotation.copy(fixedScalePoint.rotation)
  map.particles.translateX(-halfWidth + map.offsetLeft)
  map.particles.translateY(map.offsetTop)

  const camDx = lookAtX - camX
  const camDz = lookAtZ - camZ
  const prevDx = prevLookAtX - prevCameraX
  const prevDz = prevLookAtZ - prevCameraZ
  let rotationDelta =
    Math.atan2(camDz, camDx) - Math.atan2(prevDz, prevDx)
  if (rotationDelta > Math.PI) rotationDelta -= Math.PI * 2
  else if (rotationDelta < -Math.PI) rotationDelta += Math.PI * 2
  mapRotationHelper.rotateZ(-rotationDelta)

  const cameraDx = cameraPosition.x - prevCameraX
  const cameraDz = cameraPosition.z - prevCameraZ
  const cameraDist = hypot(cameraDx, cameraDz)
  const dot =
    (cameraDx * camDx + cameraDz * camDz) / (cameraDist * hypot(camDx, camDz))
  const forward = dot > 0
  mapRotationHelper.rotateX(cameraDist * (forward ? -1 : 1) * 0.002)

  map.uniforms.rotation.value.copy(mapRotationHelper.quaternion || mapRotationHelper._quaternion)
  map.uniforms.zoom.value = zoom

  if (stepCircle.uniforms.opacity.value > 0) {
    stepCircle.particles.position.copy(fixedScalePoint.position)
    stepCircle.particles.rotation.copy(fixedScalePoint.rotation)
    stepCircle.particles.translateX(stepCircle.offsetLeft)
    stepCircle.particles.translateY(stepCircle.offsetTop)
    stepCircle.updateStepTimes()
  }

  if (postSubmitCircle.uniforms.animation.value <= 1) {
    postSubmitCircle.mesh.position.copy(fixedScalePoint.position)
    postSubmitCircle.mesh.rotation.copy(fixedScalePoint.rotation)
    postSubmitCircle.mesh.translateX(postSubmitCircle.offsetLeft)
    postSubmitCircle.mesh.translateY(postSubmitCircle.offsetTop)
    postSubmitCircle.update()
  } else {
    postSubmitCircle.update()
  }

  camera.near = 1e-5
  camera.updateProjectionMatrix()
  renderer.render(mainScene, camera)
  camera.near = 1
  camera.updateProjectionMatrix()

  wasHasControl = scene3dController.hasControl
  prevCameraX = cameraPosition.x
  prevCameraZ = cameraPosition.z
  prevLookAtX = lookAtPosition.x
  prevLookAtZ = lookAtPosition.z

  cameraPosition.sub(cameraPosOffset)
  camera.position.sub(cameraPosOffset)

  lastFrameTime = now
}

function showMap() {
  map.uniforms.visible.value = 1
}

function hideMap() {
  map.uniforms.visible.value = 0
}

function showSearchedPosts(posts) {
  searchPostParticles.show(posts)
}

function hideSearchedPosts() {
  searchPostParticles.hide()
}

function showParticles() {
  const ratio = config.settings.fading / 100
  for (let i = 0, len = GRID_SEG * GRID_SEG; i < len; i += 1) {
    const fading = particleFields[i].uniforms.fading
    animator.killTweensOf(fading, 'value')
    animator.to(fading, {
      duration: 5,
      value: ratio,
      ease: 'none',
    })
  }
}

// NOTE: `opts.cameraOffsetAnimation`, `opts.cb`, and per-section
// `duration` overrides can all be undefined; original used `=== S` sentinel
// where `var S;` is implicit `undefined`. We use explicit `=== undefined`.
function moveTo(opts) {
  let duration
  const totalDuration = opts.duration === undefined ? 1 : opts.duration
  scene3dController.hasControl =
    opts.lockControl === undefined ? false : !opts.lockControl
  scene3dController.canInteractiveWithPost = scene3dController.hasControl

  const finalHook = opts.lookAt || opts.camera || opts.controller
  finalHook.onComplete = () => {
    scene3dController.hasControl =
      opts.hasControl === undefined ? true : opts.hasControl
    scene3dController.canInteractiveWithPost =
      opts.canInteractiveWithPost === undefined
        ? scene3dController.hasControl
        : opts.canInteractiveWithPost
    if (opts.cb) opts.cb()
  }

  if (opts.controller) {
    opts.controller.ease = mapEase(opts.controller.ease || 'linear')
    if (opts.controller.duration !== undefined) {
      duration = opts.controller.duration
      delete opts.controller.duration
    } else {
      duration = totalDuration
    }
    animator.killTweensOf(scene3dController)
    animator.to(scene3dController, { duration, ...opts.controller })
  }

  if (opts.camera) {
    opts.camera.ease = mapEase(opts.camera.ease || 'easeInOutSine')
    if (opts.camera.duration !== undefined) {
      duration = opts.camera.duration
      delete opts.camera.duration
    } else {
      duration = totalDuration
    }
    animator.killTweensOf(cameraTargetPosition)
    animator.to(cameraTargetPosition, { duration, ...opts.camera })
    animator.killTweensOf(cameraPosOffset, 'a')
    animator.to(cameraPosOffset, {
      duration,
      a: opts.cameraOffsetAnimation === undefined ? 0 : opts.cameraOffsetAnimation,
      ease: 'none',
    })
  }

  if (opts.lookAt) {
    opts.lookAt.ease = mapEase(opts.lookAt.ease || 'easeOutSine')
    if (opts.lookAt.duration !== undefined) {
      duration = opts.lookAt.duration
      delete opts.lookAt.duration
    } else {
      duration = totalDuration
    }
    animator.killTweensOf(lookAtTargetPosition)
    animator.to(lookAtTargetPosition, { duration, ...opts.lookAt })
  }
}

function resetCamera(opts) {
  const target = lookAtTargetPosition
  const angle = scene3dController.lookAtHorizontalAngle
  const cameraOffsetY = opts.cameraOffsetY || 0
  const lookAtOffsetY = opts.lookAtOffsetY || 0

  moveTo(
    deepMixIn(
      {
        hasControl: true,
        lockControl: true,
        controller: {
          blurBlendRatio: 1,
          zoom: 0,
          targetZoom: 0,
          cameraSwingRadius: 0.6,
        },
        camera: {
          x: target.x - Math.sin(angle) * CAMERA_HORIZONTAL_DISTANCE,
          y: CAMERA_VERTICAL_BASE + cameraOffsetY,
          z: target.z + Math.cos(angle) * CAMERA_HORIZONTAL_DISTANCE,
        },
        lookAt: {
          x: lookAtPosition.x,
          y: CAMERA_VERTICAL_BASE + lookAtOffsetY,
          z: lookAtPosition.z,
        },
      },
      opts,
    ),
  )
}

function enableControl(canInteract) {
  scene3dController.hasControl = true
  scene3dController.canInteractiveWithPost =
    canInteract === undefined ? true : canInteract
  animator.killTweensOf(scene3dController)
  animator.killTweensOf(cameraTargetPosition)
  animator.killTweensOf(lookAtTargetPosition)
  tutorialController.show()
}

function disableControl(canInteract) {
  animator.killTweensOf(scene3dController)
  animator.killTweensOf(cameraTargetPosition)
  animator.killTweensOf(lookAtTargetPosition)
  scene3dController.hasControl = false
  scene3dController.canInteractiveWithPost =
    canInteract === undefined ? false : canInteract
  tutorialController.hide()
}

function updateFading(value) {
  const ratio = (value === undefined ? config.settings.fading : value) / 100
  customShaderPass.uniforms.opacity.value = ratio
  map.uniforms.fading.value = ratio
}

export const scene3dController = {
  hasControl: false,
  canInteractiveWithPost: false,
  isActive: true,
  movementEase: 0.1,
  lookAtHorizontalAngle: 0,
  zoomSpeed: 0.1,
  zoom: 0,
  targetZoom: 0,
  cameraFov: 0,
  cameraSwingSpeed: 0.015,
  cameraSwingRadius: 0.6,
  blurriness: 2.2,
  blurBlendRatio: 1,
  fixedScalePointLength: 0,
  fixedScalePoint,
  cameraPosition,
  cameraTargetPosition,
  lookAtPosition,
  lookAtTargetPosition,
  cameraVector,
  cameraPosOffset,
  hblur: null,
  vblur: null,
  blurBlend: null,
  rgbShift: null,
  customShader: null,
  init,
  render,
  showMap,
  hideMap,
  showSearchedPosts,
  hideSearchedPosts,
  showParticles,
  moveTo,
  resetCamera,
  enableControl,
  disableControl,
  updateFading,
}
