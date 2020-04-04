# flatdep

A tool to generate flat dependencies files

# Install

```sh
npm i flatdep
```

# Usage

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
    exclude: ["jquery-ui"],
    include: ["animate.css"],
    //override module config
    overrides: {
        jquery: {
            main: "dist/jquery.min.js"
        },
        i18next: {
            dependencies: null
        },
        "pdf.js": {
            dependencies: null
        },
        xlsx: {
            dependencies: null
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

# Test

```sh
node test.js
```

# Changelog

- v1.1.1
    - fixed link module

- v1.1.0
    - added exclude/include
