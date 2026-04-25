import * as THREE from 'three'
import { evalShader } from '../../libs/threejs/Three.js'
import vertexShaderSource from '../../shaders/custom/vertex.glsl?raw'
import fragmentShaderSource from '../../shaders/custom/fragment.glsl?raw'

export const CustomShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    alpha: { value: 0.011 },
    gradientOffset: { value: 0 },
    gradientOpacity: { value: 0.1 },
    vRadius: { value: 1 },
    vSoftness: { value: 1 },
    zoom: { value: 0 },
    opacity: { value: 1 },
    vAlpha: { value: 0.36 },
  },
  vertexShader: evalShader(vertexShaderSource, { THREE }),
  fragmentShader: evalShader(fragmentShaderSource, { THREE }),
}

export default CustomShader
