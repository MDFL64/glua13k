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
    return (text.charCodeAt((n/8)|0)>>(n%8))&1;
}

function norm_f(f) {
    return ((f*256)|0)/256;
}

function model_p(input) {
    var counts_0 = [0,0,0,0,0,0,0,0];
    var counts_1 = [0,0,0,0,0,0,0,0];

    var p_list = [];

    for (var i=0;i<input.length*8;i++) {
        var ctx = i%8;

        // compute p
        var p = norm_f( (counts_1[ctx]+1)/(counts_0[ctx]+counts_1[ctx]+2) );
        
        p_list.push(p);

        // update counts
        if (get_bit(input,i))
            counts_1[ctx]++;
        else
            counts_0[ctx]++;
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

    var counts_0 = [0,0,0,0,0,0,0,0];
    var counts_1 = [0,0,0,0,0,0,0,0];

    while (x != START_X || input.length>0) {
        var ctx = buffer.length;

        var p = norm_f( (counts_1[ctx]+1)/(counts_0[ctx]+counts_1[ctx]+2) );
        //console.log(p);

        var bit = Math.ceil((x+1)*p) - Math.ceil(x*p);

        buffer=bit+buffer;
        if (buffer.length==8) {
            output += String.fromCharCode(parseInt(buffer,2));
            buffer="";
        }
        x = bit ? Math.ceil(x*p) : (x - Math.ceil(x*p));
        if (bit)
            counts_1[ctx]++;
        else
            counts_0[ctx]++;

        if (x<256) {
            x=x*256+input.pop();
        }
    }
    return output;
}

var input = "Buy it, use it, break it, fix it, Trash it, change it, mail, upgrade it, Charge it, point it, zoom it, press it,";
/*for (var i=0;i<80;i++) {
    input += Math.random()>PROB ? 0 : 1;
}*/

console.log("INPUT",input);

var x = encode(input);
var x_len = x.length;
console.log("ENC",JSON.stringify(x));

var output = decode(x);
console.log("OUTPUT",output);

console.log("MATCH",input==output);
console.log("SIZE",input.length,x_len);
