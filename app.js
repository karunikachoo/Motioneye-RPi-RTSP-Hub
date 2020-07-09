let createError = require('http-errors');
let express = require('express');
let path = require('path');
let cookieParser = require('cookie-parser');
// let session = require('express-session');
let logger = require('morgan');

let loginRouter = require('./routes/login');
let mainRouter = require('./routes/main');
let dashboardRouter = require('./routes/dashboard');

const db = require('./database/db');
const auth = require('./auth/auth');
const cameraHandler = require('./camera/camera');
const audioHandler = require('./audio/audio');

// Constants
const TAG = "app:"
// const SESSION_SECRET = auth.generateSecret();

let app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.get('/', auth.checkAuthToken, (req, res) => {
    res.redirect('/main');
});

app.use('/login', loginRouter);
app.use('/main', mainRouter);
app.use('/dashboard', dashboardRouter)

app.post('/logout', auth.checkAuthToken, (req, res) => {
    res.clearCookie('auth');
    auth.log(req, 'LOGGED OUT');
    res.redirect('/login');
})

// dashboard camera fn
app.post('/add_cam', auth.checkAuthToken, auth.checkUserAccess, (req, res) => {
    const name = req.body.name;
    const url = req.body.url;

    db.addCamera(name, url);

    auth.log(req, `Added camera ${name} @ ${url}`);
    res.redirect('/dashboard');
});

app.post('/remove_cam', auth.checkAuthToken, auth.checkUserAccess, (req, res) => {
    const uuid = req.body.uuid;
    const cam = db.getCamera(uuid);
    db.removeCamera(uuid);

    auth.log(req, `Removed camera ${cam.name} @ ${cam.url}`);
    res.redirect('/dashboard');
})

app.post('/restart_cam', auth.checkAuthToken, auth.checkUserAccess, (req, res) => {
    cameraHandler.respawnPythonProcess();

    auth.log(req, '*RESTARTED CAMERA PYTHON PROCESS*');
    res.redirect('/dashboard');
})

app.post('/blackout', auth.checkAuthToken, auth.checkUserAccess, (req, res) => {
    cameraHandler.blackout = true;

    auth.log(req, '*REQUESTED BLACKOUT*');
    res.redirect('/dashboard');
})

app.post('/blackout-restore', auth.checkAuthToken, auth.checkUserAccess, (req, res) => {
    cameraHandler.blackout = false;

    auth.log(req, 'RESTORED BLACKOUT');
    res.redirect('/dashboard');
})

// dashboard user fn

app.post('/add_user', auth.checkAuthToken, auth.checkUserAccess, (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const passVerify = req.body['password-verify'];

    if (password === passVerify) {
        const res = auth.hash_pass(password);
        db.addUser(username, res.salt, res.hash);
    }

    auth.log(req, `ADDED USER _*${username}*_ w/ ${password}`);
    res.redirect('/dashboard');
})

app.post('/update_user', auth.checkAuthToken, auth.checkUserAccess, (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const passVerify = req.body['password-verify'];

    if (password === passVerify) {
        const res = auth.hash_pass(password);
        db.updateUser(username, res.salt, res.hash);
    }

    auth.log(req, `UPDATED USER _*${username}*_ w/ ${password}`);
    res.redirect('/dashboard');
})

app.post('/update_user_access', auth.checkAuthToken, auth.checkUserAccess, (req, res) => {
    console.log(TAG, req.body);
    const username = req.body.username;
    const level = req.body.admin === 'true' ? 5 : 1;
    const user = auth.getUserData(req.cookies['auth']);
    if (user.username !== username) {
        db.updateUserAccess(username, level);
    }

    auth.log(req, `*SET USER ACCESS FOR _${username}_ to ${req.body.admin ? 'ADMIN': 'NORMAL'}*`);
    res.redirect('/dashboard');
})

app.post('/update_user_audio', auth.checkAuthToken, auth.checkUserAccess, (req, res) => {
    console.log(TAG, req.body);
    const username = req.body.username;
    const audio = req.body.audio === 'true';

    db.setUserAudio(username, audio);

    auth.log(req, `Turned audio for _*${username}*_ ${audio ? 'ON' : 'OFF'}`)
    res.redirect('/dashboard');
})

app.post('/add_user_cam', auth.checkAuthToken, auth.checkUserAccess, (req, res) => {
    console.log(TAG, req.body);
    const username = req.body.username;
    const camId = req.body['cam_id'];
    const cam = db.getCamera(camId);

    db.addUserCamera(username, camId);

    auth.log(req, `ADDED ${cam.name} TO USER _*${username}*_`);
    res.redirect('/dashboard');
})

app.post('/remove_user_cam', auth.checkAuthToken, auth.checkUserAccess, (req, res) => {
    const username = req.body.username;
    const camId = req.body['cam_id'];
    const cam = db.getCamera(camId);

    db.removeUserCamera(username, camId);

    auth.log(req, `REMOVED ${cam.name} FROM USER _*${username}*_`);
    res.redirect('/dashboard');
})

app.post('/remove_user', auth.checkAuthToken, auth.checkUserAccess, (req, res) => {
    const username = req.body.username;

    db.removeUser(username);

    auth.log(req, `*REMOVED USER _${username}_*`)
    res.redirect('/dashboard');
})

// Audio Passthrough
app.post('/restart-audio-backend', auth.checkAuthToken, auth.checkUserAccess, (req, res) => {
    audioHandler.startAudioBackend()

    auth.log(req, `*RESTARTED AUDIO BACKEND*`)
    res.redirect('/dashboard');
})

// Logging
app.post('/update-webhook-url', auth.checkAuthToken, auth.checkUserAccess, (req, res) => {
    const url =  req.body.url;

    auth.log(req, `* CHANGING SLACK LOGGING URL TO ${url} *`);

    db.setWebhookURL(url);

    auth.log(req, `* CHANGED SLACK LOGGING URL TO ${url} *`);
    res.redirect('/dashboard');
})

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
