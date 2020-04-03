const flatdep = require("./");
flatdep({
    silent: false,
    packageJsonPath: "../flatdep-test",
    nodeModulesPath: "",
    overrides: {
        i18next: "",
        xlsx: {
            dependencies: null
        },
        vue: "dist/vue.min.js"
    }
}).then(function (d) {
    console.log(d);
}, function (e) {
    console.log(e);
});