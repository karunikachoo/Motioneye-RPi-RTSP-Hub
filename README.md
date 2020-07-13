# Motioneye-RPi-RTSP-Hub
NodeJS - Express &amp; Python3 home surveillance hub for local RTSP streams on Raspberry Pi 3B/+, with focus on internet-facing usage.

## What does it do?

It allows you to set up a web-facing hub that features:

- Multiple user accounts & authentication (unlike motioneye's single user and admin).
	- Per user settings of roles (admin/normal), cameras and audio playback
	- Recaptcha (currently not optional) for some mitigation w.r.t automated logins.
- Re-streaming of local insecure RTSP streams without exposing them directly to the internet 
(unlike MotionEye where you needed to expose your MJPEG Streams to reroute them back into the dashboard).
	- Does not expose the ip address and user/pass of your RTSP stream to the user.
    - Changing of re-streamed FPS on-the-fly in the Admin Dashboard.
    - Blackout mode: streams the last frame for times when you need a little privacy (Intend to add support for frame loops ala spy movies).
- Extensive logging of user actions
    - Slack Webhooks integration 
    - Local logging 
- Audio playback
    - Pretend to be the voice of god and talk through the raspberry pi to a speaker located in your home. 

![homepage](https://firebasestorage.googleapis.com/v0/b/portfolio-8c0bd.appspot.com/o/images%2Fbk9gzfcsqfetu055?alt=media&token=154e749e-7744-4299-89a6-b45ecbbc8dc4)

![dashboard](https://firebasestorage.googleapis.com/v0/b/portfolio-8c0bd.appspot.com/o/images%2Fpv77h0wziyppmsm6?alt=media&token=40bd84ae-fa94-42e2-b5f9-830e2d8915f2)

## Sound's great! Any Issues?
Crypto

- The system uses scrypt for hashing user passwords and JSON Web Token + Cookies to handle user authentication and session.
    - I am not an expert in cryptography. I can only say that scrypt is decent. I didn't go with Bcrypt because I couldn't install it on Webstorm :<
    - I cannot vouch for the security w.r.t cross-site attacks using the cookies + token system, but having
    a time limit on a user session + Slack logging should mitigate some of this. Improvements are welcome.
- You are exposing a device to the internet, there will always be risks. This software is only done to help reduce some of them, even so, **I am not responsible if your PI decides to blow up or someone else gains access to your cameras**. I have tried to mitigate those issues to the best of my ability.
	
Camera

- Re-streamers take up a decent amount of processing at higher framerates/increased cameras. 
- These are currently limited to only 10 FPS max.

Audio

- Audio is a little choppy, quality is not the best. Any improvements welcome. (The voice of god drops out sometimes...)
- Bluetooth audio streaming only works on RPis with Desktop Environments. (Needs to boot into desktop to work)
- Audio recording does not work on iPhones because "Apple" and doesn't allow for microphone access in Chrome/FF. Does not work on Safari on iOS14 beta. Not sure what the issue is. May add legacy `<input/>` support in the future, not fussed at the moment.
- Only works for **ONE** audio out on the Pi.

Performance

- Remember, we're running this on a raspberry pi... So YMMV.

Compatibility

- So far I can only say that it works on a Raspberry Pi 3B+ with two Pi Zero W MotioneyeOS Fast Network Cameras streaming RTSP.
- Audio was piped from client -> pi -> an echo dot (original) in real time with occasional dropouts (no clue)

## I can live with those issues, where do I start?

### 0. Cameras
Setup your MotionEye cameras using either MotionEyeOS or Raspbian
with MotionEye installed. 

Log into your MotionEye dashboard, under **"Expert settings"** enable 
**"Fast Network Camera"**. Apply and reboot.

Log into your dashboard again, go to **"Video Streaming"** and change the 
**"Streaming protocol"** from "MJPEG" to "RTSP". 

In theory, any RTSP stream should work, not just from MotionEye. Authentication can be added by appending the username and password to the beginning of the url e.g. 

`http://user:pass@192.168.x.x:8080`

But this is not tested.

### 0.5 Desktop or headless? 
Which version of raspbian you ultimately decide on depends on
if you want the voice of god to be wireless or piped through a
HDMI/Headphone Jack.

You will need Raspbian with a desktop environment if you want
your voice to be streamed to a bluetooth speaker such as an Echo Dot.
If you care not for making your voice wireless, a headless version of Raspbian **_should_** suffice.

I recommend using the **LATEST** version of raspbian.

### 1. Cloning the repository
Clone it to your pi using 

```git clone https://github.com/karunikachoo/Motioneye-RPi-RTSP-Hub.git```

or just download the repo and unzip the file.

### 2. NPM

You must have `npm` installed to use this, you can follow [this guide to install it on your Pi](https://linuxize.com/post/how-to-install-node-js-on-raspberry-pi/). I would personally recommend using `nvm` but that is just me.

Once you have installed `npm`, `cd` into your folder and run: 

`npm install`

The system is validated to work on `npm v12.13.1` and should be version agnostic AFAIK. Let me know if there are any issues.

### 3. Python modules

Python module dependencies:

```
opencv-python==3.4.6.27
python-socketio
pyaudio
```

Install them using `sudo pip3 install pyaudio` etc.

##### OpenCV

At the time of writing, Raspbian is still not compatible with the latest version of opencv as shown [here](https://github.com/EdjeElectronics/TensorFlow-Object-Detection-on-the-Raspberry-Pi/issues/67). It is recommended that you install an older version (3.4.6.27) using the following command.

`sudo pip3 install opencv-python==3.4.6.27`

Also make sure that you install the openCV dependencies such as:

```
libatlas-base-dev
libqt4-test
```

using `sudo apt install libqt4-test` etc.

Searching Google for the missing libs that are mentioned in the traceback when running `python3 camera/rtsp_streamer.py` should sort out most dependency issues.

##### Pyaudio / Port Audio
Pyaudio is wrapper with python bindings for Port Audio v19. As such, it is required that you install Port Audio.

```
sudo apt-get update

sudo apt-get install libportaudio0 libportaudio2 libportaudiocpp0 portaudio19-dev

sudo apt-get install python-dev 
```

##### Testing if everything works
Run the following commands to see if there are any dependency issues. Socket.io will throw a fuss about not being able to connect to the server but it should be ok apart from that.

```
python3 camera/rtsp_streamer.py

python3 audio/speaker.py
```

### 4. Recaptcha
This system uses Google's Recaptcha V3 system to mitigate DDOS logins. There currently is no option to disable it in the dashboard. But it is easy to set up or, if you're code savy, disable in code.

1. Start by registering your recaptcha keys @ [https://g.co/recaptcha/v3](https://g.co/recaptcha/v3).
2. Make sure to add your device's local IP address (e.g. 192.168.x.x) and/or your internet facing domain name (e.g. cams.yoururlhere.com).
3. Copy and paste your recaptcha site key into `auth/recaptchav3.sitekey` and your secret into `auth/recaptchav3.secret`.

### 5. Check that everything works / First Setup
```
cd the_repo_directory

npm start
```

Before exposing your pi towards the internet, it might be advisable that you setup your user accounts locally. 

The system automatically sets up an `admin` account with password `admin` for new installations.

1. Log in to the system using user `admin` and pass `admin`.
2. Go to the Dashboard.
3. Create a User with your desired username and a strong password.
4. Click on the "Admin" button on the newly created user to enable it as an admin.
5. Log out of `admin` and login with your new user credentials
6. Delete the `admin` account. Alternatively, change its password to something strong. 

##### Changing Password

1. Click on "Edit" on the user card
2. Enter new password
3. Submit

##### Adding Cameras

1. Click on the "+ Camera" button to add another camera. 
2. Give it a name.
3. Put in the FULL url e.g. `http://192.168.1.100:8080` you can try to prepend user credentials for your RTSP stream (not tested) by `http://user:pass@192.168.1.100:8080`
4. Submit!

##### Assigning Cameras to Users

1. Go to the user you want, click "Add Camera".
2. Select the camera you want to assign to the user from the dropdown.
3. Submit.

##### Enabling voice of god for users

1. Click the "Audio" button on the user card

### 6. Slack Webhook integration

1. Make sure you have a Slack account and workspace.
2. Follow [this guide to create an app and add a webhook to your Slack channel](https://api.slack.com/messaging/webhooks)
3. Copy the webhook URL and go into your dashboard, paste it into the "new webhook url" input area and submit.
4. You'll receive a slack message saying that you have changed the URL.

### 7. Autorun (PM2) (optional but recommended)

1. Install PM2 using `npm install -g pm2`
2. Start your instance `pm2 start path_to_your_repo/bin/www`

To make autostart at reboot

`pm2 startup systemd`

follow on screen command to set up

### 8. Bluetooth Audio (optional)
1. Start your Raspberry Pi into desktop mode. 
2. Enable bluetooth using the BT icon in the top right.
3. Pair your speaker with your Pi.
4. Right click the speaker icon on the top right and select your speaker from the drop down.
5. Restart the system and test. LMK if you have any issues.

## I want to access my website from outside of my home

### 1. NGINX Reverse Proxy
Install Nginx on your pi `sudo apt install nginx`

Setup your config

`sudo nano /etc/nginx/sites-available/default`

or

`sudo nano /etc/nginx/sites-available/your_custom_file_name`

put in the following lines

```
server {
	listen 8080;
	server_name xyz.example.com;

	location / {
		proxy_set_header X-Forwarded-For $remote_addr;
		proxy_pass http://192.168.1.xxx:3000/;
		access_log on;
	}
}
```

Make sure you change your `xyz.example.com` to the domain name you are using and `192.168.1.xxx` to the local ip address of your Pi.

then create a symbolic link to `/etc/nginx/sites-enabled` if you are using a custom file.

`sudo ln -s /etc/nginx/sites-available/your_custom_file_name /etc/nginx/sites-enabled/your_custom_file_name`

Restart nginx

`sudo service nginx restart`

##### SSL Certificates
If you plan to ensure that your connection is SSL secured, modify the config file as follows.

```
server {
	listen 80 default_server;
	server_name xyz.example.com;

	rewrite ^ https://xyz.example.com$request_uri;
}

server {
	listen 8080;
	server_name xyz.example.com;

	ssl_certificate /home/pi/your_chain.crt;
	ssl_certificate_key /home/pi/your_cert.key;

	ssl on;
	ssl_session_cache builtin:1000 shared:SSL:10m;
	ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
	ssl_ciphers HIGH:!aNULL:!eNULL:!EXPORT:!CAMELLIA:!DES:!MD5:!PSK:!RC4;
	ssl_prefer_server_ciphers on;

	location / {
		proxy_set_header X-Forwarded-For $remote_addr;
		proxy_pass http://192.168.1.xxx:3000/;
		access_log on;
	}
}
```

remember to change `xyz.example.com`, `192.168.1.xxx`, `your_chain.crt` and `your_cert.key`.

The first set redirects `http://` requests to `https://`. 

The second set adds SSL support to your reverse proxy.

SSL certs can be obtained from your domain name host or Let's Encrypt. Follow respective guides on how to set those up.

### 3. Port Forwarding

This may vary by router but set this up to forward traffic on a specific external port to `192.168.1.xxx:8080` which is defined at the start of the nginx config file by `listen 8080`. You can change this if you want.

If you're using ssl certificates as discussed above you can forward port `80` to port `80` on your pi and `443` to `8080` (or whatever you've chosen).

port `80` is the default port for `http://` requests while port `443` is default for `https://`

### 4. Point your domain name to your IP address
You can obtain this by searching your ip on google chrome.

You can setup Dynamic DNS for your domain if your domain name host supports it.

Additionally, you can install ddclient and follow the recommended setting s specific to your domain name host and/or edit the config file in `/etc/ddclient.conf`.

##### FOLLOW DIRECTIONS FROM YOUR DOMAIN NAME HOSTS

### SSH notifier
If you want to be notified each time someone opens a ssh tunnel into your 
Pi (be it yourself or a potential attacker) you can use this.

But I have not checked if it will show up in `/var/log/auth.log` if 
for some reason the attacker was able to open a `reverse shell` trough 
a remote execution vulnerability (which I hope we don't have).

From what I can see, the default Pi distribution's `netcat` does not support
the `-e` parameter which is used to open a remote shell, but this does not rule out an attacker installing
`ncat` (which does have support for `-e`) given a remote execution vuln.

At least you will be notified and if you're close by or have some other system
in place, you can shutdown your server before it is too late. 

open up `auth/ssh_checker.py`, scroll all the way down to 

```
s = SSHChecker('/var/log/auth.log',
                   "YOUR SLACK WEBHOOK URL HERE")
```

replace `"YOUR SLACK WEBHOOK URL HERE"` with your slack webhook URL with the quotation marks. e.g. 
```
s = SSHCHECKER('/var/log/auth.log',
                "https://hooks.slack.com/services/ABCDEFGHI/ABCDEFGHIJK/ABCdEfGhIjKlmNoPqRsTuVwX"
```

then make it run perpetually with PM2.

`pm2 start path_to_your_repo/auth/ssh_checker.py --interpreter=python3`

## YOU'RE SET UP! ENJOY!
