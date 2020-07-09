import threading
import time
import traceback
from camera import Camera
import socketio


TIMEOUT = 30        # seconds


class RTSPStreamer:
    def __init__(self, parent_url):
        self.parent_url = parent_url

        self.cameras = {}
        self.last_ping = {}

        self.sio = socketio.Client()
        self.sio.connect(self.parent_url)

        # self.connected = False

        # while not self.connected:
        #     try:
        #         self.sio = socketio.Client()
        #         self.sio.connect(self.parent_url)
        #         self.connected = True
        #     except Exception as e:
        #         print(e)
        #         pass
        #
        #     time.sleep(1)
        self.sio.on('identify', self.identify)
        self.sio.on('add_camera', self.add_cam)
        self.sio.on('remove_camera', self.remove_cam)
        self.sio.on('update_fps', self.update_fps)
        self.sio.on('get_camera_uids', self.get_camera_uids)
        self.sio.on('pause_camera', self.pause_camera)

        print('Initialised')

    def identify(self):
        self.sio.emit('identify', 'python-backend')

    def pause_camera(self, data):
        cam_uuid = data['uid']
        pause = data['pause']

        print(data)
        if cam_uuid in self.cameras:
            self.cameras[cam_uuid].pause = pause

    def get_camera_uids(self):
        self.sio.emit('get_camera_uids', {
            "uids": list(self.cameras.keys())
        })

    def update_fps(self, data):
        cam_uuid = data['uid']
        fps = float(data['fps'])
        if cam_uuid in self.cameras:
            if fps > 0:
                self.cameras[cam_uuid].target_fps = fps
                print('FPS changed to %s for cam %s' % (fps, cam_uuid))

    def add_cam(self, data):
        print('ADD_CAM:')
        cam_uuid = data['uid']
        stream_url = data['url']

        if cam_uuid in self.cameras:
            self.cameras[cam_uuid].end()

        cam = Camera(self.sio, cam_uuid, self.parent_url, stream_url)

        self.cameras[cam_uuid] = cam

        cam.start()
        print("Camera Added & Started for %s @ %s" % (cam_uuid, stream_url))

        self.last_ping[cam_uuid] = time.time()

    def remove_cam(self, data):
        cam_uuid = data['uid']
        self._remove_cam(cam_uuid)

    def _remove_cam(self, cam_uuid):
        if cam_uuid in self.cameras:
            print('Removing camera %s' % cam_uuid)
            self.cameras[cam_uuid].end()

            del self.last_ping[cam_uuid]
            del self.cameras[cam_uuid]

    def heartbeat(self):
        self.sio.emit('python-alive')


if __name__ == '__main__':
    streamer = RTSPStreamer('http://localhost:3000')
    ka = True
    try:
        while ka:
            # streamer.housekeeping()
            streamer.heartbeat()
            time.sleep(2)
    except KeyboardInterrupt:
        ka = False

