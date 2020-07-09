const db = require('../database/db');
const auth = require('../auth/auth');
const Color = require('../tools/tools').Color;
// const sleep = require('../tools/tools').sleep;
const schedule = require('node-schedule');
const { v4: uuidv4 } = require('uuid');
const spawn = require('child_process').spawn;
const killProcs = require('../tools/tools').killProcs;

/**
 *
 *
 * Python send Frames to Nodejs https://stackoverflow.com/questions/45247118/how-can-i-communicate-between-running-python-code-and-nodejs
 *
 *
 */
const TAG = "camera.js:"
const TOKEN_LIFE_MSEC = 30 * 60 * 1000;
const TOKEN_FIRST_TIMEOUT_DELAY = 30000;
const TOKEN_TIMEOUT_DELAY = 5000;
const PY_PROC_DEAD_DELAY = 15000;

const ROOT = __filename.split("/camera.js")[0];
const PYPATH = ROOT + '/rtsp_streamer.py'
// console.log(PYPATH);

class CameraHandler {
    constructor() {
        this.runningCams = {}
        this.requests = {};
        this.removal = [];

        this.io = null;
        this.pythonProcess = null;
        this.pythonAlive = Date.now();
        this.pythonSocket = null;
        this.scheduler = null;

        this.blackout = false;
        this.currentFrame = {};

        this._io_init = this._io_init.bind(this);
        this.emitFrames = this.emitFrames.bind(this);
        // this.handleNewSocket = this.handleNewSocket.bind(this);
        this.updateKeepAlive = this.updateKeepAlive.bind(this);
        this.housekeeping = this.housekeeping.bind(this);

        this.handlePythonSocket = this.handlePythonSocket.bind(this);
        this.handleClientSocket = this.handleClientSocket.bind(this);


        require('../tools/sio').addOnInitListener(this._io_init)
        require('../tools/sio').addOnIdentifyListener('python-backend', this.handlePythonSocket)
        require('../tools/sio').addOnIdentifyListener('client', this.handleClientSocket)
    }

    _io_init(io) {
        this.io = io;
        this.respawnPythonProcess();
    }

    respawnPythonProcess() {
        killProcs('rtsp_streamer.py').then(() => {
            if (this.pythonProcess != null) {
                this.pythonProcess.kill('SIGKILL');
                this.runningCams = {}
                this.requests = {}

            }
            this.pythonProcess = spawn('python3', [PYPATH])
        })
    }

    handlePythonSocket(socket) {
        console.log('python-backend Connected');

        this.pythonSocket = socket;

        this.createCameras();

        socket.on('python-camera', data => {
            const uid = data['uid']
            const frame = data['frame']

            if (!this.runningCams.hasOwnProperty(uid)) {
                this.postCreateCamera(uid);
            }

            this.emitFrames(uid, frame)
        })

        socket.on('python-alive', () => {
            this.pythonAlive = Date.now();
        })

        this.scheduler = schedule.scheduleJob('*/5 * * * * *', this.housekeeping);
    }

    handleClientSocket(socket) {
        socket.on('keep-alive', this.updateKeepAlive);
        socket.on('update_fps', (data) => {
            console.log(data)
            if (data['fps'] <= 10 && data['fps'] >= 1) {
                db.updateCameraFPS(data['uid'], data['fps'])
                if (this.pythonSocket != null) {
                    this.pythonSocket.emit('update_fps', data);
                }

            }
        })
    }

    emitFrames(uuid, frame) {
        if (this.io != null) {

            if (!this.blackout) {
                this.currentFrame[uuid] = frame;
            }

            if (this.requests.hasOwnProperty(uuid)) {
                Object.keys(this.requests[uuid]).forEach(token => {
                    this.io.emit(token, this.currentFrame[uuid]);
                })
            }
        }
    }

    requestCamera(uuid) {
        if (!this.runningCams.hasOwnProperty(uuid)) {
            this.createCamera(uuid);
        } else {
            if (!this.runningCams[uuid]) {
                this.pauseCamera(uuid, false);
            }
        }

        const token = uuidv4();
        if (!this.requests.hasOwnProperty(uuid)) {
            this.requests[uuid] = {};
        }
        this.requests[uuid][token] = {
            ts: Date.now() + TOKEN_LIFE_MSEC,
            last_ping: Date.now() + TOKEN_FIRST_TIMEOUT_DELAY
        }
        return token;
    }

    createCameras() {
        Object.keys(db.getCameras()).forEach(uuid => {
            this.createCamera(uuid);
        })
    }

    createCamera(uuid) {
        const cam = db.getCamera(uuid);
        if (this.pythonSocket) {
            this.pythonSocket.emit('add_camera', {
                uid: uuid,
                url: cam.url
            })
        }

    }

    postCreateCamera(uid) {
        this.runningCams[uid] = false;
        const cam = db.getCamera(uid);
        this.pythonSocket.emit('update_fps', {
            uid: uid,
            fps: cam.fps != null ? cam.fps : 1
        });
        this.pauseCamera(uid, true);
    }

    pauseCamera(uuid, bool) {
        this.pythonSocket.emit('pause_camera', {uid: uuid, pause: bool});
    }

    updateKeepAlive(token, uuid) {
        // console.log(TAG, 'io.keep-alive', uuid);
        if (this.requests.hasOwnProperty(uuid)) {
            if (this.requests[uuid].hasOwnProperty(token)) {
                this.requests[uuid][token].last_ping = Date.now();
            }
        }
    }

    housekeeping() {
        // Check all tokens
        Object.keys(this.requests).forEach(uuid => {
            Object.keys(this.requests[uuid]).forEach(token => {
                const obj = this.requests[uuid][token]

                if (Date.now() >= obj.ts || Date.now() - obj.last_ping >= TOKEN_TIMEOUT_DELAY) {
                    console.log(
                        TAG, "token",
                        Color.fg(Color.FgGreen, token),
                        "expired for",
                        Color.fg(Color.FgRed, uuid));
                    this.removal.push({
                        uuid: uuid,
                        token: token
                    })
                }
            })
        })

        // Cleanup
        let tempRequests = {...this.requests};
        this.removal.forEach(obj => {
            if (tempRequests[obj.uuid].hasOwnProperty(obj.token)) {
                console.log(TAG, "token", Color.fg(Color.FgGreen, obj.token), "removed for", Color.fg(Color.FgRed, obj.uuid));
                delete tempRequests[obj.uuid][obj.token];
            }
            if (Object.keys(tempRequests[obj.uuid]).length <= 0) {
                console.log(TAG, "camera", Color.fg(Color.FgRed, obj.uuid), "paused");
                this.pauseCamera(obj.uuid, true);
                this.runningCams[obj.uuid] = false;

            }
        });
        this.requests = tempRequests;
        this.removal = [];

        if (Date.now() - this.pythonAlive > PY_PROC_DEAD_DELAY) {
            this.respawnPythonProcess();
        }
    }
}

console.log("Socket.io version:", require('socket.io/package').version);

const cameraHandler = new CameraHandler();

module.exports = cameraHandler;