//[
precision mediump float;
//]

varying vec2 p; // input pos

float sdf(vec3 pos) {
    return length(pos)-1.0;
}


void main() {
    const float EPSILON = .01;

    vec3 ray_dir = normalize(vec3(p.x,p.y*.56,1));
    vec3 pos = vec3(0,0,-10);

    for (int i=0;i<32;i++) {
        float d = sdf(pos);
        if (d<EPSILON) {
            gl_FragColor = vec4(1,0,0,1);
            return;
        }
        pos += ray_dir*d;
    }
    gl_FragColor = vec4(0,0,0,1);
}
