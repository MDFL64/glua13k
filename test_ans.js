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

function calc_p(counts_0,counts_1,ctxs,ctx_weights) {
    var total_v=0;
    var total_w=0;

    ctxs.forEach((ctx,i)=>{
        if (counts_1[ctx]==null)
            return;
        var p = (counts_1[ctx]+.5) / (counts_0[ctx]+counts_1[ctx]+1);
        var l = Math.abs(Math.log(p/(1-p)));
        total_v += p*l*ctx_weights[i];
        total_w += l*ctx_weights[i];
    })

    if (!total_w)
        return .5;

    return norm_f(total_v/total_w);
}

function update_counts(counts_0,counts_1,ctxs,bit) {
    ctxs.forEach((ctx)=>{
        counts_1[ctx]=(counts_1[ctx]||bit*5)+bit;
        counts_0[ctx]=(counts_0[ctx]||!bit*5)+!bit;
    });
}

function model_p(input,ctx_settings,ctx_weights) {
    var counts_0 = {};
    var counts_1 = {};

    var p_list = [];

    for (var i=0;i<input.length*8;i++) {
        if (i%8==0)
            continue;

        var ctxs = [];
        for (var j=0;j<ctx_settings.length;j++) {
            var ctx=String.fromCharCode(97+j);
            var setting_str = ctx_settings[j];
            if (setting_str.indexOf("0")!=-1) {
                ctx+=get_preceding_bits(input,i)+"+";
            }
            if (setting_str.indexOf("1")!=-1) {
                ctx+=input[((i/8)|0)-1];
            }
            if (setting_str.indexOf("2")!=-1) {
                ctx+=input[((i/8)|0)-2];
            }
            if (setting_str.indexOf("3")!=-1) {
                ctx+=input[((i/8)|0)-3];
            }
            if (setting_str.indexOf("4")!=-1) {
                ctx+=input[((i/8)|0)-4];
            }
            if (setting_str.indexOf("5")!=-1) {
                ctx+=input[((i/8)|0)-5];
            }
            ctxs.push(ctx);
        }
        //console.log(ctxs);
        
        // compute p
        var p = calc_p(counts_0,counts_1,ctxs,ctx_weights);
        //console.log("ENCODE("+ctx+") "+p);
        
        p_list.push(p);

        // update counts
        update_counts(counts_0,counts_1,ctxs,get_bit(input,i));
    }

    return p_list;
}

