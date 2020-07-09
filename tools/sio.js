const sio = require('socket.io');
let io = null;
let initListeners = []
let connectListeners = []
let identifyListeners = {};

exports.io = function () {
    return io;
};

exports.addOnInitListener = (listener) => {
    if (!initListeners.includes(listener)) {
        initListeners.push(listener);
    }
}

exports.removeOnInitListener = (listener) => {
    let i = initListeners.indexOf(listener)
    if (i >= 0) {
        initListeners.splice(i, 1);
    }
}

exports.addOnConnectListener = (listener) => {
    if (!connectListeners.includes(listener)) {
        connectListeners.push(listener);
    }
}

exports.removeOnConnectListener = (listener) => {
    let i = connectListeners.indexOf(listener)
    if (i >= 0) {
        connectListeners.splice(i, 1);
    }
}

exports.addOnIdentifyListener = (identifier, listener) => {
    if (!identifyListeners.hasOwnProperty(identifier)) {
        identifyListeners[identifier] = [];
    }
    if (!identifyListeners[identifier].includes(listener)) {
        identifyListeners[identifier].push(listener);
    }
}

exports.removeOnIdentifyListener = (identifier, listener) => {
    if (identifyListeners.hasOwnProperty(identifier)) {
        const i = identifyListeners[identifier].indexOf(listener);
        if (i >= 0) {
            identifyListeners[identifier].splice(i, 1);
        }
    }
}

exports.initialize = function(server) {
    io = sio(server);

    initListeners.forEach(listener => {
        listener(io);
    })

    io.on('connection', socket => {
        connectListeners.forEach(listener => {
            listener(socket);
        })

        socket.emit('identify');

        socket.once('identify', (identifier) => {
            if (identifyListeners.hasOwnProperty(identifier)) {
                // console.log(identifier, identifyListeners[identifier]);
                identifyListeners[identifier].forEach(listener => {
                    listener(socket);
                })
            }
        })

    })

    return io;
};

// https://stackoverflow.com/questions/38511976/how-can-i-export-socket-io-into-other-modules-in-nodejs