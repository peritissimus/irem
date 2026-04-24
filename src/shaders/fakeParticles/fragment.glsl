varying float pAlpha;
varying float alphaIntensity;

/*EVAL THREE.ShaderChunk['fog_pars_fragment'];*/

float clampNorm(float val, float min, float max) {
    return clamp((val - min) / (max - min), 0.0, 1.0);
}


void main() {

    float distanceToCenter = length(gl_PointCoord.xy - .5) * 2.;

    float alpha = (step(0., distanceToCenter) - step(.25, distanceToCenter)) * mix(1., .4, distanceToCenter / .25);
    alpha += (step(.25, distanceToCenter) - step(.3, distanceToCenter)) * mix(.4, .15, (distanceToCenter - .25) / (.3 - .25));
    alpha += (step(.3, distanceToCenter) - step(1., distanceToCenter)) * mix(.15, 0., (distanceToCenter - .3) / (1. - .3));
    alpha = pow(abs(alpha), alphaIntensity) * pAlpha;

    gl_FragColor = vec4(mix(vec3(255., 255., 255.), vec3(252., 132., 3.), distanceToCenter) / 255., alpha);

/*EVAL THREE.ShaderChunk['fog_fragment'];*/
}
