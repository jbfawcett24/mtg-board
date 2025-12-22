const {join, resolve} = require("node:path");
const {homedir} = require("node:os");
const resolvePath = (dir) => {
    if(dir.startsWith("~")) {
        return join(homedir(), dir.slice(1));
    }
    return resolve(dir);
}

module.exports = { resolvePath }