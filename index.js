const fs = require("fs");
const path = require("path");
const assert = require("assert");
const ConsoleGrid = require("console-grid");
const CGS = ConsoleGrid.Style;
const consoleGrid = new ConsoleGrid();

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

//=====================================================================================

const getModuleDependencies = function (moduleConf, option) {
    const moduleName = moduleConf.name;
    let dependencies = [];
    if (moduleConf.dependencies) {
        dependencies = Object.keys(moduleConf.dependencies);
    }
    if (typeof (option.onDependencies) === "function") {
        dependencies = option.onDependencies(dependencies, moduleName);
    }
    return dependencies;
};

const getModuleFilePath = function (modulePath, file, option) {
    //absolute path
    var absMainPath = path.resolve(modulePath, file);
    //if no extname and add .js exists 
    if (!fs.existsSync(absMainPath) && !path.extname(absMainPath)) {
        absMainPath += ".js";
    }
    if (!fs.existsSync(absMainPath)) {
        return;
    }
    //relative path
    var filePath = path.relative(option.packageJsonPath, absMainPath);
    filePath = formatPath(filePath);
    return filePath;
};

const getModuleMainFiles = function (moduleName, modulePath, moduleConf, option) {
    //https://docs.npmjs.com/files/package.json#main
    let files = [];
    var main = moduleConf.main;
    if (main) {
        if (Array.isArray(main)) {
            files = main;
        } else if (typeof (main) === "string") {
            files = [main];
        }
    }
    //es module, seems not stage
    if (!files.length && moduleConf.module) {
        files = [moduleConf.module + ""];
    }
    //default to index.js
    if (!files.length) {
        files = ["index.js"];
    }
    files = files.map(file => getModuleFilePath(modulePath, file, option));
    files = files.filter(item => item);
    return files;
};

const getModuleBrowserFiles = function (moduleName, modulePath, moduleConf, option) {
    //https://docs.npmjs.com/files/package.json#browser
    //If your module is meant to be used client-side 
    //the browser field should be used instead of the main field. 
    //This is helpful to hint users that it might rely on primitives that aren’t available in Node.js modules.
    const browser = moduleConf.browser;
    if (!browser) {
        return;
    }
    //object for browser
    let files = [];
    Object.keys(browser).forEach(function (name) {
        let file = browser[name];
        if (!file) {
            return;
        }
        const filePath = getModuleFilePath(modulePath, file, option);
        if (!filePath) {
            return;
        }
        //cache browser modules
        option.moduleFiles[name] = [filePath];
        files.push(filePath);
    });
    if (files.length) {
        return files;
    }
};

const getModuleOverrideFiles = function (moduleName, modulePath, moduleConf, option) {
    if (!option.overrides.hasOwnProperty(moduleName)) {
        return;
    }
    const override = option.overrides[moduleName];
    if (!override) {
        return [];
    }
    let files;
    //only handle array and string, not object
    if (Array.isArray(override)) {
        files = override;
    } else if (typeof (override) === "string") {
        files = [override];
    }
    if (files) {
        files = files.map(file => getModuleFilePath(modulePath, file, option));
        files = files.filter(item => item);
        if (files.length) {
            return files;
        }
    }
};

const getModuleFiles = function (moduleName, modulePath, moduleConf, option) {
    let files = getModuleOverrideFiles(moduleName, modulePath, moduleConf, option);
    if (files) {
        return files;
    }
    files = getModuleBrowserFiles(moduleName, modulePath, moduleConf, option);
    if (files) {
        //browser files already added
        return [];
    }
    files = getModuleMainFiles(moduleName, modulePath, moduleConf, option);
    if (!isList(files)) {
        console.log(CGS.yellow("WARN: Not found module file(s) in " + moduleName + "/package.json, check fields 'browser' or 'main'."));
    }
    return files;
};

const getModuleSubs = function (moduleName, moduleConf, option) {

    const dependencies = getModuleDependencies(moduleConf, option);
    if (!isList(dependencies)) {
        return;
    }
    const subs = [];
    dependencies.forEach(function (subName) {
        let subInfo = getModuleInfo(subName, option);
        if (subInfo) {
            subs.push(subInfo);
        }
    });
    return subs;
};

