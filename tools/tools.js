const psaux = require('psaux');

class Tools {
    static curDateTime() {
        const now =  new Date();
        return now.toISOString().split("T")[0] + " " + now.toLocaleTimeString();
    }
}

const Color = {
    Reset: "\x1b[0m",
    Bright: "\x1b[1m",
    Dim: "\x1b[2m",
    Underscore: "\x1b[4m",
    Blink: "\x1b[5m",
    Reverse: "\x1b[7m",
    Hidden: "\x1b[8m",

    FgBlack: "\x1b[30m",
    FgRed: "\x1b[31m",
    FgGreen: "\x1b[32m",
    FgYellow: "\x1b[33m",
    FgBlue: "\x1b[34m",
    FgMagenta: "\x1b[35m",
    FgCyan: "\x1b[36m",
    FgWhite: "\x1b[37m",

    BgBlack: "\x1b[40m",
    BgRed: "\x1b[41m",
    BgGreen: "\x1b[42m",
    BgYellow: "\x1b[43m",
    BgBlue: "\x1b[44m",
    BgMagenta: "\x1b[45m",
    BgCyan: "\x1b[46m",
    BgWhite: "\x1b[47m",

    fg: (color, text) => {
        return color + text + "\x1b[0m";
    }
}

function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

function killProcesses(grep) {
    return new Promise((res, rej) => {
        psaux().then(list => {
            list.forEach(item => {
                if (item.command.includes(grep)) {
                    process.kill(Number.parseInt(item.pid), "SIGKILL");
                    console.log(`killed ${item.pid}`);
                }
            })
            res();
        })
    })
}

exports.Tools = Tools;
exports.Color = Color;
exports.sleep = sleep;
exports.killProcs = killProcesses;