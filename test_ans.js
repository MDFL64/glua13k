var test_data = "Buy it, use it, break it, fix it,";

/*`
Buy it, use it, break it, fix it,
Trash it, change it, mail, upgrade it,
Charge it, point it, zoom it, press it,
Snap it, work it, quick, erase it,
Write it, cut it, paste it, save it,
Load it, check it, quick, rewrite it
Plug it, play it, burn it, rip it,
Drag and drop it, zip, unzip it,
Lock it, fill it, curl it, find it,
View it, code it, jam, unlock it
`;*/


var D = 256;

var PROB = 10/D;

var START_X = 256;

function get_bit(text,n) {
    return (text.charCodeAt((n/8)|0)>>(7-n%8))&1;
}

function norm_f(f) {
    return ((f*256)|0)/256;
}

function get_preceding_bits(text,n) {
    var res = "";
    for (var i= n & 0xFFFFFFF8; i<n ; i++) {
        res += get_bit(text,i);
    }
    return res;
}

function calc_p(counts_0,counts_1,ctx) {
    return norm_f((counts_1[ctx]||1)/((counts_0[ctx]||1)+(counts_1[ctx]||1)));
}

function update_counts(counts_0,counts_1,ctx,bit) {
    if (bit)
        counts_1[ctx]=(counts_1[ctx]||1)+1;
    else
        counts_0[ctx]=(counts_0[ctx]||1)+1;
}

function model_p(input) {
    var counts_0 = {};
    var counts_1 = {};

    var p_list = [];

    for (var i=0;i<input.length*8;i++) {
        var ctx = get_preceding_bits(input,i);
        
        // compute p
        var p = calc_p(counts_0,counts_1,ctx);
        //console.log("ENCODE("+ctx+") "+p);
        
        p_list.push(p);

        // update counts
        update_counts(counts_0,counts_1,ctx,get_bit(input,i));
    }

    return p_list;
}

function encode(input) {
    var p_list = model_p(input);

    var x=START_X;
    var output = [];

    for (var i=input.length*8-1;i>=0;i--) {
        var p = p_list.pop();

        var bit = get_bit(input,i);
        
        while (true) {
            var new_x;
            if (bit == 0)
                new_x = Math.ceil((x+1)/(1-p)) - 1;
            else
                new_x = Math.floor(x/p);
            
            if (new_x>0xFFFF) {
                output.push(x&0xFF);
                x>>=8;
            } else {
                x=new_x;
                break;
            }
        }
    }

    output.push(x&0xFF);
    x>>=8;
    output.push(x&0xFF);
    x>>=8;
    return output;
}

function decode(input) {
    var buffer = "";
    var output = "";

    var x = input.pop();
    x=x*256+input.pop();

    var counts_0 = {};
    var counts_1 = {};

    while (x != START_X || input.length>0) {
        var ctx = buffer;
        
        // compute p
        var p = calc_p(counts_0,counts_1,ctx);
        //console.log("DECODE("+ctx+") "+p);

        var bit = Math.ceil((x+1)*p) - Math.ceil(x*p);

        buffer+=bit;
        if (buffer.length==8) {
            //console.log(buffer);
            output += String.fromCharCode(parseInt(buffer,2));
            buffer="";
        }
        x = bit ? Math.ceil(x*p) : (x - Math.ceil(x*p));
        
        // update counts
        update_counts(counts_0,counts_1,ctx,bit);

        if (x<256) {
            x=x*256+input.pop();
        }
    }
    console.log("CONTEXT COUNT = ",Object.keys(counts_0).length);
    return output;
}

var input = `<title>COLD STORAGE</title><meta charset="utf-8"><body style="overflow:hidden;margin:0"><canvas width=1280 height=720></canvas><script>var e=document.querySelector("canvas"),r=e.getContext("webgl"),t=(e,t)=>{var o=r.createShader(e);return r.shaderSource(o,t),r.compileShader(o),o},o=r.createProgram();r.attachShader(o,t(35633,"attribute vec4 v;varying vec2 p;void main(){p=(gl_Position=v).rg;}")),r.attachShader(o,t(35632,"precision mediump float;uniform vec3 a,l;varying vec2 p;float v(vec3 v,float s){return length(v)-s;}float n(vec3 v,vec3 s){return length(max(abs(v)-s,0.));}float s(float v,float s){return min(v,s);}float n(vec3 r){return s(v(r,1.),s(s(s(n(r-vec3(0,0,10),vec3(10,2,.1)),n(r-vec3(0,0,-10),vec3(10,2,.1))),s(n(r-vec3(10,0,0),vec3(.1,2,10)),n(r-vec3(-10,0,0),vec3(.1,2,10)))),s(n(r-vec3(0,2,0),vec3(10,.1,10)),n(r-vec3(0,-2,0),vec3(10,.1,10)))));}vec3 s(vec3 v){return normalize(vec3(n(v+vec3(.01,0,0))-n(v+vec3(-.01,0,0)),n(v+vec3(0,.01,0))-n(v+vec3(0,-.01,0)),n(v+vec3(0,0,.01))-n(v+vec3(0,0,-.01))));}void main(){vec3 v=normalize(vec3(p.r,p.g*a.b,1))*mat3(1,0,0,0,cos(a.g),-sin(a.g),0,sin(a.g),cos(a.g))*mat3(cos(a.r),0,sin(a.r),0,1,0,-sin(a.r),0,cos(a.r)),r=l;for(int f=0;f<128;f++){float m=n(r);if(m<.01){vec3 c=s(r);gl_FragColor=vec4(c.r*.5+.5,c.g*.5+.5,c.b*.5+.5,1);return;}r+=v*m;}gl_FragColor=vec4(.2,.2,.2,1);}")),r.linkProgram(o),r.useProgram(o),r.bindBuffer(34962,r.createBuffer()),r.bufferData(34962,new Float32Array([-1,1,1,1,-1,-1,1,-1]),35044),r.vertexAttribPointer(r.getAttribLocation(o,"v"),2,5126,!1,0,0),r.enableVertexAttribArray(r.getAttribLocation(o,"v"));var a=[0,0,-8],n=[0,0,0];document.body.onkeypress=(e=>{"d"==e.key&&(a[0]+=.1),"a"==e.key&&(a[0]-=.1),"w"==e.key&&(a[2]+=.1),"s"==e.key&&(a[2]-=.1),"ArrowLeft"==e.key&&(n[0]-=.1),"ArrowRight"==e.key&&(n[0]+=.1),"ArrowUp"==e.key&&(n[1]-=.1),"ArrowDown"==e.key&&(n[1]+=.1)}),document.body.onresize=(()=>{var t=document.body.clientWidth,o=document.body.clientHeight;e.width=t,e.height=o,r.viewport(0,0,t,o),n[2]=o/t}),document.body.onresize();var i=e=>{r.uniform3fv(r.getUniformLocation(o,"l"),a),r.uniform3fv(r.getUniformLocation(o,"a"),n),r.drawArrays(5,0,4),requestAnimationFrame(i)};i(0);</script>`;
/*for (var i=0;i<80;i++) {
    input += Math.random()>PROB ? 0 : 1;
}*/

console.log("INPUT",input,input.length);

var x = encode(input);
var x_len = x.length;
console.log("ENC",JSON.stringify(x),x_len);

var output = decode(x);
console.log("OUTPUT",output);

console.log("MATCH",input==output);
console.log("SIZE",input.length,x_len);
