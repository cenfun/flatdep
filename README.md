# flatdep

A tool to generate flat dependencies files

# Install

```sh
npm i flatdep
```

# Usage

package.json:
```json
{
    "name": "flatdep-test",
    "version": "1.0.0",
    "description": "",
    "main": "index.js",
    "dependencies": {
        "@babel/polyfill": "^7.12.1",
        "axios": "^0.21.1",
        "backbone": "^1.4.0",
        "bootstrap": "^5.0.1",
        "d3": "^6.7.0",
        "gauge": "^4.0.0",
        "jquery": "^3.6.0",
        "vue": "^2.6.12",
        "vue-router": "^3.5.1"
    },
    "devDependencies": {}
}
```

config:
```js
const flatdep = require('flatdep');
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
            main: 'dist/vue.min.js'
        },
        'vue-router': {
            main: 'dist/vue-router.min.js'
        }
    }
});
if (d.error) {
    console.log(d.error);
}
console.log(d.modules);
//console.log(d.files);
flatdep.print(d);
```
see test [test/test.js](test/test.js)

print results:
```sh
[flatdep-test] Module Tree:
┌───────────────────┬─────────┬─────────┐
│ Module Name       │ Version │ Status  │
├───────────────────┼─────────┼─────────┤
│ ├ @babel/polyfill │ 7.12.1  │         │
│ ├ axios           │ 0.21.4  │         │
│ ├ backbone        │ 1.4.0   │         │
│ │ └ underscore    │ 1.13.1  │         │
│ ├ bootstrap       │ 5.1.3   │         │
│ ├ d3              │ 6.7.0   │         │
│ ├ gauge           │ 4.0.0   │         │
│ ├ jquery          │ 3.6.0   │ ignored │
│ ├ vue             │ 2.6.14  │         │
│ └ vue-router      │ 3.5.3   │         │
└───────────────────┴─────────┴─────────┘
[flatdep-test] Module Files:
┌─────┬──────────────────────────────────────┬───────────┐
│ NO. │ Files (../node_modules)              │      Size │
├─────┼──────────────────────────────────────┼───────────┤
│   1 │ @babel/polyfill/dist/polyfill.min.js │  96.95 KB │
│   2 │ axios/dist/axios.min.js              │  18.71 KB │
│   3 │ underscore/underscore-umd.js         │  66.82 KB │
│   4 │ backbone/backbone.js                 │  75.97 KB │
│   5 │ bootstrap/dist/css/bootstrap.min.css │ 160.03 KB │
│   6 │ bootstrap/dist/js/bootstrap.min.js   │  57.83 KB │
│   7 │ d3/dist/d3.min.js                    │ 264.34 KB │
│   8 │ gauge/lib/index.js                   │   7.13 KB │
│   9 │ vue/dist/vue.min.js                  │  91.94 KB │
│  10 │ vue-router/dist/vue-router.min.js    │  28.52 KB │
└─────┴──────────────────────────────────────┴───────────┘
```

# Changelog

- v1.1.9
    - fixed main is dir, should support dir/index.js

- v1.1.7
    - added checking for mismatched version

- v1.1.6
    - refactor for browser property

- v1.1.5
    - added log for module config not found

- v1.1.4
    - fixed option when call getModuleFiles API
    - output initOption API

- v1.1.2
    - fixed browser override and path

- v1.1.1
    - fixed link module

- v1.1.0
    - added exclude/include
