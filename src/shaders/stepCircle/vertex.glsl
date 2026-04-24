varying float pAlpha;
uniform float time;
uniform float extraTime;
uniform vec4 stepTimes;
uniform vec4 stepExtraTimes;
uniform float animationRatio;
uniform float focusRatio;
uniform float amountPerDegree;
uniform float opacity;
uniform float fading;
uniform float dpi;

float PI = 3.14159265358979323846264;

/*EVAL THREE.ShaderChunk['snoise2d'];*/

float clampNorm(float val, float min, float max) {
    return clamp((val - min) / (max - min), 0.0, 1.0);
}

float easeOutBack(float t) {
    return ((t=t-1.)*t*((2.70158)*t + 1.70158) + 1.);
}

void main() {

    vec3 pos = position;
    float baseAngle = atan(pos.y, pos.x);
    float baseRadius = sqrt(pos.x * pos.x + pos.y * pos.y) - 1.0;

    // 9 groups
    float group = mod(floor(baseRadius * amountPerDegree), 9.0);

    float angle = baseAngle;
    float radius = baseRadius * 30.0 + 155.0;
    float angleFinalOffset = (time + extraTime) * .1;
    float tmpRatio;
    float tmp;
    pAlpha = 1.0;

    // tmpRatio = clampNorm(animationRatio, 0., 1.);

    tmpRatio = 1.;//easeOutBack(clamp(1. - abs(animationRatio - 2.), 0., 1.));
    float stepTime = time;// stepTimes.x + stepExtraTimes.x;

    if(group > 2.) {
        if(angle > PI / 2.0) {
            tmp = PI;
        } else if(angle < -PI / 2.0) {
            tmp = -PI;
        } else {
            tmp = 0.;
        }
        angle = mix(angle, mix(angle, tmp, .85), (tmpRatio + snoise(position.xy * 30. + time * (.1 + group * .03))) * tmpRatio / 2.);
        radius += ((snoise(position.xy * 15.) * 2. - 1.) * (sin(radius * group * 3.0) + 1.) * 10. + 18.)* tmpRatio;
        angleFinalOffset += (mod(group, 3.) * .01 * mod(group, 2.) ) * (tmpRatio  + stepTime);
    } else {
        angleFinalOffset += (group * .02) * (tmpRatio  + stepTime);
        // angle += time * tmpRatio * .2;
        radius += (30. + snoise(position.xy * 400.) * 20. * group  + (baseRadius - .5) * (50. + group * 20. + abs(cos(baseAngle)) * snoise(position.xy * 200.) *30.)) * tmpRatio;
    }

    tmpRatio = clampNorm(animationRatio, 2., 3.);
    radius = mix(radius, 150. + baseRadius * (255. + group * 10.), easeOutBack(pow(tmpRatio, 1. + group * .2 + snoise(position.xy * 312.))));
    radius += clampNorm(baseRadius, .75, 1.) * 100. * snoise(position.xy * 230. + 15.) * tmpRatio;

    tmpRatio = clampNorm(animationRatio, 3., 4.);
    radius *= 1.0 + tmpRatio * abs(snoise(position.xy * 35. + 41.));

    // focus
    angle -= focusRatio * PI * (.1 + group * .03);
    radius = mix(radius, 160., (easeOutBack(focusRatio) * .8 + snoise(position.xy * 200.0) * .3) * pow(abs(easeOutBack(focusRatio)), 1.0 + group));

    pos.x = sin(angle) * radius;
    pos.y = cos(angle) * radius;


    tmpRatio = 1.;//clampNorm(animationRatio, 1., 2.);
    pos.x += (snoise(position.xy *90. + time * .3) * 10.) * (tmpRatio - (focusRatio));
    pos.y += (snoise(position.xy *90. + time * .3 + 2.)  * 10.) * (tmpRatio - (focusRatio));
    angleFinalOffset += .1 * (tmpRatio  + stepTime);

    pos.x += snoise(position.xy * 100.0) * 3.0;
    pos.y += snoise(position.xy * 100.0 + 3.0) * 3.0;

    tmpRatio = clampNorm(animationRatio, 3., 4.);
    pos.x += tmpRatio * (abs(snoise(position.xy * 26. + 31.)) - .5) * 20.;
    pos.y += tmpRatio * (abs(snoise(position.xy * 41. + 26.)) - .5) * 20.;

    angle = atan(pos.y, pos.x) + angleFinalOffset;
    radius = sqrt(pos.x * pos.x + pos.y * pos.y);

    pos.x = sin(angle) * radius;
    pos.y = cos(angle) * radius;

    tmpRatio = 1.;//clampNorm(animationRatio, 1., 2.);
    if(group > 1.) {
        pAlpha = tmpRatio;
    }
    tmpRatio = 1.;//clamp(1. - abs(animationRatio - 2.), 0., 1.);
    if(mod(group, 3.) > 0.) {
        pAlpha -= sin((radius + snoise(position.xy * 12.) * 10.0) * mix(.2, .25, tmpRatio)) / pow(1.0 + baseRadius, 3.0) * tmpRatio;
    }

    tmpRatio = clampNorm(animationRatio, 2., 3.);
    pAlpha *= 1. - tmpRatio * .4;

    tmpRatio = clampNorm(animationRatio, 3.75, 4.);
    pAlpha *= 1. - tmpRatio;

    tmpRatio = clampNorm(animationRatio, 0., 1.);
    angle = mod(angle + PI * 2., PI * 2.);
    float maskCenterAngle = mod(time * 2. + PI, PI * 2.);
    float deltaAngle = mod(angle - maskCenterAngle + PI * 2., PI * 2.);
    float maskStart = tmpRatio * PI / 2.;
    float maskEnd = PI / 3. + tmpRatio * PI;
    float alpha = 1. - clampNorm( step(0., deltaAngle) * deltaAngle + (1. - step(0., deltaAngle)) * (deltaAngle + PI * 2.), maskStart, maskEnd);

    maskStart = PI * 2. - tmpRatio * PI / 2.;
    maskEnd = PI * 2. - PI / 3. - tmpRatio * PI;
    alpha += 1. - clampNorm( step(0., deltaAngle) * deltaAngle + (1. - step(0., deltaAngle)) * (deltaAngle + PI * 2.), maskStart, maskEnd);

    pAlpha *= pow(clamp(alpha, 0., 1.), 1. + group * .2);

    // pAlpha *= mix((step(0., deltaAngle) * deltaAngle + (1. - step(0., deltaAngle)) * (deltaAngle + PI * 2.)) / maskLen * PI;
    // if(deltaAngle > PI) {
    //     pAlpha *= 1.;
    // } else {
    //     pAlpha *= 0.;
    // }

    // float alpha = (cos(baseAngle + time * 2.0 + PI * .75) + 1.0) / 2.0 * tmpRatio;
    // pAlpha += pow(abs(alpha), 3.0) * .75;

    //crop center
    tmpRatio = step(.2, animationRatio) * clamp(1. - abs(animationRatio + 2. - 2.), 0., 1.);
    if(tmpRatio > .0 && radius < tmpRatio * 155.) {
        pAlpha = .0;
    }


    pAlpha = clamp(pAlpha, .0, 1.0) * .2 * opacity * fading;


    vec4 modelViewPos = modelViewMatrix * vec4( pos, 1.0 );
    float distanceToCamera = sqrt(modelViewPos.x * modelViewPos.x + modelViewPos.y * modelViewPos.y + modelViewPos.z * modelViewPos.z);


    gl_Position = projectionMatrix * modelViewMatrix * vec4( pos, 1.0 );
    gl_PointSize = 1. * dpi;
    // colorRatio = snoise(refPos.xz * 0.0005 + 200.0);

}
