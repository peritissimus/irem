import THREE from '../libs/threejs/Three.js'
import vertexShaderSource from '../shaders/fakeParticles/vertex.glsl?raw'
import fragmentShaderSource from '../shaders/fakeParticles/fragment.glsl?raw'

const vertexShader = THREE._evalReplace(vertexShaderSource, { THREE })
const fragmentShader = THREE._evalReplace(fragmentShaderSource, { THREE })
const AMOUNT = 60000

function init(scene) {
  fakeParticles.uniforms = {
    fogColor: { type: 'c', value: new THREE.Color(0) },
    fogDensity: { type: 'f', value: 0.025 },
    fogFar: { type: 'f', value: 2000 },
    fogNear: { type: 'f', value: 1 },
    posOffset: { type: 'v3', value: new THREE.Vector3(0, 0, 0) },
    cameraVector: { type: 'v3', value: new THREE.Vector3(0, 0, 0) },
    time: { type: 'f', value: fakeParticles.time },
    dpi: { type: 'f', value: window.devicePixelRatio || 1 },
    fov: { type: 'f', value: 50 },
    fade: { type: 'f', value: 50 },
    skip: { type: 'f', value: 5 },
    heightPower: { type: 'f', value: 0.9 },
    amount: { type: 'f', value: AMOUNT },
    floatTime: { type: 'f', value: 0 },
    d: { type: 'f', value: 40 },
  }
  const material = new THREE.ShaderMaterial({
    uniforms: fakeParticles.uniforms,
    vertexShader,
    fragmentShader,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: false,
    fog: true,
  })
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(AMOUNT * 3)
  for (let i = 0; i < AMOUNT; i++) {
    positions[i * 3] = i
    positions[i * 3 + 1] = 0
    positions[i * 3 + 2] = 0
  }
  geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3))
  fakeParticles.particles = new THREE.PointCloud(geometry, material)
  scene.add(fakeParticles.particles)
}

function update() {
  fakeParticles.uniforms.time.value = fakeParticles.time
  fakeParticles.uniforms.floatTime.value += 1
  fakeParticles.uniforms.fade.value = fakeParticles.fade
}

export const fakeParticles = {
  time: 0,
  fade: 1,
  init,
  update,
}
