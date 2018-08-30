#version 300 es
in vec4 v; // vertex pos
out vec2 p;   // fragment pos

void main() {
    p=(gl_Position=v).xy;
}
