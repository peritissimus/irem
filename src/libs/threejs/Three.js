import THREE from 'three'
import snoise2dShader from '../../shaders/noises/snoise2d.glsl?raw'
import { evalReplace } from '../../utils/stringUtils.js'

THREE.ShaderChunk = THREE.ShaderChunk || {}
THREE.ShaderChunk.snoise2d = snoise2dShader
THREE.ShaderChunk.fog_pars_fragment = [
  '#ifdef USE_FOG',
  'uniform vec3 fogColor;',
  '#ifdef FOG_EXP2',
  'uniform float fogDensity;',
  '#else',
  'uniform float fogNear;',
  'uniform float fogFar;',
  '#endif',
  '#endif',
].join('\n')
THREE.ShaderChunk.fog_fragment = [
  '#ifdef USE_FOG',
  'float depth = gl_FragCoord.z / gl_FragCoord.w;',
  '#ifdef FOG_EXP2',
  'const float LOG2 = 1.442695;',
  'float fogFactor = exp2( - fogDensity * fogDensity * depth * depth * LOG2 );',
  'fogFactor = 1.0 - clamp( fogFactor, 0.0, 1.0 );',
  '#else',
  'float fogFactor = smoothstep( fogNear, fogFar, depth );',
  '#endif',
  'gl_FragColor = mix( gl_FragColor, vec4( fogColor, gl_FragColor.w ), fogFactor );',
  '#endif',
].join('\n')
THREE._evalReplace = (source, scopeVariables) => evalReplace(source, scopeVariables)

if (typeof window !== 'undefined') {
  window.THREE = THREE
}

export default THREE
