varying float pAlpha;
varying vec2 colorMapPos;
varying float alphaIntensity;
varying float vZoom;
uniform float fading;
uniform float time;
uniform float zoom;
uniform vec3 globalPos;
uniform vec3 posOffset;
uniform vec3 posFieldOffset;
uniform vec3 cameraVector;
uniform float dpi;

const float PI = 3.14159265358979323846264;

/*EVAL THREE.ShaderChunk['snoise2d'];*/

void main() {

    vec3 refPos = position + posFieldOffset;
    colorMapPos = refPos.xz;

    // noise ratio that fixed depends on the particle reference position
    float fixedPosNoiseRatio = (snoise(refPos.xz * 0.1) + snoise(refPos.xz * 0.005)) * .5;
    fixedPosNoiseRatio = 1.0 - (cos(fixedPosNoiseRatio * PI) + 1.0) / 2.0 - snoise(refPos.xz * .1) - snoise(refPos.xz * .03);

    fixedPosNoiseRatio -= snoise(refPos.xz * .003 + 2.1) * 1.5 + snoise(refPos.xz * .3 + 1.1)  + snoise(refPos.xz * .001 + 1.1);

    fixedPosNoiseRatio *= .5;

    vec3 pos = position + posOffset;

    vec4 modelViewPos = modelViewMatrix * vec4( pos + cameraVector, 1.0 );
    float distanceToCamera = sqrt(modelViewPos.x * modelViewPos.x + modelViewPos.z * modelViewPos.z);

    float offsetY = snoise(refPos.xz * 0.0013 + 4.0) * - 40.00 + snoise(refPos.xz * 0.0006 + 32.0) * - 90.0;

    pos.x += (snoise(refPos.xz * 0.3) - .5) * 8.0;
    pos.y += offsetY + snoise(refPos.xz * 200. + 12.) * 10.0 + (1. - step(0., fixedPosNoiseRatio)) * 99999. ;
    pos.z += (snoise(refPos.xz * 0.4) - .5) * 8.0;

    modelViewPos = modelViewMatrix * vec4( pos, 1.0 );

    distanceToCamera = sqrt(modelViewPos.x * modelViewPos.x + modelViewPos.y * modelViewPos.y + modelViewPos.z * modelViewPos.z);

    float blinkRatio = step(.1, snoise(refPos.xz)) * snoise(refPos.xz * 1.0 + 30.0 + time * 0.05);

    pAlpha = clamp(mix(0.5, .6 + .4 * blinkRatio, fixedPosNoiseRatio) * fading * pow(5., clamp(fixedPosNoiseRatio, 0., 1.)), 0., 1.);

    alphaIntensity = 1.0 + abs(snoise(refPos.xz * 400.0) * .8) * (.3 + blinkRatio * .7);

    gl_PointSize = mix(500.0, 5000.0, pow(zoom, 2.1))  / distanceToCamera * 6.0 * mix(0.4, 1.0, fixedPosNoiseRatio) * dpi * (.8 + blinkRatio * .3);

    vZoom = zoom;

    gl_Position = projectionMatrix * modelViewPos;
}
