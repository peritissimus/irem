import { scene3dController } from '../controllers/scene3dController.js'
import { snoise2D } from '../utils/noiseUtils.js'
import { clamp } from '../utils/native.js'
import * as THREE from 'three'
import { evalShader } from '../libs/threejs/Three.js'
import vertexShaderSource from '../shaders/postSubmitCircle/vertex.glsl?raw'
import fragmentShaderSource from '../shaders/postSubmitCircle/fragment.glsl?raw'

const vertexShader = evalShader(vertexShaderSource, { THREE })
const fragmentShader = evalShader(fragmentShaderSource, { THREE })
const SIZE = 512

let mesh
let position
let previousAnimation = false
const startPosition = new THREE.Vector3(0, 0, 0)
const deltaPosition = new THREE.Vector3(0, 0, 0)

function clampedNorm(value, min, max) {
  return clamp((value - min) / (max - min), 0, 1)
}

function init() {
  createMaterial()
  createMesh()
}

function createMaterial() {
  const canvas = (postSubmitCircle.canvas = document.createElement('canvas'))
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = (postSubmitCircle.ctx = canvas.getContext('2d'))
  ctx.fillStyle = '#f00'
  ctx.fillRect(0, 0, SIZE, SIZE)

  const uniforms = (postSubmitCircle.uniforms = {
    time: { type: 'f', value: 0 },
    tex: { type: 't', value: new THREE.Texture(canvas) },
    animation: { type: 'f', value: 0 },
    fade: { type: 'f', value: 0 },
  })
  postSubmitCircle.material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthTest: false,
    fog: false,
  })
  uniforms.tex.value.needsUpdate = true
}

function createMesh() {
  postSubmitCircle.geometry = new THREE.PlaneGeometry(SIZE, SIZE)
  mesh = postSubmitCircle.mesh = new THREE.Mesh(postSubmitCircle.geometry, postSubmitCircle.material)
  position = mesh.position
}

function easeOutCubic(value) {
  value -= 1
  return value * value * value + 1
}

function _easeInBack(value) {
  return value * value * (2.70158 * value - 1.70158)
}

function update() {
  postSubmitCircle.uniforms.time.value += 0.01
  const animation = postSubmitCircle.uniforms.animation.value
  if (animation > 1) {
    if (previousAnimation <= 1) {
      startPosition.copy(position)
      deltaPosition.copy(position)
      deltaPosition.sub(scene3dController.cameraPosition).normalize()
      const angle = Math.atan2(deltaPosition.z, deltaPosition.x)
      deltaPosition.multiplyScalar(400)
      const sideOffset = (Math.random() * 2 - 1) * 200
      deltaPosition.x += Math.sin(angle) * sideOffset
      deltaPosition.z += Math.cos(angle) * sideOffset
      const x = deltaPosition.x + startPosition.x
      const z = deltaPosition.z + startPosition.z
      const y =
        snoise2D(x * 0.0021 + 4, z * 0.0021 + 4) * -40 +
        snoise2D(x * 0.0013 + 32, z * 0.0013 + 32) * -90
      deltaPosition.y = y - startPosition.y
    }
    updateFlying(animation)
  }
  previousAnimation = animation
}

function updateFlying(animation) {
  let ratio = clampedNorm(animation, 1, 3)
  position.x = startPosition.x + easeOutCubic(ratio) * deltaPosition.x
  position.z = startPosition.z + easeOutCubic(ratio) * deltaPosition.z
  ratio = clampedNorm(animation, 1.5, 4)
  position.y = startPosition.y + Math.pow(ratio, 3) * deltaPosition.y
  mesh.lookAt(scene3dController.cameraPosition)
}

function reset() {
  postSubmitCircle.lockCenter = true
  postSubmitCircle.uniforms.animation.value = 0
}

export const postSubmitCircle = {
  canvas: null,
  ctx: null,
  offsetLeft: 0,
  offsetTop: 35,
  currentStep: 0,
  lockCenter: false,
  SIZE,
  init,
  update,
  reset,
}
