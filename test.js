const flatdep = require("./");
const d = flatdep({
    //stop log message
    silent: false,
    //project entry path (package.json folder)
    entry: "../flatdep-test",
    //target runtime path to files
    target: "../flatdep-test/demo",
    //node_modules path to detect dependencies
    nodeModules: "",
    //exclude/include modules
    exclude: ["jquery"],
    include: [],
    //override module config
    overrides: {
        "@babel/polyfill": {
            main: "dist/polyfill.min.js",
            dependencies: null
        },
        axios: {
            main: "dist/axios.min.js",
            browser: null,
            dependencies: null
        },
        bootstrap: {
            main: ["dist/css/bootstrap.min.css", "dist/js/bootstrap.min.js"]
        },
        d3: {
            main: "dist/d3.min.js",
            dependencies: null
        },
        jquery: {
            main: "dist/jquery.min.js"
        },
        vue: {
            main: "dist/vue.min.js"
        },
        "vue-router": {
            main: "dist/vue-router.min.js"
        }
    }
});
if (d.error) {
    console.log(d.error);
}
//console.log(d.modules);
//console.log(d.files);
flatdep.print(d);
