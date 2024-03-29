const flatdep = require('../lib');
const d = flatdep({
    //stop log message
    silent: false,
    //no browser
    noBrowser: false,
    //project entry path (package.json folder)
    entry: './flatdep-test',
    //target runtime path to files
    target: './flatdep-test/demo',
    //node_modules path to detect dependencies
    nodeModules: '',
    //exclude/include modules
    exclude: ['jquery'],
    include: [],
    //override module config
    overrides: {
        '@babel/polyfill': {
            main: 'dist/polyfill.min.js',
            dependencies: null
        },
        axios: {
            main: 'dist/axios.min.js',
            browser: null,
            dependencies: null
        },
        bootstrap: {
            main: ['dist/css/bootstrap.min.css', 'dist/js/bootstrap.min.js']
        },
        d3: {
            main: 'dist/d3.min.js',
            dependencies: null
        },
        gauge: {
            dependencies: null
        },
        jquery: {
            main: 'dist/jquery.min.js'
        },
        vue: {
            dependencies: {},
            main: 'dist/vue.runtime.global.prod.js'
        },
        react: {
            dependencies: {},
            main: 'umd/react.production.min.js'
        }
    }
});
if (d.error) {
    console.log(d.error);
}
console.log(d.modules);
//console.log(d.files);
flatdep.print(d);

const fs = require('fs');
fs.writeFileSync('test-info.json', JSON.stringify(d, null, 4));
