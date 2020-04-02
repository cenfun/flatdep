const fs = require("fs");
const path = require("path");

// \ to /
const formatPath = function (str) {
    if (str) {
        str = str.replace(/\\/g, "/");
    }
    return str;
};

const isList = function (data) {
    if (data && data instanceof Array && data.length > 0) {
        return true;
    }
    return false;
};

const getValue = function (data, dotPathStr, defaultValue) {
    if (!dotPathStr) {
        return defaultValue;
    }
    var current = data;
    var list = (dotPathStr + "").split(".");
    var lastKey = list.pop();
    while (current && list.length) {
        var item = list.shift();
        current = current[item];
    }
    if (current && current.hasOwnProperty(lastKey)) {
        var value = current[lastKey];
        if (typeof (value) !== "undefined") {
            return value;
        }
    }
    return defaultValue;
};

const jsonMerge = function (a, b) {
    if (a && b) {
        for (let k in b) {
            let v = b[k];
            if (typeof (v) === "object") {
                a[k] = Object.assign(a[k], v);
            } else {
                a[k] = v;
            }
        }
    }
    return a;
};

const readFileContentSync = function (filePath) {
    var content = null;
    var isExists = fs.existsSync(filePath);
    if (isExists) {
        content = fs.readFileSync(filePath);
        if (Buffer.isBuffer(content)) {
            content = content.toString('utf8');
        }
    }
    return content;
};

const readJSONSync = function (filePath) {
    var content = readFileContentSync(filePath);
    var json = null;
    if (content) {
        json = JSON.parse(content);
    }
    return json;
};

const forEachTree = function (tree, callback) {
    if (!tree) {
        return;
    }
    Object.keys(tree).forEach(function (item) {
        forEachTree(tree[item], callback);
        callback(item);
    });
};

//=====================================================================================

const getModuleDependencies = function (dependencies, moduleName, option) {

    var overrideDeps = null;
    var overrideConf = option.overrides[moduleName];
    if (overrideConf && overrideConf.dependencies) {
        overrideDeps = overrideConf.dependencies;
    }
    //console.log(moduleName, overrideDeps);
    var deps = overrideDeps || dependencies;
    if (!deps) {
        return [];
    }

    var list = Object.keys(deps);
    return list;
};

const getModuleOutput = function (field, moduleName, moduleConf, moduleInfo) {

    //https://docs.npmjs.com/files/package.json#main
    //https://docs.npmjs.com/files/package.json#browser

    //If your module is meant to be used client-side
    //the browser field should be used instead of the main field.
    var output = getValue(moduleConf, field);
    if (!output) {
        return [];
    }

    if (isList(output)) {
        return output;
    }
    if (typeof (output) === "string") {
        return [output];
    }

    //object for browser
    var list = [];
    Object.keys(output).forEach(function (k) {
        let value = output[k];
        if (!value) {
            return;
        }
        moduleInfo[k] = {};
        list.push(value);
    });
    return list;

};

const getModuleFiles = function (moduleName, moduleConf, moduleInfo, option) {

    if (option.overrides.hasOwnProperty(moduleName)) {
        var override = option.overrides[moduleName];
        if (!override) {
            return;
        }
        if (typeof (override) === "string") {
            return [override];
        }
        if (isList(override)) {
            return override;
        }
        if (typeof (override) === "object") {
            moduleConf = jsonMerge(moduleConf, override);
        }
    }

    var files = getModuleOutput("browser", moduleName, moduleConf, moduleInfo);
    if (!files.length) {
        files = getModuleOutput("main", moduleName, moduleConf, moduleInfo);
    }
    return files;
};

const getModuleSubs = function (moduleName, moduleConf, option) {
    var cacheDeps = option.cacheDeps;
    var subList = getModuleDependencies(moduleConf.dependencies, moduleName, option);
    if (!subList.length) {
        return {};
    }
    var moduleDependencies = {};
    for (var i = 0, l = subList.length; i < l; i++) {
        var subName = subList[i];
        var subInfo = getModuleInfo(subName, option);
        if (!subInfo) {
            return null;
        }
        //cache sub module info
        cacheDeps[subName] = subInfo;
        //append to parent module dependencies
        moduleDependencies[subName] = subInfo;
    }
    return moduleDependencies;
};


