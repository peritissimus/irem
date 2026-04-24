import { config } from '../config.js'
import THREE, { evalShader } from '../libs/threejs/Three.js'
import vertexShaderSource from '../shaders/particleWave/vertex.glsl?raw'
import fragmentShaderSource from '../shaders/particleWave/fragment.glsl?raw'

const vertexShader = evalShader(vertexShaderSource, { THREE })
const fragmentShader = evalShader(fragmentShaderSource, { THREE })

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
    const geometry = (this.geometry = new THREE.BufferGeometry())
    const segmentSize = config.PARTICLE_FIELD_SEGMENT_SIZE
    const gridSize = config.PARTICLE_FIELD_GRID_SIZE
    const spacing = gridSize / segmentSize
    const positions = new Float32Array(segmentSize * segmentSize * 3)
    let i = 0
    for (let x = 0; x < segmentSize; x++) {
      const px = x * spacing
      for (let z = 0; z < segmentSize; z++) {
        positions[i++] = px
        positions[i++] = 0
        positions[i++] = z * spacing
      }
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.particles = new THREE.Points(geometry, this.material)
  }

  move(x, z) {
    this.uniforms.globalPos.value.x = x
    this.uniforms.globalPos.value.z = z
  }
}

export default ParticleField
