import { config } from '../config.js'
import THREE from '../libs/threejs/Three.js'
import vertexShaderSource from '../shaders/particleWave/vertex.glsl?raw'
import fragmentShaderSource from '../shaders/particleWave/fragment.glsl?raw'

const vertexShader = THREE._evalReplace(vertexShaderSource, { THREE })
const fragmentShader = THREE._evalReplace(fragmentShaderSource, { THREE })

export class ParticleField {
  constructor(amount, offsetX, offsetZ) {
    this.amount = amount
    this.offsetX = offsetX
    this.offsetZ = offsetZ
    this._createMaterial()
    this._createGeometry()
  }

  _createMaterial() {
    const texture = new THREE.Texture(config.colorMap)
    texture.needsUpdate = true
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    this.uniforms = {
      fogColor: { type: 'c', value: new THREE.Color(0) },
      fogDensity: { type: 'f', value: 0.025 },
      fogFar: { type: 'f', value: 2000 },
      fogNear: { type: 'f', value: 1 },
      fading: { type: 'f', value: 0 },
      colorMap: { type: 't', value: texture },
      colorMapScale: { type: 'f', value: 1 },
      time: { type: 'f', value: 0 },
      zoom: { type: 'f', value: 0 },
      globalPos: { type: 'v3', value: new THREE.Vector3(0, 0, 0) },
      posOffset: { type: 'v3', value: new THREE.Vector3(this.offsetX, 0, this.offsetZ) },
      posFieldOffset: { type: 'v3', value: new THREE.Vector3(this.offsetX, 0, this.offsetZ) },
      cameraVector: { type: 'v3', value: new THREE.Vector3(0, 0, 0) },
      dpi: { type: 'f', value: window.devicePixelRatio || 1 },
    }
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthTest: false,
      fog: true,
    })
    this.move(0, 0)
  }

  _createGeometry() {
    const geometry = (this.geometry = new THREE.Geometry())
    const vertices = geometry.vertices
    const segmentSize = config.PARTICLE_FIELD_SEGMENT_SIZE
    const gridSize = config.PARTICLE_FIELD_GRID_SIZE
    const spacing = gridSize / segmentSize

    for (let x = 0; x < segmentSize; x++) {
      const px = x * spacing
      for (let z = 0; z < segmentSize; z++) {
        vertices.push(new THREE.Vector3(px, 0, z * spacing))
      }
    }
    this.particles = new THREE.ParticleSystem(geometry, this.material)
  }

  move(x, z) {
    this.uniforms.globalPos.value.x = x
    this.uniforms.globalPos.value.z = z
  }
}

export default ParticleField
