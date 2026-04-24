precision mediump float;
uniform float time;
uniform float fade;
uniform sampler2D texture;
varying float vAnimation;

varying vec2 vUv;

/*EVAL THREE.ShaderChunk['snoise2d'];*/

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

const float PI = 3.14159265358979323846264;

float clampNorm(float val, float min, float max) {
    return clamp((val - min) / (max - min), 0.0, 1.0);
}

float lightField(float angle, float angleScale, float t1, float t2, float patchSize) {
    return mix(
        clamp(snoise(vec2(angle * angleScale + t1, t2)), 0., 1.),
        clamp(snoise(vec2(-angle * angleScale + t1, t2)), 0., 1.),
        clampNorm(angle, PI - patchSize, PI)
    );
}

vec3 getSepiaColor(vec3 rgb){
    return vec3(dot(rgb, vec3(0.299, 0.587, 0.114))) * vec3(1.2, 1.0, 0.8);
}

float middleStep(float x, float y, float a) {
    return step(x, a) * (1. - step(y, a));
}

float middleFadeInOut(float x, float y, float a) {
    return middleStep(x, y, a) * (1. - abs(clampNorm(a, x, y) -.5) * 2.);
}

void main() {

    float d = length(vUv - .5) * 2.;
    float ratio;
    vec4 color;
    float r;

    float scale = 1. / (1. + clampNorm(vAnimation, 1.0, 3.0) * 8. * (1. + middleFadeInOut(4.0, 5., vAnimation) * 2.));

    float thersh = 280. / 512. * scale;

    float fadeRatio = 1. - ((1. - step(1., vAnimation)) * vAnimation + middleStep(1., 1.5, vAnimation) * (1.0 - clampNorm(vAnimation, 1., 1.5))) * .9;
    float noiseRatio = clampNorm(vAnimation, 0.0, 0.5) * fadeRatio;
    float sepiaRatio = clampNorm(vAnimation, 0.0, 0.5);
    float lightRatio = middleFadeInOut(1.5, 2.5, vAnimation) + middleFadeInOut(4.0, 4.5, vAnimation);
    float outerGlow = max(lightRatio, clampNorm(vAnimation, 1.0, 2.0) * .2);
    float brightnessRatio = clampNorm(vAnimation, 1.0, 2.5);
    float opacity = 1. - clampNorm(vAnimation, 4.5, 5.0);
    float orangeRatio = clampNorm(vAnimation, 3.0, 4.0);


    if(d > thersh) {
        float alpha = 1.0;
        float angle = atan(vUv.y - .5, vUv.x - .5);

        ratio = .1 + clampNorm(d, thersh, 1.);
        alpha *= pow(1. - ratio, 5.); //intensity
        alpha -= (1. - alpha) * rand(vUv) * .2;

        color = vec4(mix(vec3(1., .65, .75), vec3(1., 1., 1.), clamp(alpha, 0., 1.)), alpha * outerGlow );
    } else {
        ratio = clampNorm(d, 0., thersh);
        color = texture2D(texture, (vUv - .5) / scale + .5);

        color.rgb = mix(color.rgb, getSepiaColor(color.rgb), sepiaRatio *.7);

        color.rgb = mix(vec3(0., 0., 0.), color.rgb, fadeRatio);

        r = rand(vUv.xy + rand(vUv.yx + time));
        color.rgb = mix(clamp(color.rgb, 0., 1.), vec3(r, r, r), noiseRatio * .1);

        // inner glow
        color.rgb += clampNorm(ratio, .8, 1.) * lightRatio;
    }

    color.rgb = mix(color.rgb, getSepiaColor(color.rgb), sepiaRatio * .3);

    r = rand(vUv.xy + rand(vUv.yx + time));
    color.rgb = mix(clamp(color.rgb, 0., 1.), vec3(r, r, r), noiseRatio * .05);


    color.rgb += brightnessRatio;

    color.rgb = mix(color.rgb, vec3(.894, .416, .314), orangeRatio);

    color.a = clamp(color.a, 0., 1.) * (opacity * step(1., vAnimation) + (1. - step(1., vAnimation))) * fade;

    gl_FragColor = color;

}
