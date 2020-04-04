const flatdep = require("./");
flatdep({
    silent: false,
    packageJsonPath: "./",
    nodeModulesPath: "",
    ignores: ["jquery-ui"],
    overrides: {
        jquery: {
            main: "dist/jquery.min.js"
        }
    }
}).then(function (d) {

    //require("fs").writeFileSync(".temp/module-tree.json", JSON.stringify(d, null, 4));

    //console.log(d.modules);
    //console.log(d.files);

    flatdep.print(d);

}, function (e) {
    console.log(e);
});