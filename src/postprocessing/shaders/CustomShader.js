import THREE from '../../libs/threejs/Three.js'
import vertexShaderSource from '../../shaders/custom/vertex.glsl?raw'
import fragmentShaderSource from '../../shaders/custom/fragment.glsl?raw'

THREE.CustomShader = {
  uniforms: {
    tDiffuse: { type: 't', value: null },
    time: { type: 'f', value: 0 },
    alpha: { type: 'f', value: 0.011 },
    gradientOffset: { type: 'f', value: 0 },
    gradientOpacity: { type: 'f', value: 0.1 },
    vRadius: { type: 'f', value: 1 },
    vSoftness: { type: 'f', value: 1 },
    zoom: { type: 'f', value: 0 },
    opacity: { type: 'f', value: 1 },
    vAlpha: { type: 'f', value: 0.36 },
  },
  vertexShader: THREE._evalReplace(vertexShaderSource, { THREE }),
  fragmentShader: THREE._evalReplace(fragmentShaderSource, { THREE }),
}

export default THREE.CustomShader
