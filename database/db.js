let fs = require('fs');
const schedule = require('node-schedule');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const request = require('request');

const TAG = "db:";

const ROOT = __filename.split("/database")[0];

const DB_PATH = ROOT + '/db.json';
const LOG_PATH = ROOT + '/logs.txt';

console.log(TAG, 'DB @', DB_PATH);
console.log(TAG, 'LOGS @', LOG_PATH);

class DB {
    constructor() {
        this._db = {
        };
        this._previousHash = "";
        this.loadDB();

        let that = this;
        this.saveTask = schedule.scheduleJob('*/30 * * * * *', () => {
            that.saveDB();
        });
    }

    loadDB() {
        try {
            const data = fs.readFileSync(DB_PATH);
            this._db = JSON.parse(data.toString());
            console.log(TAG, "DB Loaded");
        } catch(err) {
            console.log(TAG, "No DB FOUND");
            this._db = {
                users: {},
                cameras: {},
                log: {
                    "slack-webhook-url": null
                }
            }
            const uuid = uuidv4()
            const passObj = this.hashPass('admin');
            this._db.users[uuid] = {
                username: "admin",
                access: 5,
                salt: passObj.salt,
                hash: passObj.hash,
                cameras: [],
                audio: true
            }

            this.saveDB()
        }
        this._previousHash = this.hashMemDB();
    }

    saveDB() {
        const curHash = this.hashMemDB();
        if (curHash !== this._previousHash) {
            const data = JSON.stringify(this._db);
            fs.writeFile(DB_PATH, Buffer.from(data, 'utf-8'),
                () => {
                    console.log(TAG, "DB Saved");

                });
            this._previousHash = curHash;
        }
    }

    hashMemDB() {
        return crypto.createHash('sha256').update(JSON.stringify(this._db)).digest('hex');
    }

    // User WRITE

    setWebhookURL(url) {
        this._db.log['slack-webhook-url'] = url;
    }

    addLog(text) {
        fs.appendFileSync(LOG_PATH, text + '\n');

        if (this._db.hasOwnProperty('log')) {
            if (this._db.log.hasOwnProperty('slack-webhook-url')) {
                if (this._db.log['slack-webhook-url'] !== null) {
                    request.post(this._db.log['slack-webhook-url'], {
                        json: {
                            text: text
                        }
                    })
                }
            }
        }


    }

    // User READ

    containsUser(username) {
        let uuid = null;
        Object.keys(this._db.users).forEach((key) => {
            // console.log(key);
            // console.log(this._db.users[key]);
            // console.log(this._db.users[key].username === username);
            if (this._db.users[key].username === username) {
                // console.log("Foundit!");
                uuid = key;
            }
        })

        return {
            success: uuid != null,
            uuid: uuid
        };

    }

    getUserDataById(uuid) {
        if (this._db.users.hasOwnProperty(uuid)) {
            return this._db.users[uuid];
        }
        return null;
    }

    getUserData(username) {
        let u = this.containsUser(username);
        if (u.success) {
            return this._db.users[u.uuid];
        }
        return null;
    }

    hashPass(password, salt) {
        // Reference auth.js, always match that implementation
        if (!salt) {
            salt = crypto.randomBytes(128);
        }
        if (typeof salt == "string") {
            salt = Buffer.from(salt, 'hex');
        }

        let hash = crypto.scryptSync(password, salt, 128);

        return {
            salt: salt.toString('hex'),
            hash: hash.toString('hex'),
        };
    }

    getUsers() {
        let ret = [];
        Object.keys(this._db.users).forEach(uuid => {
            const user = this._db.users[uuid];
            ret.push({
                uuid: uuid,
                username: user.username,
                cameras: user.cameras,
                audio: user.audio,
                admin: user.access === 5
            })
        })
        return ret;
    }

    getNumAdmins() {
        let i = 0;
        Object.keys(this._db.users).forEach(uuid => {
            const user = this._db.users[uuid];
            if (user.access === 5) {
                i = i + 1;
            }
        })

        return i;
    }

    addUser(username, salt, hash) {
        const uuid = uuidv4();
        const res = this.containsUser(username)
        if (!res.success) {
            this._db.users[uuid] = {
                username: username,
                access: 1,
                salt: salt,
                hash: hash,
                cameras: [],
                audio: false
            }
        }
    }

    updateUser(username, salt, hash) {
        const res = this.containsUser(username)
        if (res.success) {
            this._db.users[res.uuid].salt = salt;
            this._db.users[res.uuid].hash = hash;
        }
    }

    updateUserAccess(username, level) {
        const res = this.containsUser(username)

        if (res.success) {
            this._db.users[res.uuid].access = level;
        }
    }

    setUserAudio(username, bool) {
        const res = this.containsUser(username)
        if (res.success) {
            this._db.users[res.uuid].audio = bool;
        }
    }

    addUserCamera(username, camId) {
        const res = this.containsUser(username)
        if (res.success) {
            if (!this._db.users[res.uuid].cameras.includes(camId)) {
                this._db.users[res.uuid].cameras.push(camId);
            }
        }
    }

    removeUserCamera(username, camId) {
        const res = this.containsUser(username)
        if (res.success) {
            if (this._db.users[res.uuid].cameras.includes(camId)) {
                const i = this._db.users[res.uuid].cameras.indexOf(camId);
                this._db.users[res.uuid].cameras.splice(i, 1);
            }
        }
    }

    removeUser(username) {
        const res = this.containsUser(username);

        if (res.success) {
            const user = this.getUserDataById(res.uuid);
            if (user.access === 5) {
                if (this.getNumAdmins() > 1) {
                    delete this._db.users[res.uuid];
                }
            } else {
                delete this._db.users[res.uuid];
            }
        }
    }

    // Camera
    getCamera(uuid) {
        return this._db.cameras[uuid];
    }

    getCameras() {
        return this._db.cameras;
    }

    addCamera(name, url) {
        const uuid = uuidv4();
        this._db.cameras[uuid] = {
            name: name,
            url: url,
            fps: 1
        }
    }

    updateCameraFPS(uuid, fps) {
        if (this._db.cameras.hasOwnProperty(uuid)) {
            this._db.cameras[uuid]['fps'] = fps
        }

    }

    removeCamera(uuid) {
        if (this._db.cameras.hasOwnProperty(uuid)) {
            this.getUsers().forEach(user => {
                if (user.cameras.includes(uuid)) {
                    this.removeUserCamera(user.username, uuid);
                }
            })
            delete this._db.cameras[uuid];
        }
    }
}

let db = new DB();

module.exports = db;