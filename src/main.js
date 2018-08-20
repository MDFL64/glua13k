// CONSTANTS
var DEBUG=true;

var GL_TRIANGLE_STRIP   = 0x5;
var GL_BYTE             = 0x1400;
var GL_FLOAT            = 0x1406;
var GL_ARRAY_BUFFER     = 0x8892;
var GL_STATIC_DRAW      = 0x88E4;
var GL_FRAGMENT_SHADER  = 0x8B30;
var GL_VERTEX_SHADER    = 0x8B31;

// Player info
var ply_pos = [0,0,-8];
var ply_ang = [0,0,0];

// Document fixing
//document.title="Satoshi's Tomb";
var body = document.body;
//body.innerHTML="<canvas>";
//body.setAttribute("style","overflow:hidden;margin:0;");

// Get canvas, webgl context
var canvas = body.querySelector("canvas");
var gl = canvas.getContext("webgl");

// Resize
body.onresize = ()=>{
    var w=body.clientWidth;
    var h=body.clientHeight;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0,0,w,h);
    ply_ang[2] = h/w;
}
body.onresize();

// Keyboard input.
var keys = {};
body.onkeydown = (event)=>keys[event.key]=true;
body.onkeyup = (event)=>keys[event.key]=false;

// Mouse input
body.onmousedown = ()=>{
    body.requestPointerLock();
}

body.onmousemove = (event)=>{
    if (document.pointerLockElement==body) {
        ply_ang[0]+=event.movementX/500;
        ply_ang[1]=Math.min(Math.max(-1.5,ply_ang[1]+event.movementY/500),1.5);
    }
}

// Shaders
var makeShader = (type,src)=>{
    var shader=gl.createShader(type);
    gl.shaderSource(shader,src);
    gl.compileShader(shader);
    // Debug
    if (DEBUG)
        console.log("LOG",gl.getShaderInfoLog(shader));
    return shader;
}

var program = gl.createProgram();
gl.attachShader(program,makeShader(GL_VERTEX_SHADER,INLINE("null.vert")));
gl.attachShader(program,makeShader(GL_FRAGMENT_SHADER,INLINE("march.frag")));
gl.linkProgram(program);
gl.useProgram(program);

// Screen Quad
gl.bindBuffer(GL_ARRAY_BUFFER,gl.createBuffer());
gl.bufferData(GL_ARRAY_BUFFER,new Int8Array([-1,1,1,1,-1,-1,1,-1]),GL_STATIC_DRAW);
gl.vertexAttribPointer(gl.getAttribLocation(program,"v"),2,GL_BYTE,false,0,0);
gl.enableVertexAttribArray(gl.getAttribLocation(program,"v"));

var last_time=0;
// Draw
var doFrame = (time)=>{
    time/=1000;
    var delta=time-last_time;
    last_time = time;

    // movement
    var mx=0;
    var my=0;
    if (keys["d"])
        mx+=1;
    if (keys["a"])
        mx-=1;
    if (keys["w"])
        my+=1;
    if (keys["s"])
        my-=1;
    
    ply_pos[0]+=(mx*Math.cos(ply_ang[0]) + my*Math.sin(ply_ang[0])) * delta*10;
    ply_pos[2]-=(mx*Math.sin(ply_ang[0]) - my*Math.cos(ply_ang[0])) * delta*10;

    gl.uniform3fv(gl.getUniformLocation(program,"l"),ply_pos);
    gl.uniform3fv(gl.getUniformLocation(program,"a"),ply_ang); // .56

    gl.drawArrays(GL_TRIANGLE_STRIP,0,4);
    requestAnimationFrame(doFrame);
};
doFrame(0);