const fs = require("fs");
const path = require("path");

const isList = function(data) {
    if (data && data instanceof Array && data.length > 0) {
        return true;
    }
    return false;
};

const inList = function(item, list) {
    if (!isList(list)) {
        return false;
    }
    for (let i = 0, l = list.length; i < l; i++) {
        if (list[i] === item) {
            return true;
        }
    }
    return false;
};


const forEachFile = function(p, extList, callback) {
    const list = fs.readdirSync(p);
    list.forEach(function(fileName) {
        const info = fs.statSync(`${p}/${fileName}`);
        if (info.isDirectory()) {
            forEachFile(`${p}/${fileName}`, extList, callback);
        } else {
            const extname = path.extname(fileName);
            if (!extList.length || inList(extname, extList)) {
                callback(fileName, p);
            }
        }
    });
};


forEachFile("../../Projects/", [".json"], function(filename, filepath) {
    if (filename !== "package.json") {
        return;
    }

    const p = path.resolve(filepath, filename);

    const json = require(p);

    if (json.browser && !json.main) {
        if (fs.existsSync(path.resolve(filepath, "index.js"))) {
            return;
        }
        console.log(p);
    }
});