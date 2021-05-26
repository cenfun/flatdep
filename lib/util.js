const fs = require("fs");
const EC = require("eight-colors");
const Util = {

    // \ to /
    formatPath: function(str) {
        if (str) {
            str = str.replace(/\\/g, "/");
        }
        return str;
    },

    isList: function(data) {
        if (data && data instanceof Array && data.length > 0) {
            return true;
        }
        return false;
    },

    toList: function(data, separator) {
        if (data instanceof Array) {
            return data;
        }
        if (typeof(data) === "string" && (typeof(separator) === "string" || separator instanceof RegExp)) {
            return data.split(separator);
        }
        if (typeof(data) === "undefined" || data === null) {
            return [];
        }
        return [data];
    },

    isObj: function(obj) {
        return obj && typeof(obj) === "object" && !(obj instanceof Array);
    },

    toBytes: function(bytes) {

        bytes = Math.max(bytes, 0);

        const k = 1024;
        if (bytes < k) {
            return `${bytes} B`;
        }
        const m = k * k;
        if (bytes < m) {
            const mStr = `${Math.round(bytes / k * 100) / 100} KB`;
            if (bytes < 200 * k) {
                return mStr;
            }
            return EC.yellow(mStr);
        }
        const g = m * k;
        if (bytes < g) {
            const gStr = `${Math.round(bytes / m * 100) / 100} MB`;
            return EC.red(gStr);
        }
        const t = g * k;
        if (bytes < t) {
            const tStr = `${Math.round(bytes / g * 100) / 100} GB`;
            return EC.red(tStr);
        }

        return bytes;
    },

    readFileContentSync: function(filePath) {
        let content = null;
        const isExists = fs.existsSync(filePath);
        if (isExists) {
            content = fs.readFileSync(filePath);
            if (Buffer.isBuffer(content)) {
                content = content.toString("utf8");
            }
        }
        return content;
    },

    readJSONSync: function(filePath) {
        const content = Util.readFileContentSync(filePath);
        let json = null;
        if (content) {
            json = JSON.parse(content);
        }
        return json;
    },

    addLog: function(msg, option) {
        if (option.silent) {
            return;
        }
        console.log(msg);
    }
};


module.exports = Util;