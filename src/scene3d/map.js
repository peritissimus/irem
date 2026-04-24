import THREE from '../libs/threejs/Three.js'
import vertexShaderSource from '../shaders/map/vertex.glsl?raw'
import fragmentShaderSource from '../shaders/map/fragment.glsl?raw'

const vertexShader = THREE._evalReplace(vertexShaderSource, { THREE })
const fragmentShader = THREE._evalReplace(fragmentShaderSource, { THREE })

function init() {
  createMaterial()
  createGeometry()
}

function createMaterial() {
  map.uniforms = {
    zoom: { type: 'f', value: 0 },
    visible: { type: 'f', value: 0 },
    dLength: { type: 'f', value: 0 },
    rotation: { type: 'v4', value: new THREE.Vector4() },
    fading: { type: 'f', value: 0 },
    dpi: { type: 'f', value: window.devicePixelRatio || 1 },
  }
  map.material = new THREE.ShaderMaterial({
    uniforms: map.uniforms,
    vertexShader,
    fragmentShader,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: false,
  })
}

function createGeometry() {
  map.geometry = new THREE.OctahedronGeometry(45, 5)
  map.particles = new THREE.ParticleSystem(map.geometry, map.material)
}

export const map = {
  offsetLeft: 72,
  offsetTop: 44,
  init,
}
