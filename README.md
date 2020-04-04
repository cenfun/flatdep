# flatdep

Tool to generate flat dependencies files

# Install

```sh
npm i flatdep
```

# Usage

```js
const flatdep = require("flatdep");
flatdep({
  silent: false,
  packageJsonPath: "./",
  nodeModulesPath: "",
  ignores: ["jquery-ui"],
  overrides: {
    jquery: {
      main: "dist/jquery.min.js",
    },
  },
}).then(
  function (d) {
    //console.log(d.modules);
    //console.log(d.files);
    flatdep.print(d);
  },
  function (e) {
    console.log(e);
  }
);
```

# Test

```sh
node test.js
```
