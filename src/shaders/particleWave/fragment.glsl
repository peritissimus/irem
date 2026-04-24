varying vec2 colorMapPos;
varying float pAlpha;
varying float alphaIntensity;
varying float vZoom;
// uniform sampler2D tDiffuse;
uniform sampler2D colorMap;
uniform float colorMapScale;

/*EVAL THREE.ShaderChunk['fog_pars_fragment'];*/


float clampNorm(float val, float min, float max) {
    return clamp((val - min) / (max - min), 0.0, 1.0);
}


void main() {

    float colorMapScale = 200.0 * colorMapScale;

    gl_FragColor = texture2D( colorMap, mod(colorMapPos, colorMapScale) / colorMapScale);

    float distanceToCenter = length(gl_PointCoord.xy - .5) * 2.;

    gl_FragColor.a = (step(0., distanceToCenter) - step(.25, distanceToCenter)) * 1.;
    gl_FragColor.a += (step(.25, distanceToCenter) - step(.27, distanceToCenter)) * mix(1., .4, (distanceToCenter - .25) / (.27 - .25));
    gl_FragColor.a += (step(.27, distanceToCenter) - step(.3, distanceToCenter)) * mix(.4, .15, (distanceToCenter - .27) / (.3 - .27));
    gl_FragColor.a += (step(.3, distanceToCenter) - step(1., distanceToCenter)) * mix(.15, 0., (distanceToCenter - .3) / (1. - .3));

    gl_FragColor.a = pow(abs(gl_FragColor.a), alphaIntensity) * pAlpha * ( 1. - clampNorm(vZoom, .75, 1.) * .4);

/*EVAL THREE.ShaderChunk['fog_fragment'];*/
}
