varying float pAlpha;
varying float alphaIntensity;
uniform float time;
uniform vec3 posOffset;
uniform vec3 cameraVector;
uniform float dpi;
uniform float fov;
uniform float fade;
uniform float skip;
uniform float heightPower;
uniform float amount;
uniform float floatTime;
uniform float d;

const float PI = 3.14159265358979323846264;

const float D2R = PI / 180.0;

/*EVAL THREE.ShaderChunk['snoise2d'];*/

float powInOut(float t, float p) {
    return (1.-step(.5, t))*pow(t*2.,p)*.5+step(.5,t)*(1.-pow((1.-t)*2.,p)*.5);
}

float clampNorm(float val, float min, float max) {
    return clamp((val - min) / (max - min), 0.0, 1.0);
}

float cSnoise(vec2 co) {
    return clamp(snoise(co), 0., 1.);
}

void main() {

    float x = position.x + skip;

    float cameraA = atan(cameraVector.z, cameraVector.x);

    float rr = log2(x);
    float r = floor(rr);
    r = pow(r, 1.5) * d + sin(x * .1) * d * 2.;
    // float a = fract(rr) * 60. * D2R - cameraA - (60. / 2. * D2R) - PI / 2.;
    float a = (fract(rr) * D2R - (1. / 2. * D2R)) * fov - cameraA - PI / 2.;
    float centerRatio = 1. - abs(1. - fract(rr) * 2.);

    vec3 refPos = vec3(
        sin(a) * r,
        0.,
        cos(a) * r
    );

    refPos.x += cameraVector.x * 1.5 + posOffset.x;
    refPos.z += cameraVector.z * 1.5 + posOffset.z;
    // refPos.x += posOffset.x;
    // refPos.z += posOffset.z;

    // refPos = floor(refPos / 100.) * 100.;

    // noise ratio that fixed depends on the particle reference refPosition
    float fixedPosNoiseRatio = (snoise(refPos.xz * 0.1) + snoise(refPos.xz * 0.005)) * .5;
    fixedPosNoiseRatio = 1.0 - (cos(fixedPosNoiseRatio * PI) + 1.0) / 2.0 - snoise(refPos.xz * .1) - snoise(refPos.xz * .03);
    fixedPosNoiseRatio -= snoise(refPos.xz * .003 + 2.1) * 1.5 + snoise(refPos.xz * .3 + 1.1)  + snoise(refPos.xz * .001 + 1.1);
    fixedPosNoiseRatio *= .5;

    float offsetY = snoise(refPos.xz * 0.0013 + 4.0) * - 40.00 + snoise(refPos.xz * 0.0006 + 32.0) * - 90.0;

    vec3 pos = vec3(
        (snoise(refPos.xz * 0.3) - .5) * 8.0,
        offsetY + snoise(refPos.xz * 200. + 12.) * 10.0,
        (snoise(refPos.xz * 0.4) - .5) * 8.0
    );

    float t1 = cSnoise(refPos.xz  *213. + 123.) *.2;
    float t2 = 1.0;//clamp(t1 + .6 + cSnoise(refPos.xz  *213. + 123.)  * (.4 - t1), 0., 1.);

    float animation = clampNorm(time, t1, t2);
    float moveAnimation = pow(clampNorm(animation, .1, 1.), 1. + cSnoise(refPos.xz  * 23. + 3.) * 1.2);

    pos.x += refPos.x + sin(moveAnimation * 4. + r) * 5.;
    pos.y += moveAnimation * pow(r, heightPower + sin((a+r) * 30. + cos((a+r) *20. + moveAnimation* a)) *.06) * (.1 + cSnoise(refPos.xz  * 311. + 1.)*r/1000.) * (.2 + cSnoise(refPos.xz  * 3. + 1.) * mix(.2, .8, pow(centerRatio, 15.)));
    pos.z += refPos.z + cos(moveAnimation * 3. + r - 2.1) * 5.;

    pos.x += r * .01 * sin(floatTime * (.5 + cSnoise(refPos.xz  * 82. + 53.) * .5) * .01 + 12.) * moveAnimation;
    pos.y += r * .01 * sin(floatTime * (.5 + cSnoise(refPos.xz  * 73. + 184.) * .5) * .01 + 72.) * moveAnimation;
    pos.z += r * .01 * sin(floatTime * (.5 + cSnoise(refPos.xz  * 92. + 25.) * .5) * .01 + 19.) * moveAnimation;

    vec4 modelViewPos = modelViewMatrix * vec4( pos, 1.0 );
    float distanceToCamera = sqrt(modelViewPos.x * modelViewPos.x + modelViewPos.y * modelViewPos.y + modelViewPos.z * modelViewPos.z);


    // pAlpha = mix(.3, 1., pow(centerRatio, 3.)) * clamp(pow(5., clamp(fixedPosNoiseRatio, 0., 1.)), 0., 1.) * (smoothstep(0.05, .1, animation) - smoothstep(.85, .95 + cSnoise(refPos.xz  * 52. + 1.) * .05, animation)) * fade;
    pAlpha = mix(.3, 1., pow(centerRatio, 3.)) * clamp(pow(5., clamp(fixedPosNoiseRatio, 0., 1.)), 0., 1.) * smoothstep(.0, .1, animation) * fade;

    pAlpha *= 1. - step(amount, position.x);

    modelViewPos = modelViewMatrix * vec4( pos, 1.0 );
    gl_Position = projectionMatrix * modelViewPos;

    gl_PointSize = gl_PointSize = 4000.0 / distanceToCamera * mix(1., 3., moveAnimation) * mix(0.4, 1.0, fixedPosNoiseRatio);


    alphaIntensity = mix(1., 2., animation + sin(floatTime * (.5 + cSnoise(refPos.xz  * 132. + 25.) * .5) * .01 + 13.) * .6);
    // alphaIntensity = mix(1., 2., animation);
}
