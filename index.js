const fs = require("fs");
const path = require("path");
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

const toBytes = function (bytes) {

    bytes = Math.max(bytes, 0);

    var k = 1024;
    if (bytes < k) {
        return `${bytes} B`;
    }
    var m = k * k;
    if (bytes < m) {
        var mStr = `${Math.round(bytes / k * 100) / 100} KB`;
        if (bytes < 200 * k) {
            return mStr;
        }
        return CGS.yellow(mStr);
    }
    var g = m * k;
    if (bytes < g) {
        var gStr = `${Math.round(bytes / m * 100) / 100} MB`;
        return CGS.red(gStr);
    }
    var t = g * k;
    if (bytes < t) {
        var tStr = `${Math.round(bytes / g * 100) / 100} GB`;
        return CGS.red(tStr);
    }

    return bytes;
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

const addLog = function (msg, option) {
    if (option.silent) {
        return;
    }
    console.log(msg);
};

//=====================================================================================

const addModuleFiles = function (name, files, option) {
    if (option.ignores.includes(name)) {
        return false;
    }
    if (!isList(files)) {
        return false;
    }
    option.moduleFiles[name] = files;
    return true;
};

const getModuleDependencies = function (moduleConf, option) {
    let dependencies = [];
    if (moduleConf.dependencies) {
        dependencies = Object.keys(moduleConf.dependencies);
    }
    if (typeof (option.onDependencies) === "function") {
        dependencies = option.onDependencies(dependencies, moduleConf, option);
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
        addLog(CGS.red("ERROR: Not found file: " + absMainPath), option);
        return;
    }

    //relative path
    var filePath = path.relative(option.target, absMainPath);
    filePath = formatPath(filePath);
    return filePath;
};

const filterFileList = function (files, modulePath, option) {
    files = files.map(file => getModuleFilePath(modulePath, file, option));
    files = files.filter(item => item);
    return files;
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
    files = filterFileList(files, modulePath, option);
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
    let files;
    //array and string case 
    //"browser": "d3.js"
    if (Array.isArray(browser)) {
        files = browser;
    } else if (typeof (browser) === "string") {
        files = [browser];
    }
    if (files) {
        files = filterFileList(files, modulePath, option);
        if (files.length) {
            return files;
        }
    }
    //object case, require handle module name
    let hasFiles = false;
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
        const done = addModuleFiles(name, [filePath], option);
        if (done) {
            hasFiles = true;
        }
    });
    if (hasFiles) {
        //browser files already added to global moduleFiles, so just return empty array
        return [];
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
    //only handle array and string, not object (for merge)
    if (Array.isArray(override)) {
        files = override;
    } else if (typeof (override) === "string") {
        files = [override];
    }
    if (files) {
        files = filterFileList(files, modulePath, option);
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
        return files;
    }
    files = getModuleMainFiles(moduleName, modulePath, moduleConf, option);
    if (!isList(files)) {
        addLog(CGS.yellow("WARN: Not found module file(s) in " + moduleName + "/package.json, check fields 'browser' or 'main'."), option);
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
        addLog(CGS.red("ERROR: Failed to read: " + depItemJsonPath), option);
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

    var modulePath = path.resolve(option.nodeModules, moduleName);
    var moduleConf = getModuleConf(modulePath, option);
    if (!moduleConf) {
        return;
    }

    const moduleInfo = {
        name: moduleConf.name,
        version: moduleConf.version
    };

    //already done
    if (option.moduleMap[moduleName]) {
        moduleInfo.deduped = true;
        return moduleInfo;
    }

    //cache module info first 
    option.moduleMap[moduleName] = true;

    //ignore module from option.ignores
    if (option.ignores.includes(moduleName)) {
        moduleInfo.ignore = true;
        return moduleInfo;
    }

    //get subs before module files
    const subs = getModuleSubs(moduleName, moduleConf, option);
    if (subs) {
        moduleInfo.subs = subs;
    }

    //require files
    let files = getModuleFiles(moduleName, modulePath, moduleConf, option);
    if (typeof (option.onFiles) === "function") {
        files = option.onFiles(files, moduleConf, option);
    }
    moduleInfo.files = files;
    const done = addModuleFiles(moduleName, files, option);
    if (!done) {
        //ignore no files
        moduleInfo.ignore = true;
    }
    return moduleInfo;
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

    const moduleFiles = option.moduleFiles;
    const modules = Object.keys(moduleFiles);
    const files = [];
    Object.values(moduleFiles).forEach(list => {
        if (isList(list)) {
            list.forEach(item => files.push(item));
        }
    });

    Object.assign(option.data, {
        name: option.name,
        entry: option.entry,
        target: option.target,
        nodeModules: option.nodeModules,
        modules: modules,
        files: files,
        moduleFiles: moduleFiles,
        moduleTree: moduleTree
    });

};

//=====================================================================================

const getOption = function (option) {
    return Object.assign({
        silent: true,
        entry: process.cwd(),
        target: "",
        nodeModules: "",
        ignores: [],
        overrides: {},
        onDependencies: function (dependencies, moduleConf, option) {
            return dependencies;
        },
        onFiles: function (files, moduleConf, option) {
            return files;
        }
    }, option, {
        moduleConf: {},
        moduleMap: {},
        moduleFiles: {},
        data: {}
    });
};

const getNodeModulesPath = function (option) {
    //init node_modules path
    let nodeModules = option.nodeModules;
    if (!nodeModules) {
        nodeModules = option.entry;
    }
    if (path.basename(nodeModules) !== "node_modules") {
        //Double insurance
        let i = 0;
        //detect child and parents
        while (!fs.existsSync(path.resolve(nodeModules, "node_modules"))) {
            const parent = path.resolve(nodeModules, "../");
            if (parent === nodeModules || i > 10) {
                break;
            }
            nodeModules = parent;
            i += 1;
        }
        nodeModules = path.resolve(nodeModules, "node_modules");
    }
    nodeModules = formatPath(path.relative(option.cwd, nodeModules));
    return nodeModules;
};

const getTargetPath = function (option) {
    let target = option.target;
    if (!target) {
        target = option.entry;
    }
    return target;
};

const flatdep = function (option) {
    option = getOption(option);
    option.cwd = process.cwd();

    //init package json path
    let entry = path.resolve(option.entry);
    if (!fs.existsSync(entry)) {
        option.data.error = "ERROR: Not found: " + entry;
        return option.data;
    }

    const pj = fs.statSync(entry);
    if (pj.isFile()) {
        entry = path.dirname(entry);
    }
    entry = formatPath(path.relative(option.cwd, entry));
    //read module config
    const moduleConf = getModuleConf(entry, option);
    if (!moduleConf) {
        option.data.error = "ERROR: Failed to read: " + entry;
        return option.data;
    }
    option.entry = entry;

    option.name = moduleConf.name;
    //merge browser as overrides
    if (moduleConf.browser) {
        option.overrides = Object.assign({}, moduleConf.browser, option.overrides);
    }

    option.target = getTargetPath(option);

    const nodeModules = getNodeModulesPath(option);
    if (!fs.existsSync(nodeModules)) {
        option.data.error = "ERROR: Not found: " + nodeModules;
        return option.data;
    }
    option.nodeModules = nodeModules;

    generateDependencies(moduleConf, option);

    return option.data;
};

flatdep.consoleGrid = consoleGrid;
flatdep.CGS = CGS;
flatdep.printModuleTree = function (data) {
    if (!data || !data.moduleTree) {
        console.log(CGS.red("ERROR: Invalid print data."));
        return;
    }

    console.log(CGS.cyan("[" + data.name + "]") + " Module Tree:");
    const moduleTree = JSON.parse(JSON.stringify(data.moduleTree));
    consoleGrid.render({
        rows: moduleTree,
        columns: [{
            id: "name",
            name: "Module Name"
        }, {
            id: "version",
            name: "Version"
        }, {
            id: "name",
            name: "Status",
            formatter: function (v, item) {
                if (item.ignore) {
                    return CGS.yellow("ignore");
                }
                if (item.deduped) {
                    return "deduped";
                }
                return "";
            }
        }]
    });
};

flatdep.printModuleFiles = function (data) {
    if (!data || !data.files) {
        console.log(CGS.red("ERROR: Invalid print data."));
        return;
    }

    console.log(CGS.cyan("[" + data.name + "]") + " Module Files:");
    const files = JSON.parse(JSON.stringify(data.files));

    const rows = files.map(item => {
        let p = path.resolve(data.target, item);
        let file = formatPath(path.relative(data.nodeModules, p));
        let size;
        if (fs.existsSync(p)) {
            size = fs.statSync(p).size;
            size = toBytes(size);
        }
        return {
            file: file,
            size: size
        };
    });

    consoleGrid.render({
        rows: rows,
        columns: [{
            id: "cg_index",
            name: "NO.",
            align: "right",
            formatter: function (v) {
                return v + 1;
            }
        }, {
            id: "file",
            name: "Files (" + formatPath(path.relative(data.target, data.nodeModules)) + ")",
            maxWidth: 80
        }, {
            id: "size",
            name: "Size",
            align: "right"
        }]
    });
};

flatdep.print = function (data) {
    flatdep.printModuleTree(data);
    flatdep.printModuleFiles(data);
};

module.exports = flatdep;