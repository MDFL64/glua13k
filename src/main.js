/** @define {boolean} */
var DEBUG=true;

// CONSTANTS
var GL_TRIANGLE_STRIP   = 0x5;
var GL_FLOAT            = 0x1406;
var GL_ARRAY_BUFFER     = 0x8892;
var GL_STATIC_DRAW      = 0x88E4;
var GL_FRAGMENT_SHADER  = 0x8B30;
var GL_VERTEX_SHADER    = 0x8B31;

var gl = document.querySelector("canvas").getContext("webgl");

function makeShader(type,src) {
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
var vert_attr=gl.getAttribLocation(program,"v");

// Screen Quad
gl.bindBuffer(GL_ARRAY_BUFFER,gl.createBuffer());
gl.bufferData(GL_ARRAY_BUFFER,new Float32Array([-1,1,1,1,-1,-1,1,-1]),GL_STATIC_DRAW);
gl.vertexAttribPointer(vert_attr,2,GL_FLOAT,false,0,0);
gl.enableVertexAttribArray(vert_attr);

// Draw
gl.drawArrays(GL_TRIANGLE_STRIP,0,4);
