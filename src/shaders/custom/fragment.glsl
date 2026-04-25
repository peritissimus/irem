precision mediump float;
uniform sampler2D tDiffuse;
uniform float time;
uniform float alpha;
uniform float gradientOffset;
uniform float gradientOpacity;
uniform float vRadius;
uniform float vSoftness;
uniform float vAlpha;
uniform float zoom;
uniform float opacity;


const float PI = 3.14159265358979323846264;


varying vec2 vUv;
float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}
void main() {
    vec4 color = texture2D(tDiffuse, vUv);

    color.rgb = mix(color.rgb, vec3(.043, .043, .043), 1.0 - opacity);

    // Luminance-weighted additive grain. Same scalar added to R/G/B
    // (so no hue shift), but scaled by perceived brightness so dark
    // pixels don't get dominated by noise (which the RGBShift pass
    // would then fringe into colour artefacts on the glow halos).
    // Floor of 0.15 keeps a faint base grain in shadows; the rest
    // ramps with luminance so brights get a richer film texture.
    float r = rand(gl_FragCoord.xy + rand(gl_FragCoord.yx + time));
    float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    color.rgb += (r - 0.5) * alpha * (0.15 + 0.85 * lum);

    // radial gradient
    // float distanceToGradientCenter = clamp(length((vUv - vec2(.5, .5 + zoom + .5)) * 2.0), 0., 1.);
    // color.rgb = mix(color.rgb, mix(color.rgb, vec3(.909, .945,.95), .1), 1. - smoothstep(0., 1., distanceToGradientCenter));

    // linear gradient
    float linearGradientRatio = clamp((1. - vUv.y * (.85 + sin((vUv.x * 1.0 * PI + gradientOffset )) * .05) + pow(zoom, 1.3)) * 2., 0., 1.);
    color.rgb = mix(color.rgb, mix(color.rgb, vec3(.909, .945,.95), gradientOpacity), 1. - smoothstep(0., 1., linearGradientRatio));

    vec2 posToCenter = (vUv - vec2(.5, .5)) * 2.0;
    float len = length(posToCenter);
    float vignette = smoothstep(vRadius, vRadius-vSoftness, len);
    color.rgb = mix(color.rgb, color.rgb * vignette, vAlpha);
    gl_FragColor = color;
}
