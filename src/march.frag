#version 300 es
//[
precision mediump float;
//]

uniform vec3 a; // view angle (x=yaw,y=pitch,z=aspect)
uniform vec3 l; // view location

in vec2 p; // input pos
out vec4 c; // out coor

// SDF result
struct sr {
    float d;
    int m;
};

sr sd_sphere(vec3 pos, float r, int mat) {
    return sr(length(pos)-r,mat);
}

sr sd_box(vec3 pos, vec3 bounds, int mat) {
    vec3 d = abs(pos) - bounds;
    return sr(min(max(d.x,max(d.y,d.z)),0.0) + length(max(d,0.0)),mat);
    //return sr(length(max(abs(pos)-bounds,0.0)),mat);
}

sr sd_join(sr a, sr b) {
    if (a.d<b.d)
        return a;
    return b;
}

sr sd_cut(sr a, sr b) {
    if (a.d<-b.d)
        return sr(-b.d,b.m);
    return a;
}

sr sd_ground(vec3 pos, int mat) {
    return sr(pos.y + 1.0,mat);
}

vec3 sd_repeat(vec3 pos, vec3 rep) {
    return vec3(mod(pos.x,rep.x),pos.y,mod(pos.z,rep.z)) - .5*rep;
}

sr sdf(vec3 pos) {

    vec3 rep_pos = sd_repeat(pos-vec3(0,20,0),vec3(100,0,100));

    return 
    sd_join(
        sd_box(rep_pos,vec3(30,200,30),2),
        sd_ground(pos,1)
    );
}

vec3 sample_material(int mat_id, vec3 pos) {
    if (mat_id==1)
        // PAVEMENT
        return vec3(.2, .2, .2);
    else if (mat_id==2) {
        // BUILDING SIDES
        vec3 x = mod(pos,vec3(2,2,2));
        if (abs(x.x-1.0)<.05 || abs(x.y-1.0)<.05 || abs(x.z-1.0)<.05)
            return vec3(.2,.2,.2);
        return vec3(.1,.1,.1);
    } else
        return vec3(1,0,1);
}

const int i_ITERS = 1024;
const float i_EPSILON = .001;

vec3 sdf_normal(vec3 pos) {
    return normalize(vec3(
        sdf(pos+vec3(i_EPSILON,0,0)).d - sdf(pos+vec3(-i_EPSILON,0,0)).d,
        sdf(pos+vec3(0,i_EPSILON,0)).d - sdf(pos+vec3(0,-i_EPSILON,0)).d,
        sdf(pos+vec3(0,0,i_EPSILON)).d - sdf(pos+vec3(0,0,-i_EPSILON)).d
    ));
}

void main() {

    // NOTE: my linal skills are absolute trash
    vec3 ray_dir = normalize(vec3(p.x,p.y*a.z,1))*
    mat3(
        1,0,0,
        0,cos(a.y),-sin(a.y),
        0,sin(a.y),cos(a.y)
    )*
    mat3(
        cos(a.x),0,sin(a.x),
        0,1,0,
        -sin(a.x),0,cos(a.x)
    );

    vec3 pos = l; // cam start pos

    for (int i=0;i<i_ITERS;i++) {
        sr res = sdf(pos);
        if (res.d<i_EPSILON) {
            vec3 surface_normal = sdf_normal(pos);
            vec3 surface_color = sample_material(res.m,pos);
            
            vec3 light_normal = normalize(vec3(1,3,2));

            float light = dot(surface_normal,light_normal)*.5+.5;

            c = vec4(light*surface_color,1);
            return;
        }
        pos += ray_dir*res.d;
    }
    c = vec4(.2,.2,.2,1);
}
