var child_process = require("child_process");
var fs = require("fs");

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

function compare(a,b) {
    var delta = (b - a);

    var str = a + "b -> " + b + "b ( " + delta + "b / " + ((delta/a)*100).toFixed(2) + "% )";
    return str;
}

function runClosureCompiler(file) {
    run("java -jar tools/closure-compiler.jar --js src/"+file+" --js_output_file build/"+file+" --compilation_level ADVANCED_OPTIMIZATIONS");
    console.log("ClosureCompiler( "+file+" ) :: "+compare(getSize("src/"+file),getSize("build/"+file)));
}

function runAdvZip(files) {
    var size=0;
    files.forEach((file)=>{size+=getSize("build/"+file);});

    run("tools/advzip --add -4 build/entry.zip build/"+files.join(" build/"));
    console.log("AdvZip( "+files.join(", ")+" ) :: "+compare(size,getSize("build/entry.zip")));
}

// Copy index.html
fs.writeFileSync("build/index.html",fs.readFileSync("src/index.html"));

runClosureCompiler("main.js");

runAdvZip(["index.html","main.js"]);