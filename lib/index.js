const fs = require("fs");
const path = require("path");
const EC = require("eight-colors");
const semver = require("semver");
const ConsoleGrid = require("console-grid");
const consoleGrid = new ConsoleGrid();

const Util = require("./util.js");
//==================================================================================================

const addModuleFiles = function(name, files, option) {
    if (Util.isList(option.exclude) && option.exclude.includes(name)) {
        return false;
    }
    if (!Util.isList(files)) {
        return false;
    }
    if (!option.moduleFiles) {
        option.moduleFiles = {};
    }
    option.moduleFiles[name] = files;
    return true;
};

const getModuleDependencies = function(moduleConf, option) {
    let dependencies = [];
    if (moduleConf.dependencies) {
        dependencies = Object.keys(moduleConf.dependencies);
    }
    if (typeof(option.onDependencies) === "function") {
        dependencies = option.onDependencies(dependencies, moduleConf, option);
    }
    return dependencies;
};

const getAbsMainFilePath = function(modulePath, file, option) {

    //mainFiles: ['index']
    //extensions: ['.js', '.json', '.wasm'],
    
    //absolute path
    const mainPath = path.resolve(modulePath, file);
    if (fs.existsSync(mainPath)) {
        //is dir
        const stats = fs.lstatSync(mainPath);
        if (stats.isDirectory()) {
            return path.resolve(mainPath, "index.js");
        }
        return mainPath;
    }

    //no extname and add .js exists 
    if (!path.extname(file)) {
        const extPath = path.resolve(modulePath, `${file}.js`);
        if (fs.existsSync(extPath)) {
            return extPath;
        }
    }

    //try base on node modules 
    const nmPath = path.resolve(`${option.nodeModules}`, file);
    if (fs.existsSync(nmPath)) {
        return nmPath;
    }

    // const stats = fs.lstatSync(modulePath);
    // const isLink = stats.isSymbolicLink();
    // //do NOT check link
    // if (!isLink) {
    //     Util.addLog(EC.red(`ERROR: Not found file: ${absMainPath}`), option);
            
    // }

    return file;

};

const getModuleFilePath = function(modulePath, file, option) {
    const absMainPath = getAbsMainFilePath(modulePath, file, option);
    //relative path
    let filePath = path.relative(`${option.target}`, absMainPath);
    filePath = Util.formatPath(filePath);
    return filePath;
};

const filterFileList = function(files, modulePath, option) {
    files = files.map(file => getModuleFilePath(modulePath, file, option));
    files = files.filter(item => item);
    return files;
};

//==================================================================================================

const getModuleBrowserInfo = function(modulePath, moduleConf, option) {
    const info = {
        hasOverride: false,
        list: null
    };
    const browser = moduleConf.browser;
    if (!Util.isObj(browser)) {
        return info;
    }

    const list = [];
    //object case, require handle module name
    Object.keys(browser).forEach(function(name) {
        const item = browser[name];
        if (!item) {
            return;
        }
        const sub = {
            name: name,
            version: moduleConf.version
        };

        list.push(sub);

        let files = Util.toList(item).map(file => {
            return getModuleFilePath(modulePath, file, option);
        }).filter(item => item);

        if (typeof(option.onFiles) === "function") {
            files = option.onFiles(files, moduleConf, option);
        }
        const done = addModuleFiles(name, files, option);
        if (!done) {
            sub.ignored = true;
            return;
        }
        
        sub.files = files;

        if (name === moduleConf.name) {
            //browser files already added to global moduleFiles
            //only return if has override module in browser
            info.hasOverride = true;
        }

    });
    
    if (list.length) {
        info.list = list;
    }

    return info;
};

//==================================================================================================

const getModuleOverrideFiles = function(modulePath, moduleConf, option) {
    const moduleName = moduleConf.name;
    if (!option.overrides) {
        option.overrides = {};
    }
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
    } else if (typeof(override) === "string") {
        files = [override];
    }
    if (!files) {
        return;
    }
    files = filterFileList(files, modulePath, option);
    if (files.length) {
        return files;
    }
};

const getModuleBrowserFiles = function(modulePath, moduleConf, option) {
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
    } else if (typeof(browser) === "string") {
        files = [browser];
    }
    if (!files) {
        return;
    }
    files = filterFileList(files, modulePath, option);
    if (files.length) {
        return files;
    }
};

