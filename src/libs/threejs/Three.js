// Side-effect module: configures THREE.ShaderChunk with our custom chunks
// (snoise2d, fog overrides) so the EVAL macros in our GLSL files resolve
// correctly. Consumers should import THREE symbols by name.
// `evalShader` is exposed for callers that need the GLSL macro processor.

import { ShaderChunk } from 'three'
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

// EVAL macros in our GLSL only ever read THREE.ShaderChunk (verified via
// grep across src/shaders/). Provide that scope automatically so callers
// don't have to import * as THREE just to pass it through — keeping the
// THREE namespace out of consumer files unlocks tree-shaking.
const macroScope = { THREE: { ShaderChunk } }
export const evalShader = (source) => evalReplace(source, macroScope)
