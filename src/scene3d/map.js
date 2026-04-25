import * as THREE from 'three'
import { evalShader } from '../libs/threejs/Three.js'
import vertexShaderSource from '../shaders/map/vertex.glsl?raw'
import fragmentShaderSource from '../shaders/map/fragment.glsl?raw'

const vertexShader = evalShader(vertexShaderSource, { THREE })
const fragmentShader = evalShader(fragmentShaderSource, { THREE })

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
  // detail 12 ≈ 4,056 verts in modern three's deduped BufferGeometry —
  // matches the ~4,098 particle count r71 produced at detail 5 (it did
  // not share vertices across faces, so the same param meant a denser
  // point cloud).
  map.geometry = new THREE.OctahedronGeometry(45, 12)
  map.particles = new THREE.Points(map.geometry, map.material)
}

export const map = {
  offsetLeft: 72,
  offsetTop: 44,
  init,
}
