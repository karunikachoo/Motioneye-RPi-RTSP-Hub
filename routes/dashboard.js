var express = require('express');
var router = express.Router();
const auth = require('../auth/auth');
const db = require('../database/db');
const cameraHandler = require('../camera/camera');

/* GET users listing. */
router.get('/', auth.checkAuthToken, auth.checkUserAccess, function(req, res, next) {
    const user = auth.getUserData(req.cookies.auth);

    // console.log(user);

    const cameras = db.getCameras();
    let cams = [];
    Object.keys(cameras).forEach(uuid => {
        const cam = cameras[uuid];
        cams.push({
            name: cam.name,
            uuid: uuid,
            url: cam.url,
            fps: cam.fps,
            token: cameraHandler.requestCamera(uuid)
        });
    });

    const users = db.getUsers();

    let usersArr = [];
    users.forEach(user => {
        let cs = [];
        user.cameras.forEach(cam_uid => {
            cams.forEach(c => {
                if (c.uuid === cam_uid) {
                    cs.push({
                        uuid: cam_uid,
                        name: c.name
                    });
                }
            })
        })
        user.cameras = cs;
        usersArr.push(user);
    })

    res.render('dashboard', {
        title: 'Home',
        username: user.username,
        cams: cams,
        users: usersArr,
        blackout: cameraHandler.blackout,
        webhook: db._db.log['slack-webhook-url']
    });
});

module.exports = router;
