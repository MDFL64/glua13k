var fs = require("fs");
var child_process = require("child_process");
var terser = require("terser");

var START_X = 256;

function get_bit(text,n) {
    return (text.charCodeAt((n/8)|0)>>(7-n%8))&1;
}

function norm_f(f) {
    return ((f*256)|0)/256;
}

function get_preceding_bits(text,n) {
    var res = "";
    for (var i= (n & 0xFFFFFFF8)+1; i<n ; i++) {
        res += get_bit(text,i);
    }
    return res;
}

var stretch = (p)=>Math.log(p/(1-p));
var squash = (x)=> 1/( 1+Math.pow(Math.E,-x) );
function calc_p(counts_0,counts_1,ctxs,ctx_weights) {
    //var total_v=0;
    var xs=[];
    //console.log("==>");
    /*ctxs.forEach((ctx,i)=>{
        if (counts_1[ctx]==null) {
            xs.push(0);
            return;
        }
        var p = (counts_1[ctx]+1) / (counts_0[ctx]+counts_1[ctx]+2);
        var x = stretch(p);
        xs.push(x);
        total_v+=(x*ctx_weights[i]); // norm_f?
    });*/

    var p=0;
    ctxs.map((ctx,i)=>{
        var x = (counts_1[ctx]+1) / (counts_0[ctx]+counts_1[ctx]+2);
        if (x==x) {
            xs.push(x);
            p+= Math.log(x/(1-x))*ctx_weights[i];
        }
        else
            xs.push(0);
    });

    var p_final = norm_f(squash(p));

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

    //var tokens = [];
    //var token_i=0;

    for (var i=0;i<input.length*8;i++) {
        if (i%8==0) {
            var match = input.substr(0,(i/8)|0).match(/(.|\w+)(.|\w+)(.|\w+)(.|\w+)$/)||[];
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
            ///
            if (setting_str.indexOf("d")!=-1) {
                ctx+=match[1];
            }
            if (setting_str.indexOf("c")!=-1) {
                ctx+=match[2];
            }
            if (setting_str.indexOf("b")!=-1) {
                ctx+=match[3];
            }
            if (setting_str.indexOf("a")!=-1) {
                ctx+=match[4];
            }

            if (setting_str.indexOf("0")!=-1) {
                ctx+="+"+get_preceding_bits(input,i);
            }
            ctxs.push(ctx);
        }
        //console.log("===>",match,ctxs);
        
        // compute p
        var [p,xs] = calc_p(counts_0,counts_1,ctxs,ctx_weights);
        //console.log("ENCODE("+ctx+") "+p);
        
        p_list.push(p);

        // update counts
        var bit = get_bit(input,i);
        update_counts(counts_0,counts_1,ctxs,bit);
        if (dynamic)
            update_weights(ctx_weights,xs,bit,p);
        
        //console.log(">>>",i);
    }
    //console.log(ctx_weights);
    console.log("CONTEXT COUNT = ",Object.keys(counts_0).length);
    if (dynamic)
        MODEL_WEIGHTS = ctx_weights;

    return p_list;
}

function encode(input,ctx_settings,ctx_weights) {
    input+="\x00";
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

    return output.reverse();
}

function decode(input,ctx_weights) {
    var output = "";
    var buffer = "0b";
    var match = [];

    //console.log(JSON.stringify(input));
    var index = 0;
    var x = input[input.length-1-index++];
    x=x*256+input[input.length-1-index++];

    var counts_0 = {};
    var counts_1 = {};

    for (;;) {
        // The hope is that this sequence will compress good
        // I'm not really sure that's working out.
        var n=0;
        var ctxs = [
            (n++)+buffer+"+"+output[output.length-n], // 10
            (n++)+buffer+"+"+output[output.length-n], // 20
            (n++)+buffer+"+"+output[output.length-n], // 30
            (n++)+buffer+"+"+output[output.length-n], // 40

            (n++)+buffer+"+"+output[output.length-1]+output[output.length-2]+output[output.length-3]+output[output.length-4], // 43210
            (n++)+buffer+"+"+output[output.length-1]+output[output.length-2]+output[output.length-3], // 3210
            (n++)+buffer+"+"+output[output.length-1]+output[output.length-2], // 210

            (n++)+buffer, // 0

            (n++)+buffer+"+"+match[4], // a0
            (n++)+buffer+"+"+match[2], // c0
            (n++)+buffer+"+"+match[1]+match[3]  // db0
        ];
        
        var p=0;
        ctxs.map((ctx,i)=>{
            ctx = (counts_1[ctx]+1) / (counts_0[ctx]+counts_1[ctx]+2); // compute probability
            if (ctx==ctx)
                p-= Math.log(ctx/(1-ctx))*ctx_weights[i]; // stretch + weight probability
        });

        p = ((256/(1+(Math.E**p)))|0);    // squash + normalize probability
        p = ((!p)?(1):((p==256)?(p-1):p))/256; // clamp probability
        
        // get bit
        var bit = Math.ceil((x+1)*p) - Math.ceil(x*p); 

        buffer+=bit;
        if (buffer.length>8) {
            if (!+buffer)
                break;
            output += String.fromCharCode(+buffer);
            buffer="0b";
            match = output.match(/(.|\w+)(.|\w+)(.|\w+)(.|\w+)$/)||[];
        }
        //x = bit ? Math.ceil(x*p) : (x - Math.ceil(x*p));
        var [x,picked,other]= bit ? [Math.ceil(x*p),counts_1,counts_0] : [x - Math.ceil(x*p),counts_0,counts_1];
        
        // update counts
        ctxs.map((ctx,i)=>{
            picked[ctx]=(picked[ctx]||5)+1;
            other[ctx]= other[ctx]>5 ? ((other[ctx]/2)|0) : (other[ctx]||0);
        });

        if (x<256) {
            x=x*256+input[input.length-1-index++];
        }
    }
    return output;
}

