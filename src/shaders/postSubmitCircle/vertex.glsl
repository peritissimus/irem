
uniform float animation;
varying vec2 vUv;
varying float vAnimation;

float clampNorm(float val, float min, float max) {
    return clamp((val - min) / (max - min), 0.0, 1.0);
}

float middleStep(float x, float y, float a) {
    return step(x, a) * (1. - step(y, a));
}

float middleFadeInOut(float x, float y, float a) {
    return middleStep(x, y, a) * (1. - abs(clampNorm(a, x, y) -.5) * 2.);
}

// const float SCALE_RATIO = 40.;
const float SCALE_RATIO = 8.;

void main() {
    vUv = uv;
    vAnimation = animation;
    vec4 finalPosition;

    float animationRatio = clampNorm(animation, 1.5, 4.);

    animationRatio = clampNorm(animation, 1.5, 4.);
    float scale = mix(1., SCALE_RATIO, pow(animationRatio, 1.6));

    scale /= (1. + middleFadeInOut(4.0, 5., animation) * 2.);

    finalPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0,  scale);
    finalPosition.xy += position.xy;

    gl_Position = projectionMatrix * finalPosition;
}
