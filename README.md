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
    "@babel/polyfill": "^7.8.7",
    "axios": "^0.19.2",
    "backbone": "^1.4.0",
    "bootstrap": "^4.4.1",
    "d3": "^5.15.1",
    "jquery": "^3.4.1",
    "vue": "^2.6.11",
    "vue-router": "^3.1.6"
  }
}
```

config:
```js
const flatdep = require("flatdep");
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

```

print results:
```sh
[flatdep-test] Module Tree:
┌───────────────────┬─────────┬────────┐
│ Module Name       │ Version │ Status │
├───────────────────┼─────────┼────────┤
│ ├ @babel/polyfill │ 7.8.7   │        │
│ ├ axios           │ 0.19.2  │        │
│ ├ backbone        │ 1.4.0   │        │
│ │ └ underscore    │ 1.10.2  │        │
│ ├ bootstrap       │ 4.4.1   │        │
│ ├ d3              │ 5.15.1  │        │
│ ├ jquery          │ 3.4.1   │ ignore │
│ ├ vue             │ 2.6.11  │        │
│ └ vue-router      │ 3.1.6   │        │
└───────────────────┴─────────┴────────┘
[flatdep-test] Module Files:
┌─────┬──────────────────────────────────────┬───────────┐
│ NO. │ Files (../node_modules)              │      Size │
├─────┼──────────────────────────────────────┼───────────┤
│   1 │ @babel/polyfill/dist/polyfill.min.js │  96.98 KB │
│   2 │ axios/dist/axios.min.js              │  13.67 KB │
│   3 │ underscore/underscore.js             │  58.66 KB │
│   4 │ backbone/backbone.js                 │  75.97 KB │
│   5 │ bootstrap/dist/css/bootstrap.min.css │ 155.78 KB │
│   6 │ bootstrap/dist/js/bootstrap.min.js   │   58.6 KB │
│   7 │ d3/dist/d3.min.js                    │ 242.04 KB │
│   8 │ vue/dist/vue.min.js                  │  91.47 KB │
│   9 │ vue-router/dist/vue-router.min.js    │   25.8 KB │
└─────┴──────────────────────────────────────┴───────────┘
```

# Test

```sh
node test.js
```

# Changelog

- v1.1.2
    - fixed browser override and path

- v1.1.1
    - fixed link module

- v1.1.0
    - added exclude/include
