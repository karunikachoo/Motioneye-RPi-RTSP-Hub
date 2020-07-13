var express = require('express');
var router = express.Router();
let auth = require('../auth/auth');
const TAG = "login.js:"

/* GET home page. */
router.get('/', function (req, res, next) {
    let msg = "";
    switch (Number.parseInt(req.query.err, 10)) {
        case auth.ERRS.captchaErr:
            msg = "ERROR: Issue with Captcha. Please contact Google.";
            break;
        case auth.ERRS.noCaptchaVerify:
            msg = "Please verify that you are human!";
            break;
        case auth.ERRS.authFailed:
            msg = "Invalid Username/Password";
            break;
        case auth.ERRS.noToken:
            msg = "Login Session Expired!";
            break;
    }
    res.render('login', {
        title: 'MotionEye Login',
        msg: msg,
        recaptchaSiteKey: auth.recaptchaSiteKey
    });
}).post('/', (req, res) => {
    const token = req.body['g-recaptcha-response'];
    const user = req.body.username;
    const pass = req.body.password;

    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log(TAG, "ip:", ip);

    auth.recaptchaVerify(token, (success, errmsg) => {
        if (success) {
            if (auth.validate(user, pass, req)) {
                const token = auth.generateToken(user + ip);

                auth.registerToken(token, user);

                res.cookie('auth', token);
                res.redirect('/main');
            } else {
                res.redirect(`/login?err=${auth.ERRS.authFailed}`);
            }
        } else {
            res.redirect(`/login?err=${errmsg}`);
        }
    })
})

module.exports = router;
