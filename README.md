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
        "axios": "^0.27.2",
        "backbone": "^1.4.1",
        "bootstrap": "^5.2.0",
        "d3": "^7.6.1",
        "gauge": "^4.0.4",
        "jquery": "^3.6.0",
        "react": "^18.2.0",
        "vue": "^3.2.37"
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
```
see test [test/test.js](test/test.js)

print results:
```sh
[flatdep-test] Module Tree:
┌───────────────────┬─────────┬─────────┐
│ Module Name       │ Version │ Status  │
├───────────────────┼─────────┼─────────┤
│ ├ @babel/polyfill │ 7.12.1  │         │
│ ├ axios           │ 0.27.2  │         │
│ ├ backbone        │ 1.4.1   │         │
│ │ └ underscore    │ 1.13.4  │         │
│ ├ bootstrap       │ 5.2.0   │         │
│ ├ d3              │ 7.6.1   │         │
│ ├ gauge           │ 4.0.4   │         │
│ ├ jquery          │ 3.6.0   │ ignored │
│ ├ react           │ 18.2.0  │         │
│ └ vue             │ 3.2.37  │         │
└───────────────────┴─────────┴─────────┘
[flatdep-test] Module Files:
┌─────┬──────────────────────────────────────┬───────────┐
│ NO. │ Files (../node_modules)              │      Size │
├─────┼──────────────────────────────────────┼───────────┤
│   1 │ @babel/polyfill/dist/polyfill.min.js │  96.95 KB │
│   2 │ axios/dist/axios.min.js              │  20.28 KB │
│   3 │ underscore/underscore-umd.js         │  66.81 KB │
│   4 │ backbone/backbone.js                 │  76.35 KB │
│   5 │ bootstrap/dist/css/bootstrap.min.css │ 190.14 KB │
│   6 │ bootstrap/dist/js/bootstrap.min.js   │   58.7 KB │
│   7 │ d3/dist/d3.min.js                    │ 272.05 KB │
│   8 │ gauge/lib/index.js                   │   7.12 KB │
│   9 │ react/umd/react.production.min.js    │  10.49 KB │
│  10 │ vue/dist/vue.runtime.global.prod.js  │  82.45 KB │
└─────┴──────────────────────────────────────┴───────────┘
```

# CHANGELOG

- v1.1.10
    - update deps

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
