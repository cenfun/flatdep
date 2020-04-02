const flatdep = require("./");
const dep = flatdep({
    packageJsonPath: "../nmls"
});

console.log(dep);