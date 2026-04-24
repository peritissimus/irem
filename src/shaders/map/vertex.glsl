varying float pAlpha;
uniform float dLength;
uniform float visible;
uniform float zoom;
uniform float fading;
uniform vec4 rotation;
uniform float dpi;

float PI = 3.14159265358979323846264;

//
// Description : Array and textureless GLSL 2D simplex noise function.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : ijm
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//

vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x) {
    return mod289(((x*34.0)+1.0)*x);
}

float snoise(vec2 v)
    {
    const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
        0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
        -0.577350269189626,  // -1.0 + 2.0 * C.x
        0.024390243902439); // 1.0 / 41.0
// First corner
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);

// Other corners
    vec2 i1;
    //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
    //i1.y = 1.0 - i1.x;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    // x0 = x0 - 0.0 + 0.0 * C.xx ;
    // x1 = x0 - i1 + 1.0 * C.xx ;
    // x2 = x0 - 1.0 + 2.0 * C.xx ;
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;

// Permutations
    i = mod289(i); // Avoid truncation effects in permutation
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
        + i.x + vec3(0.0, i1.x, 1.0 ));

    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;

// Gradients: 41 points uniformly over a line, mapped onto a diamond.
// The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)

    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;

// Normalise gradients implicitly by scaling m
// Approximation of: m *= inversesqrt( a0*a0 + h*h );
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

// Compute final noise value at P
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

// vec2 rotate(vec3 pos) {
//     float cosRX = cos(rotation.x);
//     float sinRX = sin(rotation.x);
//     float cosRY = cos(rotation.y);
//     float sinRY = sin(rotation.y);
//     float cosRZ = cos(rotation.z);
//     float sinRZ = sin(rotation.z);

//     float x0 = pos.x * cosRY - pos.z * sinRY;
//     float z0 = pos.z * cosRY + pos.x * sinRY;
//     float y0 = pos.y * cosRX - z0 * sinRX;
//     z0 = z0 * cosRX + pos.y * sinRX;

//     float x1 = x0 * cosRZ - y0 * sinRZ;
//     y0 = y0 * cosRZ + x0 * sinRZ;

//     float perspectiveRatio = 1.0 + (z0 / 400.0);

//     return vec2(x1 * perspectiveRatio,  y0 * perspectiveRatio);
// }

 vec3 qtransform( vec4 q, vec3 v ){
    return v + 2.0*cross(cross(v, q.xyz ) + q.w*v, q.xyz);
}

float clampNorm(float val, float min, float max) {
    return clamp((val - min) / (max - min), 0.0, 1.0);
}

void main() {

    vec3 pos = position;

    if(pos.x > -.1 && pos.x < .1 && pos.x > -.1 && pos.x < .01 && pos.z > 44.99) {
        pos.x = 0.0;
        pos.y = 0.0;
        gl_PointSize = 3.0;
        pAlpha = 1.0;
    } else {
        // float alpha = atan(pos.x, pos.y) + snoise(pos.xy + .1) * 5.0;
        // float beta = atan(pos.z, pos.x) + snoise(pos.yz + .1) * 5.0;
        // pos.x = - 45.0 * cos( alpha ) * sin( beta );
        // pos.y = 45.0 * cos( beta );
        // pos.z = 45.0 * sin( alpha ) * sin( beta );
        // pAlpha = .4 + snoise(pos.zx + .4) * .3;

        pAlpha = .2 + .8 * snoise(pos.xy * .3);

        // pos.x += snoise(pos.yz + .1) * 2.0;
        // pos.y += snoise(pos.zx + .2) * 2.0;
        pos *= 1.0 + zoom * (2.0 + snoise(pos.xy * 10.0 + 3.0) * 2.0);
        pos = qtransform( rotation, pos);
        pos.x += snoise(pos.yz + .1) * 2.0 * (abs(pos.z) / 45.0) * (1.0 - zoom);
        pos.y += snoise(pos.zx + .2) * 2.0 * (abs(pos.z) / 45.0) * (1.0 - zoom);

        pos *= 1.0 + dLength * .01 * snoise(pos.xy * 10.0) * (abs(pos.z) / 45.0 + .3);
        gl_PointSize = 1.0 + (abs(pos.z) / 45.0) * .2;
        pAlpha *= .4 + (pos.z / 45.0) * .25 * dLength / 10.0;

        if(pos.z < -3.0) {
            pAlpha = 0.0;
        }

        // at the edge
        if(pos.z > -3.0 && pos.z < 3.0) {
            pAlpha = .2;
        }

        float radius = length(pos.xy);
        if(radius > 45.0) {
            pAlpha *= 1.0 - clampNorm(radius, 45.0, 100.0);
        }
        pAlpha *= mix(1.0, 2.0, zoom);
    }

    pAlpha *= visible * fading;

    // pos.xy = rotate(pos);
    pos.z = 0.0;

    vec4 modelViewPos = modelViewMatrix * vec4( pos, 1.0 );
    float distanceToCamera = sqrt(modelViewPos.x * modelViewPos.x + modelViewPos.y * modelViewPos.y + modelViewPos.z * modelViewPos.z);


    gl_Position = projectionMatrix * modelViewPos;
    // colorRatio = snoise(refPos.xz * 0.0005 + 200.0);
    gl_PointSize *= dpi;
}
