import THREE from '../../libs/threejs/Three.js'

THREE.HorizontalTiltShiftShader = {
  uniforms: {
    tDiffuse: { type: 't', value: null },
    h: { type: 'f', value: 1 / 512 },
    r: { type: 'f', value: 0.35 },
    blendRatio: { type: 'f', value: 1 },
  },
  vertexShader: [
    'varying vec2 vUv;',
    'void main() {',
    'vUv = uv;',
    'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
    '}',
  ].join('\n'),
  fragmentShader: [
    'uniform sampler2D tDiffuse;',
    'uniform float h;',
    'uniform float r;',
    'uniform float blendRatio;',
    'varying vec2 vUv;',
    'void main() {',
    'vec4 sum = vec4( 0.0 );',
    'float hh = h * abs( r - vUv.y );',
    'vec4 center = texture2D( tDiffuse, vec2( vUv.x, vUv.y ) );',
    'sum += texture2D( tDiffuse, vec2( vUv.x - 4.0 * hh, vUv.y ) ) * 0.051;',
    'sum += texture2D( tDiffuse, vec2( vUv.x - 3.0 * hh, vUv.y ) ) * 0.0918;',
    'sum += texture2D( tDiffuse, vec2( vUv.x - 2.0 * hh, vUv.y ) ) * 0.12245;',
    'sum += texture2D( tDiffuse, vec2( vUv.x - 1.0 * hh, vUv.y ) ) * 0.1531;',
    'sum += center * 0.1633;',
    'sum += texture2D( tDiffuse, vec2( vUv.x + 1.0 * hh, vUv.y ) ) * 0.1531;',
    'sum += texture2D( tDiffuse, vec2( vUv.x + 2.0 * hh, vUv.y ) ) * 0.12245;',
    'sum += texture2D( tDiffuse, vec2( vUv.x + 3.0 * hh, vUv.y ) ) * 0.0918;',
    'sum += texture2D( tDiffuse, vec2( vUv.x + 4.0 * hh, vUv.y ) ) * 0.051;',
    'gl_FragColor = sum;',
    '}',
  ].join('\n'),
}

export default THREE.HorizontalTiltShiftShader
