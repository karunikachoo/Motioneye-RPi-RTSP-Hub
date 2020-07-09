// https://developers.google.com/web/fundamentals/media/recording-audio

let express = require('express');
let router = express.Router();
const auth = require('../auth/auth');
const db = require('../database/db');
const cameraHandler = require('../camera/camera');
const TAG = "main.js:";


router.get('/', auth.checkAuthToken, function (req, res, next) {
    // console.log(TAG, 'req.cookie:', req.cookies);
    const user = auth.getUserData(req.cookies.auth);
    // console.log(TAG, user);

    let cams = [];
    user.cameras.forEach(uuid => {
        cam = db.getCamera(uuid);
        cams.push({
            name: cam.name,
            uuid: uuid,
            token: cameraHandler.requestCamera(uuid)
        });
    })

    res.render('main', {
        title: 'Home',
        username: user.username,
        cams: cams,
        admin: user.admin,
        audio: user.audio
    });
});

module.exports = router;