const getModuleMainFiles = function(modulePath, moduleConf, option) {
    //https://docs.npmjs.com/files/package.json#main
    let files = [];

    let main = moduleConf.main;
    if (option.esModule && moduleConf.module) {
        //esModule
        main = moduleConf.module;
    }

    if (main) {
        if (Array.isArray(main)) {
            files = main;
        } else if (typeof(main) === "string") {
            files = [main];
        }
    }

    //default to check ./
    if (!files.length) {
        files = ["./"];
    }
    files = filterFileList(files, modulePath, option);
    return files;
};

const getModuleFiles = function(modulePath, moduleConf, option) {
    //only handle array and string, not object
    let files = getModuleOverrideFiles(modulePath, moduleConf, option);
    if (files) {
        return files;
    }
    //array and string case 
    files = getModuleBrowserFiles(modulePath, moduleConf, option);
    if (files) {
        return files;
    }
    files = getModuleMainFiles(modulePath, moduleConf, option);
    return files;
};

//==================================================================================================

const generateModuleFiles = function(moduleName, option, moduleInfo, modulePath, moduleConf) {

    //mainFields: ['browser', 'module', 'main']

    //browser object case, require handle module name
    const { hasOverride, list } = getModuleBrowserInfo(modulePath, moduleConf, option);
    if (list) {
        if (!moduleInfo.subs) {
            moduleInfo.subs = [];
        }
        moduleInfo.subs = moduleInfo.subs.concat(list);
    }

    let files;
    if (hasOverride) {
        files = [];
    } else {
        //only for module self
        files = getModuleFiles(modulePath, moduleConf, option);
    }

    if (typeof(option.onFiles) === "function") {
        files = option.onFiles(files, moduleConf, option);
    }
    const done = addModuleFiles(moduleName, files, option);
    if (!done) {
        moduleInfo.ignored = true;
        return;
    }

    moduleInfo.files = files;
};

const getModuleSubs = function(moduleConf, option) {

    const dependencies = getModuleDependencies(moduleConf, option);
    if (!Util.isList(dependencies)) {
        return;
    }
    const subs = [];
    dependencies.forEach(function(subName) {
        const subInfo = getModuleInfo(subName, moduleConf.dependencies, option);
        if (subInfo) {
            subs.push(subInfo);
        }
    });
    return subs;
};

const getModuleConf = function(modulePath, option) {
    //cache conf
    if (!option.moduleConf) {
        option.moduleConf = {};
    }
    const conf = option.moduleConf[modulePath];
    if (conf) {
        return conf;
    }
    const depItemJsonPath = path.resolve(modulePath, "package.json");
    let moduleConf = Util.readJSONSync(depItemJsonPath);
    if (!moduleConf) {
        Util.addLog(EC.red(`ERROR: Failed to read: ${depItemJsonPath}`), option);
        return;
    }
    //merge overrides if object
    if (!option.overrides) {
        option.overrides = {};
    }
    const override = option.overrides[moduleConf.name];
    if (Util.isObj(override)) {
        //deep merge
        moduleConf = Object.assign(moduleConf, override);
    }
    if (option.noBrowser) {
        delete moduleConf.browser;
    }
    option.moduleConf[modulePath] = moduleConf;
    return moduleConf;
};

//==================================================================================================

const getModuleInfo = function(moduleName, dependencies = {}, option) {

    const modulePath = path.resolve(`${option.nodeModules}`, moduleName);
    const moduleConf = getModuleConf(modulePath, option);
    if (!moduleConf) {
        Util.addLog(EC.red(`ERROR: Not found config: ${moduleName}`), option);
        return;
    }

    const moduleInfo = {
        name: moduleConf.name,
        version: moduleConf.version
    };

    //if version mismatched with spec
    const versionSpec = dependencies[moduleName];
    if (typeof versionSpec === "string") {
        const matched = semver.satisfies(moduleInfo.version, versionSpec);
        if (!matched) {
            moduleInfo.mismatched = versionSpec;
        }
    }

    //already done
    if (!option.moduleMap) {
        option.moduleMap = {};
    }
    if (option.moduleMap[moduleName]) {
        moduleInfo.deduped = true;
        return moduleInfo;
    }

    //cache module info first 
    option.moduleMap[moduleName] = true;

    //ignored module from option.exclude
    if (Util.isList(option.exclude) && option.exclude.includes(moduleName)) {
        moduleInfo.ignored = true;
        return moduleInfo;
    }

    //get subs before module files
    const subs = getModuleSubs(moduleConf, option);
    if (subs) {
        moduleInfo.subs = subs;
    }

    //require files
    generateModuleFiles(moduleName, option, moduleInfo, modulePath, moduleConf);

    return moduleInfo;
};

