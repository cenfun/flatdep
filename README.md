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
    silent: false,
    packageJsonPath: "../flatdep-test",
    nodeModulesPath: "",
    ignores: ["jquery-ui"],
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
//require("fs").writeFileSync(".temp/module-tree.json", JSON.stringify(d, null, 4));
//console.log(d.modules);
//console.log(d.files);
flatdep.print(d);
```

# Test

```sh
node test.js
```