function do_compress(in_html) {
    var input = in_html.match(/<script>(.*)<\/script>/)[1];

    console.log("Input size:",input.length);

    var ctx_s = [
        "01","02","03","04",
        "01234","0123","012",
        "0",
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

    MODEL_WEIGHTS = MODEL_WEIGHTS.map((x)=> norm_f(x));
    console.log(JSON.stringify(MODEL_WEIGHTS));

    var x = encode(input,ctx_s,MODEL_WEIGHTS);
    var x_len = x.length;
    console.log("FINAL==>", x_len,(x_len/input.length*100).toFixed(2)+"%" );

    x.reverse();
    //console.log(JSON.stringify(MODEL_WEIGHTS));
    var output = decode(x,MODEL_WEIGHTS);

    if (input!=output) {
        console.log("==========> BAD MATCH!!!");
        console.log(output);
    } else {
        //var fwd = ["\u0000","\u0001","\u0002","\u0003","\u0004","\u0005","\u0006","\u0007","\b","\t","\n","\u000b","\f","\r","\u000e","\u000f","\u0010","\u0011","\u0012","\u0013","\u0014","\u0015","\u0016","\u0017","\u0018","\u0019","\u001a","\u001b","\u001c","\u001d","\u001e","\u001f"," ","!","\"","#","$","%","&","'","(",")","*","+",",","-",".","/","0","1","2","3","4","5","6","7","8","9",":",";","<","=",">","?","@","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","[","\\","]","^","_","`","a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","{","|","}","~","","€","","‚","ƒ","„","…","†","‡","ˆ","‰","Š","‹","Œ","","Ž","","","‘","’","“","”","•","–","—","˜","™","š","›","œ","","ž","Ÿ"," ","¡","¢","£","¤","¥","¦","§","¨","©","ª","«","¬","­","®","¯","°","±","²","³","´","µ","¶","·","¸","¹","º","»","¼","½","¾","¿","À","Á","Â","Ã","Ä","Å","Æ","Ç","È","É","Ê","Ë","Ì","Í","Î","Ï","Ð","Ñ","Ò","Ó","Ô","Õ","Ö","×","Ø","Ù","Ú","Û","Ü","Ý","Þ","ß","à","á","â","ã","ä","å","æ","ç","è","é","ê","ë","ì","í","î","ï","ð","ñ","ò","ó","ô","õ","ö","÷","ø","ù","ú","û","ü","ý","þ","ÿ"];
        /*var data = "";
        for (var i=0;i<x.length;i++) {
            data+=fwd[x[i]];
        }
        data = data
            .replace(/\\/g,"\\\\")
            .replace(/\"/g,"\\\"")
            .replace(/\n/g,"\\n")
            .replace(/\r/g,"\\r");*/

        var code = decode.toString()
            .replace(/[^{]*{/,`
                fetch("").then((x)=>x.arrayBuffer()).then((x)=>{
                    var input = new Uint8Array(x);
            `)
            .replace(/var index = 0/,"var index = 11")
            .replace(/ctx_weights\[i\]/,"input[input.length-1-i]/256")
            .replace("return output;","EVAL(output);")
            .replace(/}$/,"});");

        code = terser.minify(code,{toplevel: true,compress:{passes: 2}}).code;
        code = code.replace(/var ?/g,"");
        code = code.replace(/EVAL/,"eval");

        var out_html = in_html.replace(/<script>(.*)<\/script>/,"<script>"+code+"</script>");
        //console.log("****",x);
        var final = Buffer.concat([
            Buffer.from(out_html),
            Buffer.from(x),
            Buffer.from(MODEL_WEIGHTS.map(x=>x*256).reverse()),
        ]);
        
        return final;
    }
}

var input = fs.readFileSync(process.argv[2]).toString();

var output = do_compress(input);

fs.writeFileSync(process.argv[3],output);