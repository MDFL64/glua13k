var child_process = require("child_process");
var fs = require("fs");
var util = require("util");

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

function getSize(file) {
    return fs.lstatSync(file).size;
}

function compare(title,a,b) {
    var str = (b || a) + "b";
    if (b) {
        var delta = (b - a);

        str += " ( " + delta + "b / " + ((delta/a)*100).toFixed(2) + "% )";
    }
    title+=":";
    while (title.length<20)
        title+=" ";
    console.log("\t"+title+str);
}

var files = {};

function SMERT(src) {
    return src.replace(/\n/g,"");
}

function processJs(file) {
    console.log(">>> "+file);
    var size = getSize("src/"+file);
    compare("Start",size);
    
    var new_src = run("java -jar tools/closure-compiler.jar --js src/"+file+" --compilation_level ADVANCED_OPTIMIZATIONS --externs externs.js --define DEBUG=false").stdout;
    compare("ClosureCompiler",size,new_src.length);
    size = new_src.length;

    new_src = SMERT(new_src.toString())
    compare("SMERT",size,new_src.length);

    files[file] = new_src;
}

function processShader(file) {
    console.log(">>> "+file);
    var size = getSize("src/"+file);
    compare("Start",size);
    
    run("tools/shader_minifier.exe --format none --field-names rgba --preserve-externals src/"+file+" -o build/tmp").stdout;
    var new_src = fs.readFileSync("build/tmp");

    compare("ShaderMinifier",size,new_src.length);

    files[file] = new_src.toString();
}

function inline_r(file) {
    var contents = files[file];
    if (contents == null) {
        console.log("ERROR! "+file+" not processed.");
        process.exit();
    }

    return contents.replace(/INLINE\("([^"]*)"\)/g,function(_,inlined_file) {
        if (file.endsWith(".js"))
            return '"'+inline_r(inlined_file)+'"';
        else
            return inline_r(inlined_file);
    });
}

function processFinal(file) {
    files[file] = fs.readFileSync("src/"+file).toString();

    console.log(">>> "+file);
    var size = 0;
    for (var k in files) {
        size += files[k].length;
    }
    compare("Total",size);
    
    var new_src = inline_r(file);
    compare("Inline",size,new_src.length);
    fs.writeFileSync("build/"+file,new_src);
    size = new_src.length;

    run("tools/advzip --add -4 -i 100 build/entry.zip build/"+file);
    compare("AdvZip",size,getSize("build/entry.zip"));
}

processShader("null.vert");
processShader("march.frag");

processJs("main.js");

processFinal("index.html");
