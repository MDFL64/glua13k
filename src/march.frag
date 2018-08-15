//[
precision mediump float;
//]

varying vec2 p; // input pos

void main() {
    gl_FragColor = vec4(p.x,p.y,0,1);
}
