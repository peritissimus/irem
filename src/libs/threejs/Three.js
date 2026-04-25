// Side-effect module: configures THREE.ShaderChunk with our custom chunks
// (snoise2d, fog overrides) and exposes a window.THREE alias for legacy code.
// Consumers should import THREE directly: `import * as THREE from 'three'`.
// They can pull `evalShader` from this module when they need the GLSL
// ShaderChunk macro processor.

import { ShaderChunk } from 'three'
import * as THREE from 'three'
import snoise2dShader from '../../shaders/noises/snoise2d.glsl?raw'
import { evalReplace } from '../../utils/stringUtils.js'

ShaderChunk.snoise2d = snoise2dShader
ShaderChunk.fog_pars_fragment = [
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
ShaderChunk.fog_fragment = [
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

export const evalShader = (source, scopeVariables) => evalReplace(source, scopeVariables)

if (typeof window !== 'undefined') {
  window.THREE = THREE
}