function encode(input,ctx_settings,ctx_weights) {
    var p_list = model_p(input,ctx_settings,ctx_weights);

    var x=START_X;
    var output = [];

    for (var i=input.length*8-1;i>=0;i--) {
        if (i%8==0)
            continue;
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

function decode(input,ctx_settings,ctx_weights) {
    var buffer = "";
    var output = "";

    var x = input.pop();
    x=x*256+input.pop();

    var counts_0 = {};
    var counts_1 = {};

    while (x != START_X || input.length>0) {
        var ctxs = [
            buffer,
            output[output.length-1]+"a"+buffer,
            output[output.length-2]+output[output.length-1]+"b"+buffer,
            output[output.length-3]+output[output.length-2]+output[output.length-1]+"c"+buffer,
            output[output.length-4]+output[output.length-3]+output[output.length-2]+output[output.length-1]+"d"+buffer,
            output[output.length-5]+output[output.length-4]+output[output.length-3]+output[output.length-2]+output[output.length-1]+"e"+buffer
        ];

        var ctxs = [];
        for (var j=0;j<ctx_settings.length;j++) {
            var ctx=String.fromCharCode(97+j);
            var setting_str = ctx_settings[j];
            if (setting_str.indexOf("0")!=-1) {
                ctx+=buffer+"+";
            }
            if (setting_str.indexOf("1")!=-1) {
                ctx+=output[output.length-1];
            }
            if (setting_str.indexOf("2")!=-1) {
                ctx+=output[output.length-2];
            }
            if (setting_str.indexOf("3")!=-1) {
                ctx+=output[output.length-3];
            }
            if (setting_str.indexOf("4")!=-1) {
                ctx+=output[output.length-4];
            }
            if (setting_str.indexOf("5")!=-1) {
                ctx+=output[output.length-5];
            }
            ctxs.push(ctx);
        }
        
        // compute p
        var p = calc_p(counts_0,counts_1,ctxs,ctx_weights);

        var bit = Math.ceil((x+1)*p) - Math.ceil(x*p);

        buffer+=bit;
        if (buffer.length==7) {
            //console.log(String.fromCharCode(parseInt(buffer,2)));
            output += String.fromCharCode(parseInt(buffer,2));
            buffer="";
        }
        x = bit ? Math.ceil(x*p) : (x - Math.ceil(x*p));
        
        // update counts
        update_counts(counts_0,counts_1,ctxs,bit);

        if (x<256) {
            x=x*256+input.pop();
        }
    }
    //console.log("CONTEXT COUNT = ",Object.keys(counts_0).length);
    return output;
}

var input1 = `<title>COLD STORAGE</title><meta charset="utf-8"><body style="overflow:hidden;margin:0"><canvas width=1280 height=720></canvas><script>var e=document.querySelector("canvas"),r=e.getContext("webgl"),t=(e,t)=>{var o=r.createShader(e);return r.shaderSource(o,t),r.compileShader(o),o},o=r.createProgram();r.attachShader(o,t(35633,"attribute vec4 v;varying vec2 p;void main(){p=(gl_Position=v).rg;}")),r.attachShader(o,t(35632,"precision mediump float;uniform vec3 a,l;varying vec2 p;float v(vec3 v,float s){return length(v)-s;}float n(vec3 v,vec3 s){return length(max(abs(v)-s,0.));}float s(float v,float s){return min(v,s);}float n(vec3 r){return s(v(r,1.),s(s(s(n(r-vec3(0,0,10),vec3(10,2,.1)),n(r-vec3(0,0,-10),vec3(10,2,.1))),s(n(r-vec3(10,0,0),vec3(.1,2,10)),n(r-vec3(-10,0,0),vec3(.1,2,10)))),s(n(r-vec3(0,2,0),vec3(10,.1,10)),n(r-vec3(0,-2,0),vec3(10,.1,10)))));}vec3 s(vec3 v){return normalize(vec3(n(v+vec3(.01,0,0))-n(v+vec3(-.01,0,0)),n(v+vec3(0,.01,0))-n(v+vec3(0,-.01,0)),n(v+vec3(0,0,.01))-n(v+vec3(0,0,-.01))));}void main(){vec3 v=normalize(vec3(p.r,p.g*a.b,1))*mat3(1,0,0,0,cos(a.g),-sin(a.g),0,sin(a.g),cos(a.g))*mat3(cos(a.r),0,sin(a.r),0,1,0,-sin(a.r),0,cos(a.r)),r=l;for(int f=0;f<128;f++){float m=n(r);if(m<.01){vec3 c=s(r);gl_FragColor=vec4(c.r*.5+.5,c.g*.5+.5,c.b*.5+.5,1);return;}r+=v*m;}gl_FragColor=vec4(.2,.2,.2,1);}")),r.linkProgram(o),r.useProgram(o),r.bindBuffer(34962,r.createBuffer()),r.bufferData(34962,new Float32Array([-1,1,1,1,-1,-1,1,-1]),35044),r.vertexAttribPointer(r.getAttribLocation(o,"v"),2,5126,!1,0,0),r.enableVertexAttribArray(r.getAttribLocation(o,"v"));var a=[0,0,-8],n=[0,0,0];document.body.onkeypress=(e=>{"d"==e.key&&(a[0]+=.1),"a"==e.key&&(a[0]-=.1),"w"==e.key&&(a[2]+=.1),"s"==e.key&&(a[2]-=.1),"ArrowLeft"==e.key&&(n[0]-=.1),"ArrowRight"==e.key&&(n[0]+=.1),"ArrowUp"==e.key&&(n[1]-=.1),"ArrowDown"==e.key&&(n[1]+=.1)}),document.body.onresize=(()=>{var t=document.body.clientWidth,o=document.body.clientHeight;e.width=t,e.height=o,r.viewport(0,0,t,o),n[2]=o/t}),document.body.onresize();var i=e=>{r.uniform3fv(r.getUniformLocation(o,"l"),a),r.uniform3fv(r.getUniformLocation(o,"a"),n),r.drawArrays(5,0,4),requestAnimationFrame(i)};i(0);</script>`;
var input2 = `var e=document.querySelector("canvas"),r=e.getContext("webgl"),t=(e,t)=>{var o=r.createShader(e);return r.shaderSource(o,t),r.compileShader(o),o},o=r.createProgram();r.attachShader(o,t(35633,"attribute vec4 v;varying vec2 p;void main(){p=(gl_Position=v).rg;}")),r.attachShader(o,t(35632,"precision mediump float;uniform vec3 a,l;varying vec2 p;float v(vec3 v,float s){return length(v)-s;}float n(vec3 v,vec3 s){return length(max(abs(v)-s,0.));}float s(float v,float s){return min(v,s);}float n(vec3 r){return s(v(r,1.),s(s(s(n(r-vec3(0,0,10),vec3(10,2,.1)),n(r-vec3(0,0,-10),vec3(10,2,.1))),s(n(r-vec3(10,0,0),vec3(.1,2,10)),n(r-vec3(-10,0,0),vec3(.1,2,10)))),s(n(r-vec3(0,2,0),vec3(10,.1,10)),n(r-vec3(0,-2,0),vec3(10,.1,10)))));}vec3 s(vec3 v){return normalize(vec3(n(v+vec3(.01,0,0))-n(v+vec3(-.01,0,0)),n(v+vec3(0,.01,0))-n(v+vec3(0,-.01,0)),n(v+vec3(0,0,.01))-n(v+vec3(0,0,-.01))));}void main(){vec3 v=normalize(vec3(p.r,p.g*a.b,1))*mat3(1,0,0,0,cos(a.g),-sin(a.g),0,sin(a.g),cos(a.g))*mat3(cos(a.r),0,sin(a.r),0,1,0,-sin(a.r),0,cos(a.r)),r=l;for(int f=0;f<128;f++){float m=n(r);if(m<.01){vec3 c=s(r);gl_FragColor=vec4(c.r*.5+.5,c.g*.5+.5,c.b*.5+.5,1);return;}r+=v*m;}gl_FragColor=vec4(.2,.2,.2,1);}")),r.linkProgram(o),r.useProgram(o),r.bindBuffer(34962,r.createBuffer()),r.bufferData(34962,new Float32Array([-1,1,1,1,-1,-1,1,-1]),35044),r.vertexAttribPointer(r.getAttribLocation(o,"v"),2,5126,!1,0,0),r.enableVertexAttribArray(r.getAttribLocation(o,"v"));var a=[0,0,-8],n=[0,0,0];document.body.onkeypress=(e=>{"d"==e.key&&(a[0]+=.1),"a"==e.key&&(a[0]-=.1),"w"==e.key&&(a[2]+=.1),"s"==e.key&&(a[2]-=.1),"ArrowLeft"==e.key&&(n[0]-=.1),"ArrowRight"==e.key&&(n[0]+=.1),"ArrowUp"==e.key&&(n[1]-=.1),"ArrowDown"==e.key&&(n[1]+=.1)}),document.body.onresize=(()=>{var t=document.body.clientWidth,o=document.body.clientHeight;e.width=t,e.height=o,r.viewport(0,0,t,o),n[2]=o/t}),document.body.onresize();var i=e=>{r.uniform3fv(r.getUniformLocation(o,"l"),a),r.uniform3fv(r.getUniformLocation(o,"a"),n),r.drawArrays(5,0,4),requestAnimationFrame(i)};i(0);`
var input3 = `attribute vec4 v;varying vec2 p;void main(){p=(gl_Position=v).rg;}
precision mediump float;uniform vec3 a,l;varying vec2 p;float v(vec3 v,float s){return length(v)-s;}float n(vec3 v,vec3 s){return length(max(abs(v)-s,0.));}float s(float v,float s){return min(v,s);}float n(vec3 r){return s(v(r,1.),s(s(s(n(r-vec3(0,0,10),vec3(10,2,.1)),n(r-vec3(0,0,-10),vec3(10,2,.1))),s(n(r-vec3(10,0,0),vec3(.1,2,10)),n(r-vec3(-10,0,0),vec3(.1,2,10)))),s(n(r-vec3(0,2,0),vec3(10,.1,10)),n(r-vec3(0,-2,0),vec3(10,.1,10)))));}vec3 s(vec3 v){return normalize(vec3(n(v+vec3(.01,0,0))-n(v+vec3(-.01,0,0)),n(v+vec3(0,.01,0))-n(v+vec3(0,-.01,0)),n(v+vec3(0,0,.01))-n(v+vec3(0,0,-.01))));}void main(){vec3 v=normalize(vec3(p.r,p.g*a.b,1))*mat3(1,0,0,0,cos(a.g),-sin(a.g),0,sin(a.g),cos(a.g))*mat3(cos(a.r),0,sin(a.r),0,1,0,-sin(a.r),0,cos(a.r)),r=l;for(int f=0;f<128;f++){float m=n(r);if(m<.01){vec3 c=s(r);gl_FragColor=vec4(c.r*.5+.5,c.g*.5+.5,c.b*.5+.5,1);return;}r+=v*m;}gl_FragColor=vec4(.2,.2,.2,1);}`;
var input4 = `var e=document.querySelector("canvas"),r=e.getContext("webgl"),t=(e,t)=>{var o=r.createShader(e);return r.shaderSource(o,t),r.compileShader(o),o},o=r.createProgram();r.attachShader(o,t(35633,s1)),r.attachShader(o,t(35632,s2)),r.linkProgram(o),r.useProgram(o),r.bindBuffer(34962,r.createBuffer()),r.bufferData(34962,new Float32Array([-1,1,1,1,-1,-1,1,-1]),35044),r.vertexAttribPointer(r.getAttribLocation(o,"v"),2,5126,!1,0,0),r.enableVertexAttribArray(r.getAttribLocation(o,"v"));var a=[0,0,-8],n=[0,0,0];document.body.onkeypress=(e=>{"d"==e.key&&(a[0]+=.1),"a"==e.key&&(a[0]-=.1),"w"==e.key&&(a[2]+=.1),"s"==e.key&&(a[2]-=.1),"ArrowLeft"==e.key&&(n[0]-=.1),"ArrowRight"==e.key&&(n[0]+=.1),"ArrowUp"==e.key&&(n[1]-=.1),"ArrowDown"==e.key&&(n[1]+=.1)}),document.body.onresize=(()=>{var t=document.body.clientWidth,o=document.body.clientHeight;e.width=t,e.height=o,r.viewport(0,0,t,o),n[2]=o/t}),document.body.onresize();var i=e=>{r.uniform3fv(r.getUniformLocation(o,"l"),a),r.uniform3fv(r.getUniformLocation(o,"a"),n),r.drawArrays(5,0,4),requestAnimationFrame(i)};i(0);`

/*for (var i=0;i<80;i++) {
    input += Math.random()>PROB ? 0 : 1;
}*/

/*
var options = 6;

var results = [];
for (var i=1;i<(1<<options);i++) {
    var bits = i.toString(2);
    while (bits.length<options)
        bits="0"+bits;
    
    var s="";
    for (var j=0;j<options;j++) {
        if (bits[j]==1)
            s+=j;
    }

    if (s.indexOf("0")==-1)
        continue;
    //console.log(bits,s);

    var ctx_s = [s];
    var ctx_w = [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1];
    //console.log("Try:",ctx_s,ctx_w);

    var x = encode(input,ctx_s,ctx_w);
    var x_len = x.length;
    //console.log("==>",x_len);

    var output = decode(x,ctx_s,ctx_w);

    if (input!=output)
        console.log("==========> "+s+" BAD MATCH!!!");
    else
        results.push(x_len+":"+s);
}
console.log(results.sort());*/

function do_test(input) {
    console.log("Input size:",input.length);

    var ctx_s = ["01","02","012","0"];
    var ctx_w = [10,1,100,30,      2,1,1,1,1,1,1,1,1,1,1,1];
    console.log("Try:",ctx_s,ctx_w);

    var x = encode(input,ctx_s,ctx_w);
    var x_len = x.length;
    console.log("==>", x_len,(x_len/input.length*100).toFixed(2)+"%" );

    var output = decode(x,ctx_s,ctx_w);

    if (input!=output)
        console.log("==========> BAD MATCH!!!");
}

console.log(">>>>>>>>>>>>>>>>>>>>>>>>> FULL SOURCE");
do_test(input1);

/*console.log(">>>>>>>>>>>>>>>>>>>>>>>>> NO HTML");
do_test(input2);

console.log(">>>>>>>>>>>>>>>>>>>>>>>>> SHADERS ONLY");
do_test(input3);

console.log(">>>>>>>>>>>>>>>>>>>>>>>>> JS ONLY");
do_test(input4);

console.log("NOTE, HTML IS 144 BYTES");*/

/*var output = decode(x);
console.log("OUTPUT",output);

console.log("MATCH",input==output);
console.log("SIZE",input.length,x_len);
*/