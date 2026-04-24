varying float pAlpha;

void main() {


    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);

    gl_FragColor.a *= pAlpha;


}
