var fs = require("fs");

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

var stretch = (p)=>Math.log(p/(1-p));
var squash = (x)=> 1/( 1+Math.pow(Math.E,-x) );
function calc_p(counts_0,counts_1,ctxs,ctx_weights) {
    var total_v=0;
    var xs=[];
    //console.log("==>");
    ctxs.forEach((ctx,i)=>{
        if (counts_1[ctx]==null) {
            xs.push(0);
            return;
        }
        var p = (counts_1[ctx]+1) / (counts_0[ctx]+counts_1[ctx]+2);
        var x = stretch(p);
        xs.push(x);
        total_v+=(x*ctx_weights[i]); // norm_f?
    });

    var p_final = norm_f(squash(total_v));

    //for no compression:
    //p_final = Math.min(Math.max(p_final,1/256),255/256)

    // Compresses better, probably!
    if (!p_final)
        p_final=1/256;
    if (p_final==1)
        p_final=255/256;
    //console.log(">>>>>",total_v,p_final,ctx_weights);
    return [p_final,xs];
}

function update_counts(counts_0,counts_1,ctxs,bit) {
    ctxs.forEach((ctx)=>{
        counts_1[ctx]=(counts_1[ctx]||bit*5)+bit;
        counts_0[ctx]=(counts_0[ctx]||!bit*5)+!bit;

        if (bit) {
            if (counts_0[ctx]>5)
                counts_0[ctx]=(counts_0[ctx]/2)|0;
        }
        else {
            if (counts_1[ctx]>5)
                counts_1[ctx]=(counts_1[ctx]/2)|0;
        }
    });
}

var LEARN_RATE;
function update_weights(ctx_weights,xs,bit,p) {
    for (var i=0;i<xs.length;i++) {
        ctx_weights[i] = ctx_weights[i] + LEARN_RATE * xs[i] * (bit - p);
    }
}


var MODEL_WEIGHTS;

function model_p(input,ctx_settings,ctx_weights) {
    var dynamic = (ctx_weights==null);
    ctx_weights = ctx_weights || MODEL_WEIGHTS;

    var counts_0 = {};
    var counts_1 = {};

    var p_list = [];

    var tokens = [];
    var token_i=0;

    for (var i=0;i<input.length*8;i++) {
        if (i%8==0) {
            continue;
        }

        var ctxs = [];
        for (var j=0;j<ctx_settings.length;j++) {
            var ctx=String.fromCharCode(97+j);
            var setting_str = ctx_settings[j];
            if (setting_str.indexOf("4")!=-1) {
                ctx+=input[((i/8)|0)-4];
            }
            if (setting_str.indexOf("3")!=-1) {
                ctx+=input[((i/8)|0)-3];
            }
            if (setting_str.indexOf("2")!=-1) {
                ctx+=input[((i/8)|0)-2];
            }
            if (setting_str.indexOf("1")!=-1) {
                ctx+=input[((i/8)|0)-1];
            }
            
            // token shitcode
            var part = input.substr(0,(i/8)|0);
            var match = part.match(/(.|[\w]+|[\d]+\.[\d]+)$/)||[];
            if (match.index!=token_i) {
                token_i=match.index;
                tokens.push("");
            }
            tokens[tokens.length-1] = match[0];
            
            if (setting_str.indexOf("d")!=-1) {
                ctx+=tokens[tokens.length-4];
            }
            if (setting_str.indexOf("c")!=-1) {
                ctx+=tokens[tokens.length-3];
            }
            if (setting_str.indexOf("b")!=-1) {
                ctx+=tokens[tokens.length-2];
            }
            if (setting_str.indexOf("a")!=-1) {
                ctx+=tokens[tokens.length-1];
            }

            if (setting_str.indexOf("0")!=-1) {
                ctx+="+"+get_preceding_bits(input,i);
            }
            ctxs.push(ctx);
        }
        //console.log(ctxs);
        //console.log(ctxs);
        
        // compute p
        var [p,xs] = calc_p(counts_0,counts_1,ctxs,ctx_weights);
        //console.log("ENCODE("+ctx+") "+p);
        
        p_list.push(p);

        // update counts
        var bit = get_bit(input,i);
        update_counts(counts_0,counts_1,ctxs,bit);
        if (dynamic)
            update_weights(ctx_weights,xs,bit,p);
    }
    //console.log(ctx_weights);
    console.log("CONTEXT COUNT = ",Object.keys(counts_0).length);
    if (dynamic)
        MODEL_WEIGHTS = ctx_weights;

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
    //console.log(ctx_weights);
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
        var [p,xs] = calc_p(counts_0,counts_1,ctxs,ctx_weights);

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
        update_weights(ctx_weights,xs,bit,p);

        if (x<256) {
            x=x*256+input.pop();
        }
    }
    //console.log("CONTEXT COUNT = ",Object.keys(counts_0).length);
    return output;
}

var input1 = fs.readFileSync("build/index.html").toString();

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

    var ctx_s = [
        "0",
        "01","02","03","04",
        "012","0123","01234",
        "0a","0c","0bd"
        ];
    console.log("Try:",ctx_s);
    
    MODEL_WEIGHTS = [];
    for (var i=0;i<ctx_s.length;i++) {
        MODEL_WEIGHTS[i]=1;
    }

    LEARN_RATE = .1;
    
    var TRAINING_PASSES = 10;
    for (var i=1;i<=TRAINING_PASSES;i++) {
        var x = encode(input,ctx_s);
        var x_len = x.length;
        console.log("PASS "+i+"==>", x_len,(x_len/input.length*100).toFixed(2)+"%" );
        LEARN_RATE/=2;
    }

    MODEL_WEIGHTS = MODEL_WEIGHTS.map((x)=> +x.toFixed(2));
    console.log(JSON.stringify(MODEL_WEIGHTS));

    var x = encode(input,ctx_s,MODEL_WEIGHTS);
    var x_len = x.length;
    console.log("FINAL==>", x_len,(x_len/input.length*100).toFixed(2)+"%" );

    /*var output = decode(x,ctx_s,[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]);

    if (input!=output)
        console.log("==========> BAD MATCH!!!");*/
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