const getModuleInfo = function (moduleName, option) {
    var cacheDeps = option.cacheDeps;
    //loop module info from cache
    var moduleInfo = cacheDeps[moduleName];
    if (moduleInfo) {
        return moduleInfo;
    }

    var depItemPath = path.resolve(option.nodeModulesPath, moduleName);
    var depItemJsonPath = path.resolve(depItemPath, "package.json");
    var moduleConf = readJSONSync(depItemJsonPath);
    if (!moduleConf) {
        console.log("ERROR: Failed to load node_modules/" + moduleName + "/package.json");
        console.log("Maybe " + moduleName + " is a new dependency or broken in some way, try 'npm install'");
        return null;
    }

    //get module info
    moduleInfo = getModuleSubs(moduleName, moduleConf, option);

    //cache files, append browser as module deps
    var moduleFiles = getModuleFiles(moduleName, moduleConf, moduleInfo, option);
    if (!moduleFiles) {
        return null;
    }
    moduleFiles = moduleFiles.filter(function (item) {
        return item ? true : false;
    });

    //init files path
    if (!moduleFiles.length) {
        //use index.js if exists
        if (fs.existsSync(path.resolve(depItemPath, "index.js"))) {
            moduleFiles = ['index.js'];
        } else {
            console.log("WARN: Export file(s) not found in '" + moduleName + "' package.json, check fields 'browser' or 'main'. ");
        }
    }
    var files = [];
    moduleFiles.forEach(function (item) {
        //absolute path
        var absMainPath = path.resolve(depItemPath, item);
        //if no extname and add .js exists 
        if (!path.extname(absMainPath) && fs.existsSync(absMainPath + ".js")) {
            absMainPath += ".js";
        }
        //relative path
        var mainPath = path.relative(option.packageJsonPath, absMainPath);
        mainPath = formatPath(mainPath);
        //console.log(item, absMainPath, mainPath);
        files.push(mainPath);
    });

    option.moduleFiles[moduleName] = files;

    //cache module info
    cacheDeps[moduleName] = moduleInfo;

    return moduleInfo;
};

const generateDependencies = function (depList, option) {
    var depTree = {};
    for (var i = 0, l = depList.length; i < l; i++) {
        var moduleName = depList[i];
        var moduleInfo = getModuleInfo(moduleName, option);
        if (!moduleInfo) {
            return null;
        }
        depTree[moduleName] = moduleInfo;
    }

    var moduleFiles = option.moduleFiles;
    var files = [];
    var modules = [];

    var temp = {};
    forEachTree(depTree, function (item) {
        if (temp[item]) {
            return;
        }
        temp[item] = true;
        modules.push(item);
        var fileList = moduleFiles[item];
        if (fileList) {
            files = files.concat(fileList);
        }
    });

    var d = {
        modules: modules,
        files: files,
        moduleFiles: moduleFiles
    };

    //===============================================
    //console.log(d);
    //===============================================

    return d;
};

//=====================================================================================

const getOption = function (option) {
    return Object.assign({
        packageJsonPath: process.cwd(),
        nodeModulesPath: "",
        overrides: {}
    }, option, {
        cacheDeps: {},
        moduleFiles: {}
    });
};

module.exports = function (option) {
    option = getOption(option);

    //init package json
    let packageJsonPath = option.packageJsonPath;
    const pj = fs.statSync(packageJsonPath);
    if (pj.isDirectory()) {
        packageJsonPath = path.resolve(packageJsonPath, "package.json");
    }

    const json = readJSONSync(packageJsonPath);
    if (!json) {
        console.log("Failed to read package.json: " + packageJsonPath);
        return;
    }

    //init node_modules path
    let nodeModulesPath = option.nodeModulesPath;
    if (!nodeModulesPath) {
        nodeModulesPath = path.dirname(packageJsonPath);
    }

    if (path.basename(nodeModulesPath) !== "node_modules") {
        nodeModulesPath = path.resolve(nodeModulesPath, "node_modules");
    }

    if (!fs.existsSync(nodeModulesPath)) {
        console.log("Not found node_modules: " + nodeModulesPath);
        return;
    }
    option.nodeModulesPath = nodeModulesPath;

    //merge browser as overrides
    if (json.browser) {
        option.overrides = Object.assign({}, json.browser, option.overrides);
    }

    //generate dependencies
    const depList = Object.keys(json.dependencies);
    return generateDependencies(depList, option);
};