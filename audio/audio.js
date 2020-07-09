// https://stackoverflow.com/questions/20876152/playing-pcm-stream-from-web-audio-api-on-node-js
const spawn = require('child_process').spawn;
const killProcs = require('../tools/tools').killProcs;
const auth = require('../auth/auth');

const ROOT = __filename.split("/audio.js")[0];
const PYPATH = ROOT + '/speaker.py'


class AudioHandler {
    constructor() {
        this.io = null;
        this.speakerProcess = null;
        this.speakerSocket = null;
        this.processAlive = 0;

        this.onIOInit = this.onIOInit.bind(this);
        this.handleClientSocket = this.handleClientSocket.bind(this);
        this.handleSpeakerSocket = this.handleSpeakerSocket.bind(this);

        require('../tools/sio').addOnInitListener(this.onIOInit);
        require('../tools/sio').addOnIdentifyListener('audio-backend', this.handleSpeakerSocket);
        require('../tools/sio').addOnIdentifyListener('client', this.handleClientSocket);

        console.log('audio-handler-initialised');
    }

    onIOInit(io) {
        this.io = io;
        this.startAudioBackend();
    }

    startAudioBackend() {
        killProcs('speaker.py').then(() => {
            if (this.speakerProcess != null) {
                this.speakerProcess.kill('SIGKILL');
            }
            this.speakerProcess = spawn('python3', [PYPATH])
            this.processAlive = Date.now();
        })
    }

    handleSpeakerSocket(socket) {
        if (this.speakerSocket == null) {
            console.log('audio-backend Connected')
        }
        this.speakerSocket = socket;

        // socket.on('audio-alive', () => {
        //     this.processAlive = Date.now();
        // });
    }

    handleClientSocket(socket) {
        socket.on('audio-write', data => {
            if (this.speakerSocket != null) {
                // console.log(data);
                // this.speakerSocket.emit('audio-write', data['buff']);
                auth.verifyToken(data['auth'], (valid) => {
                    if (valid) {
                        this.speakerSocket.emit('audio-write', data['buff']);
                    }
                })
            }
        })

        socket.on('audio-end', () => {
            this.speakerSocket.emit('audio-end');
        })
    }
}

audioHandler = new AudioHandler();

module.exports = audioHandler;