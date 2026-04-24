varying vec2 vUv;
varying float u_pop;
uniform float pop;
uniform float popScale;
uniform float showScale;

void main() {
    vUv = uv;
    vec4 pos = vec4( position, 1.0 );
    pos.xyz *= clamp(pow(showScale, 10.), .08, 1.);
    pos.xyz *= mix(1., popScale, pop);
    vec4 modelViewPos = modelViewMatrix * pos;
    gl_Position = projectionMatrix * modelViewPos;

    u_pop = pop;
}
