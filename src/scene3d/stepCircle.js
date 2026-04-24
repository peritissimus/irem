import { config } from '../config.js'
import THREE from '../libs/threejs/Three.js'
import vertexShaderSource from '../shaders/stepCircle/vertex.glsl?raw'
import fragmentShaderSource from '../shaders/stepCircle/fragment.glsl?raw'

const vertexShader = THREE._evalReplace(vertexShaderSource, { THREE })
const fragmentShader = THREE._evalReplace(fragmentShaderSource, { THREE })

function init() {
  createMaterial()
  createGeometry()
}

function createMaterial() {
  stepCircle.uniforms = {
    amountPerDegree: { type: 'f', value: config.STEP_CIRCLE_PARTICLE_AMOUNT_PER_DEGREE },
    time: { type: 'f', value: 0 },
    extraTime: { type: 'f', value: 0 },
    animationRatio: { type: 'f', value: 0 },
    focusRatio: { type: 'f', value: 0 },
    opacity: { type: 'f', value: 1 },
    fading: { type: 'f', value: 0 },
    dpi: { type: 'f', value: window.devicePixelRatio || 1 },
    stepTimes: { type: 'v4', value: new THREE.Vector4(0, 0, 0, 0) },
    stepExtraTimes: { type: 'v4', value: new THREE.Vector4(0, 0, 0, 0) },
  }
  stepCircle.material = new THREE.ShaderMaterial({
    uniforms: stepCircle.uniforms,
    vertexShader,
    fragmentShader,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: false,
  })
}

function createGeometry() {
  const geometry = (stepCircle.geometry = new THREE.BufferGeometry())
  const amountPerDegree = config.STEP_CIRCLE_PARTICLE_AMOUNT_PER_DEGREE
  const amount = amountPerDegree * 360
  const positions = new Float32Array(amount * 3)

  for (let i = 0; i < amount; i++) {
    const angle = (i / 180) * Math.PI
    const radius = 1 + ~~((i / amount) * amountPerDegree) / amountPerDegree
    positions[i * 3] = Math.sin(angle) * radius
    positions[i * 3 + 1] = Math.cos(angle) * radius
    positions[i * 3 + 2] = 0
  }

  geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3))
  stepCircle.particles = new THREE.PointCloud(geometry, stepCircle.material)
}

function updateStepTimes() {
  const uniforms = stepCircle.uniforms
  const step = (uniforms.animationRatio.value - 2) | 0
  uniforms.time.value += 0.01
  const stepTimes = uniforms.stepTimes.value
  if (step === 0) stepTimes.x += 0.01
  if (step === 1) stepTimes.y += 0.01
  if (step === 2) stepTimes.z += 0.01
  if (step === 3) stepTimes.w += 0.01
  stepCircle.currentStep = step
}

export const stepCircle = {
  offsetLeft: 0,
  offsetTop: 35,
  currentStep: 0,
  init,
  updateStepTimes,
}