const getModuleConf = function (modulePath, option) {
    //cache conf
    const conf = option.moduleConf[modulePath];
    if (conf) {
        return conf;
    }
    const depItemJsonPath = path.resolve(modulePath, "package.json");
    let moduleConf = readJSONSync(depItemJsonPath);
    if (!moduleConf) {
        if (!option.silent) {
            console.log(CGS.red("ERROR: Failed to read: " + depItemJsonPath));
        }
        return;
    }
    //merge overrides if object
    const override = option.overrides[moduleConf.name];
    if (override && typeof (override) === "object" && !(override instanceof Array)) {
        //deep merge
        moduleConf = Object.assign(moduleConf, override);
    }
    option.moduleConf[modulePath] = moduleConf;
    return moduleConf;
};

const getModuleInfo = function (moduleName, option) {

    var modulePath = path.resolve(option.nodeModulesPath, moduleName);
    var moduleConf = getModuleConf(modulePath, option);
    if (!moduleConf) {
        return;
    }

    const moduleInfo = {
        name: moduleConf.name,
        version: moduleConf.version,
        deduped: ""
    };

    //already done
    if (option.moduleMap[moduleName]) {
        moduleInfo.deduped = "deduped";
        return moduleInfo;
    }

    //cache module info first 
    option.moduleMap[moduleName] = true;

    //get subs before module files
    const subs = getModuleSubs(moduleName, moduleConf, option);
    if (subs) {
        moduleInfo.subs = subs;
    }

    //require files
    const files = getModuleFiles(moduleName, modulePath, moduleConf, option);
    moduleInfo.files = files;
    if (isList(files)) {
        option.moduleFiles[moduleName] = files;
    }
    return moduleInfo;
};

const showModuleTree = function (moduleTree, option) {
    if (option.silent) {
        return;
    }
    console.log("Module Tree:");
    consoleGrid.render({
        rows: moduleTree,
        columns: [{
            id: "name",
            name: "Module Name"
        }, {
            id: "version",
            name: "Version"
        }, {
            id: "deduped",
            name: "Deduped"
        }]
    });
};

const generateDependencies = function (moduleConf, option) {

    const moduleTree = [];
    //generate dependencies
    const moduleDependencies = getModuleDependencies(moduleConf, option);
    if (isList(moduleDependencies)) {
        moduleDependencies.forEach(function (moduleName) {
            const info = getModuleInfo(moduleName, option);
            if (info && !info.deduped) {
                moduleTree.push(info);
            }
        });
    }

    showModuleTree(JSON.parse(JSON.stringify(moduleTree)), option);

    const moduleFiles = option.moduleFiles;
    const modules = Object.keys(moduleFiles);
    const files = [];
    Object.values(moduleFiles).forEach(list => {
        if (isList(list)) {
            list.forEach(item => files.push(item));
        }
    });

    return {
        modules: modules,
        files: files,
        moduleFiles: moduleFiles,
        moduleTree: moduleTree
    };

};

//=====================================================================================

const getOption = function (option) {
    return Object.assign({
        silent: true,
        packageJsonPath: process.cwd(),
        nodeModulesPath: "",
        overrides: {},
        onDependencies: function (dependencies, moduleName) {
            return dependencies;
        }
    }, option, {
        moduleConf: {},
        moduleMap: {},
        moduleFiles: {}
    });
};

module.exports = async (option) => {
    option = getOption(option);

    //init package json path
    let packageJsonPath = path.resolve(option.packageJsonPath);

    assert(fs.existsSync(packageJsonPath), "ERROR: Not found: " + packageJsonPath);

    const pj = fs.statSync(packageJsonPath);
    if (pj.isFile()) {
        packageJsonPath = path.dirname(packageJsonPath);
    }
    //console.log("packageJsonPath: " + packageJsonPath);

    //init node_modules path
    let nodeModulesPath = option.nodeModulesPath;
    if (!nodeModulesPath) {
        nodeModulesPath = packageJsonPath;
    }
    if (path.basename(nodeModulesPath) !== "node_modules") {
        nodeModulesPath = path.resolve(nodeModulesPath, "node_modules");
    }

    assert(fs.existsSync(nodeModulesPath), "ERROR: Not found node_modules: " + nodeModulesPath);

    option.nodeModulesPath = nodeModulesPath;
    //console.log("nodeModulesPath: " + nodeModulesPath);

    //read module config
    const moduleConf = getModuleConf(packageJsonPath, option);
    assert(moduleConf, "ERROR: Failed to read: " + packageJsonPath);

    //merge browser as overrides
    if (moduleConf.browser) {
        option.overrides = Object.assign({}, moduleConf.browser, option.overrides);
    }

    return generateDependencies(moduleConf, option);
};