//==================================================================================================

const generateDependencies = function(moduleConf, option) {

    const moduleTree = [];
    //generate dependencies
    let moduleDependencies = getModuleDependencies(moduleConf, option);
    if (Util.isList(option.include)) {
        moduleDependencies = option.include.concat(moduleDependencies);
    }
    if (Util.isList(moduleDependencies)) {
        moduleDependencies.forEach(function(moduleName) {
            const info = getModuleInfo(moduleName, moduleConf.dependencies, option);
            if (info && !info.deduped) {
                moduleTree.push(info);
            }
        });
    }

    const moduleFiles = option.moduleFiles;
    const modules = Object.keys(moduleFiles);
    const files = [];
    Object.values(moduleFiles).forEach(list => {
        if (Util.isList(list)) {
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

//==================================================================================================

const initOption = function(option) {
    return Object.assign({
        silent: true,
        noBrowser: false,
        esModule: false,
        entry: process.cwd(),
        target: "",
        nodeModules: "",
        exclude: [],
        include: [],
        overrides: {},
        dependencies: {},
        onDependencies: function(dependencies, moduleConf, option) {
            return dependencies;
        },
        onFiles: function(files, moduleConf, option) {
            return files;
        }
    }, option, {
        moduleConf: {},
        moduleMap: {},
        moduleFiles: {},
        data: {}
    });
};

const getNodeModulesPath = function(option) {
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
    nodeModules = Util.formatPath(path.relative(option.cwd, nodeModules));
    return nodeModules;
};

const getTargetPath = function(option) {
    let target = option.target;
    if (!target) {
        target = option.entry;
    }
    target = Util.formatPath(path.relative(option.cwd, target));
    return target;
};

//==================================================================================================

const flatdep = function(option) {
    option = initOption(option);
    option.cwd = process.cwd();

    //init package json path
    let entry = path.resolve(option.entry);
    if (!fs.existsSync(entry)) {
        option.data.error = `ERROR: Not found: ${entry}`;
        return option.data;
    }

    const pj = fs.statSync(entry);
    if (pj.isFile()) {
        entry = path.dirname(entry);
    }
    entry = Util.formatPath(path.relative(option.cwd, entry));
    //read module config
    const moduleConf = getModuleConf(entry, option);
    if (!moduleConf) {
        option.data.error = `ERROR: Failed to read: ${entry}`;
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
        option.data.error = `ERROR: Not found: ${nodeModules}`;
        return option.data;
    }
    option.nodeModules = nodeModules;

    generateDependencies(moduleConf, option);

    return option.data;
};

//==================================================================================================

flatdep.initOption = initOption;
flatdep.getModuleFiles = getModuleFiles;
flatdep.getModuleSubs = getModuleSubs;
flatdep.getNodeModulesPath = getNodeModulesPath;
flatdep.consoleGrid = consoleGrid;
flatdep.EC = EC;

//==================================================================================================

flatdep.printModuleTree = function(data) {
    if (!data || !data.moduleTree) {
        console.log(EC.red("ERROR: Invalid print data."));
        return;
    }

    console.log(`${EC.cyan(`[${data.name}]`)} Module Tree:`);
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
            formatter: function(v, item) {
                if (item.ignored) {
                    return EC.yellow("ignored");
                }
                if (item.mismatched) {
                    return EC.yellow(item.mismatched);
                }
                if (item.deduped) {
                    return "deduped";
                }
                return "";
            }
        }]
    });
};

flatdep.printModuleFiles = function(data) {
    if (!data || !data.files) {
        console.log(EC.red("ERROR: Invalid print data."));
        return;
    }

    console.log(`${EC.cyan(`[${data.name}]`)} Module Files:`);
    const files = JSON.parse(JSON.stringify(data.files));

    const rows = files.map(item => {
        const p = path.resolve(data.target, item);
        const file = Util.formatPath(path.relative(data.nodeModules, p));
        let size;
        if (fs.existsSync(p)) {
            size = fs.statSync(p).size;
            size = Util.toBytes(size);
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
            formatter: function(v) {
                return v + 1;
            }
        }, {
            id: "file",
            name: `Files (${Util.formatPath(path.relative(data.target, data.nodeModules))})`,
            maxWidth: 80
        }, {
            id: "size",
            name: "Size",
            align: "right"
        }]
    });
};

flatdep.print = function(data) {
    flatdep.printModuleTree(data);
    flatdep.printModuleFiles(data);
};

module.exports = flatdep;
