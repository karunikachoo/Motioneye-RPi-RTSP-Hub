let crypto = require('crypto');
let request = require('request');
let jwt = require('jsonwebtoken');
const db = require('../database/db');
const Tools = require('../tools/tools').Tools;
const schedule = require('node-schedule')
let fs = require('fs');

const TAG = "auth:";

const ROOT = __filename.split("/auth.js")[0];
const SECRET_KEY = fs.readFileSync(ROOT + '/recaptchav3.secret').toString();


class Auth {
    constructor() {
        this.db = db

        this.tokens = {};
        this.tokenSecret = null;
        this.generateSecret()

        let that = this;
        this.genTask = schedule.scheduleJob('* */30 * * * *', () => {
            that.resetSession();
        });

        this.recaptchaSiteKey = fs.readFileSync(ROOT + '/recaptchav3.sitekey').toString();

        this.checkAuthToken = this.checkAuthToken.bind(this);
        this.checkUserAccess = this.checkUserAccess.bind(this);

        this.verifyToken = this.verifyToken.bind(this);
        this.generateToken = this.generateToken.bind(this);
        this.registerToken = this.registerToken.bind(this);
        this.getUserData = this.getUserData.bind(this);

        this.validate = this.validate.bind(this);
        this.hash_pass = this.hash_pass.bind(this);
        this.recaptchaVerify = this.recaptchaVerify.bind(this);
    }

    resetSession() {
        this.generateSecret();
        this.tokens = {};
    }

    // Middlewares
    checkAuthToken(req, res, next) {
        if (req.cookies['auth']) {
            this.verifyToken(req.cookies['auth'], (valid) => {
                if (valid) {
                    next();
                } else {
                    res.clearCookie('auth');
                    console.log(TAG, "expired Token")
                    res.redirect(`/login?err=${auth.ERRS.noToken}`);
                }
            })
        } else {
            res.clearCookie('auth');
            console.log(TAG, "no Token")
            res.redirect(`/login?err=${auth.ERRS.noToken}`);
        }
    }

    checkUserAccess(req, res, next) {
        if (this.getUserData(req.cookies.auth).admin) {
            next();
        } else {
            this.log(req, `*UNAUTHORISED ACCESS TO ${req.path}*`)
            res.redirect('/main');
        }
    }

    // Session Tokens

    verifyToken(token, callback) {
        jwt.verify(token, this.tokenSecret, (err, decoded) => {
            if (err) {
                if (this.tokens.hasOwnProperty(token)) {
                    delete this.tokens[token];
                }
                callback(false);
            } else {
                callback(true);
            }
        })
    }

    generateSecret() {
        this.tokenSecret = crypto.randomBytes(128).toString('hex');
    }

    generateToken(username) {
        const token = jwt.sign({username: username},
            this.tokenSecret,
            {
                expiresIn: '1h' // expires in 24 hours
            }
        );

        return token;
    }

    registerToken(token, username) {
        const ret = this.db.containsUser(username);
        if (ret.success) {
            this.tokens[token] = ret.uuid;
        }
    }

    // User

    getUserData(token) {
        const uuid = this.tokens[token];
        const user = this.db.getUserDataById(uuid);
        return {
            username: user.username,
            cameras: user.cameras,
            audio: user.audio,
            admin: user.access === auth.USER_LVL.admin
        }
    }

    log(req, str, username) {
        if (username == null && req.cookies['auth']) {
            username = this.getUserData(req.cookies['auth']).username
        }
        const ip = this.getUserIP(req)
        const res = db.containsUser(username);
        let text = `${username}${res.success ? "" : "[INVALID USER]"}: ${ip} @ ${Tools.curDateTime()}: ${str}`;

        db.addLog(text);
    }

    getUserIP(req) {
        return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    }

    // Username & Password

    validate(username, password, req) {
        const data = this.db.getUserData(username);
        this.log(req, `LOGIN ATTEMPT w/ ${password}`, username);
        if (data != null) {
            const pw = this.hash_pass(password, data.salt);
            if (pw.hash === data.hash) {
                this.log(req, 'LOGIN SUCCESSFUL', username);
                return true;
            }
        }
        this.log(req, `LOGIN *FAILED* w/ ${password}`, username);
        return false;
    }

    hash_pass(password, salt) {
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

    // Recaptcha

    recaptchaVerify(token, callback) {
        request.post(`https://www.google.com/recaptcha/api/siteverify?secret=${SECRET_KEY}&response=${token}`, (err, resp, body) => {
            if (err) {
                console.log(TAG, err);
                callback(false, auth.ERRS.captchaErr);
            }

            const data = JSON.parse(body);
            if (data.success) {
                callback(true, 0);
            } else {
                callback(false, auth.ERRS.noCaptchaVerify);
            }
        });
    }
}

let auth = new Auth();

auth.ERRS = {
    captchaErr: 1,
    noCaptchaVerify: 2,
    authFailed: 3,
    noToken: 4,
}

auth.USER_LVL = {
    normal: 1,
    pseudoAdmin: 4,
    admin: 5,
}

module.exports = auth;