precision mediump float;

uniform sampler2D tex;
uniform float u_time;
uniform float fade;
uniform float alpha;
varying float u_pop;

varying vec2 vUv;

/*EVAL THREE.ShaderChunk['fog_pars_fragment'];*/

const float PI = 3.14159265358979323846264;

float clampNorm(float val, float min, float max) {
    return clamp((val - min) / (max - min), 0.0, 1.0);
}

vec2 getDisplacement(vec2 uv, float time) {

    time *= 5.0; // speed

    float a = sin(time + uv.x * 10.0);
    float b = cos(time + uv.y * 10.0);

    return vec2( a + cos(b), b + sin(a) ) * 0.005; // size
}

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

void main() {

    vec2 posToCenter = (vUv - vec2(.5, .5)) * 2.0;

    float innerThreshold = .1;
    float threshold = .8;
    float direction = 45.0 / 180.0 * PI;
    float monoNoise = rand(vUv * 10.0 + u_time * .0001);


    float angle = atan(posToCenter.y, posToCenter.x);
    float distanceToCenter = length(posToCenter);

    float angleRatio1 = (cos((angle + direction) * 2.0) + 1.0) / 2.0;
    float angleRatio2 = (cos(angle + direction) + 1.0) / 2.0;
    float angleRatio = (angleRatio1 + angleRatio2) / 2.0;

    float fadeOpacity = 1. - smoothstep(threshold, 1., distanceToCenter);
    float opacity = (1. - step(threshold, distanceToCenter)) + mix(1., monoNoise, 1. - fadeOpacity) * fadeOpacity;

    vec3 bgColor = mix(vec3(255., 255., 255.), vec3(252., 222., 184.), distanceToCenter) / 255.;

    vec2 uv = vUv;

    vec4 imageColor= texture2D(tex, uv);


    vec4 color = vec4(mix(bgColor, imageColor.rgb, u_pop), 1.);

    color.a = opacity * alpha * fade;
    color.r *= .9 + monoNoise * .2;
    color.g *= .9 + monoNoise * .2;
    color.b *= .9 + monoNoise * .2;

    gl_FragColor = color;

/*EVAL THREE.ShaderChunk['fog_fragment'];*/

}
