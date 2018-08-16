var fs = require("fs");
var child_process = require("child_process");


function bwt(input) {
    var data = input+"\x00";
    var rots = [];

    var count = data.length;
    for (var i=0;i<count;i++) {
        rots.push(data);
        data = data.substr(1)+data[0];
    }

    rots.sort();

    var transformed = "";
    rots.forEach((x)=>{
        //console.log("==>",x.substr(0,20),x.substr(x.length-20),x[x.length-1]);
        transformed += x[x.length-1];
    });
    return transformed;
}

function mtf(input) {
    var alphabet = [];
    for (var i=0;i<127;i++) {
        alphabet[i] = i;
    }
    var output = [];
    for (var i=0;i<input.length;i++) {
        var symbol = input.charCodeAt(i);
        var index = alphabet.indexOf(symbol);
        alphabet.splice(index,1);
        alphabet.unshift(symbol);
        output.push(index);
    }
    return output;
}

var x = bwt(fs.readFileSync("build/index.html").toString());
//console.log("\n\n");
//console.log(x);

var transformed = mtf(x);

//fs.writeFileSync("build/bwt",x);
//console.log("============>\n"+transformed);

// RLE
var final=[];
var last;
var count;
for (var i=0;i<transformed.length+1;i++) {
    var c = transformed[i];
    if (last != c) {
        if (last != null) {
            if (count>1) {
                final.push(128+count);
            }
            final.push(last);
        }
        last = c;
        count = 1;
    } else {
        count++;
    }
}

fs.writeFileSync("build/xyz",new Uint8Array(final));

function run(cmd) {
    var args = cmd.split(" ");
    cmd = args.shift();

    var res = child_process.spawnSync(cmd,args);
    if (res.status != 0) {
        console.log("ERROR!");
        console.log(res.stderr.toString());
        process.exit();
    }
    return res;
}

run("tools/advzip --add -4 -i 1000 build/xyz.zip build/xyz");