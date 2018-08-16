/** @define {boolean} */
var DEBUG=true;

// CONSTANTS
var GL_TRIANGLE_STRIP   = 0x5;
var GL_FLOAT            = 0x1406;
var GL_ARRAY_BUFFER     = 0x8892;
var GL_STATIC_DRAW      = 0x88E4;
var GL_FRAGMENT_SHADER  = 0x8B30;
var GL_VERTEX_SHADER    = 0x8B31;

var canvas = document.querySelector("canvas");
var gl = canvas.getContext("webgl");

var makeShader = (type,src)=>{
    var shader=gl.createShader(type);
    gl.shaderSource(shader,src);
    gl.compileShader(shader);
    // Debug
    if (DEBUG)
        console.log("LOG",gl.getShaderInfoLog(shader));
    return shader;
}

// Shaders
var program = gl.createProgram();
gl.attachShader(program,makeShader(GL_VERTEX_SHADER,INLINE("null.vert")));
gl.attachShader(program,makeShader(GL_FRAGMENT_SHADER,INLINE("march.frag")));
gl.linkProgram(program);
gl.useProgram(program);

// Screen Quad
gl.bindBuffer(GL_ARRAY_BUFFER,gl.createBuffer());
gl.bufferData(GL_ARRAY_BUFFER,new Float32Array([-1,1,1,1,-1,-1,1,-1]),GL_STATIC_DRAW);
gl.vertexAttribPointer(gl.getAttribLocation(program,"v"),2,GL_FLOAT,false,0,0);
gl.enableVertexAttribArray(gl.getAttribLocation(program,"v"));

var loc = [0,0,-8];
var ang = [0,0,0];

// Input
document.body.onkeypress = (a)=>{
    if (a.key=="d")
        loc[0]+=.1;
    if (a.key=="a")
        loc[0]-=.1;
    if (a.key=="w")
        loc[2]+=.1;
    if (a.key=="s")
        loc[2]-=.1;
    if (a.key=="ArrowLeft")
        ang[0]-=.1;
    if (a.key=="ArrowRight")
        ang[0]+=.1;
    if (a.key=="ArrowUp")
        ang[1]-=.1;
    if (a.key=="ArrowDown")
        ang[1]+=.1;
};

// Resize
document.body.onresize = ()=>{
    var w=document.body.clientWidth;
    var h=document.body.clientHeight;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0,0,w,h);
    ang[2] = h/w;
}
document.body.onresize();

// Draw
var doFrame = (t)=>{
    t/=1000;
    gl.uniform3fv(gl.getUniformLocation(program,"l"),loc);
    gl.uniform3fv(gl.getUniformLocation(program,"a"),ang); // .56

    gl.drawArrays(GL_TRIANGLE_STRIP,0,4);
    requestAnimationFrame(doFrame);
};
doFrame(0);