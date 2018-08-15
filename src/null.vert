attribute vec4 v; // vertex pos
varying vec2 p;   // fragment pos

void main() {
    p=(gl_Position=v).xy;
}
