const flatdep = require("./");

let dep = flatdep({
    packageJsonPath: "../flatdep-test",
    nodeModulesPath: "",
    overrides: {
        vue: "dist/vue.min.js"
    }
});

console.log(dep);