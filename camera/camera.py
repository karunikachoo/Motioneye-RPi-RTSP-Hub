import time

import cv2
import base64
import socketio
import threading


class Camera(threading.Thread):
    def __init__(self, sio, camera_uuid, parent_url, stream_url):
        super().__init__()
        self.keep_alive = threading.Event()
        self.keep_alive.set()

        self.uid = camera_uuid
        self.parent_url = parent_url
        self.stream_url = stream_url

        self.sio = sio
        self.stream = None
        self.fps = 0

        self.pause = False
        self.sleep = 0.1
        self.prev_time = time.time()
        self.target_fps = 1

    def connect(self):
        # self.sio.connect(self.parent_url)
        self.stream = cv2.VideoCapture(self.stream_url)

        print(self.stream.getBackendName())

        self.fps = self.stream.get(cv2.CAP_PROP_FPS)
        self.sleep = 1/(2.0 * self.fps)

    def run(self):
        try:
            self.connect()
            while self.keep_alive.isSet():
                ret, frame = self.stream.read()

                if not ret:
                    print('err: ret')
                    break
                else:
                    if not self.pause:
                        if time.time() - self.prev_time >= 1/float(self.target_fps):
                            _, buffer = cv2.imencode('.jpg', frame)
                            try:
                                fr = base64.b64encode(buffer).decode()
                                # print(fr)
                                self.sio.emit('python-camera', {
                                    'uid': self.uid,
                                    'frame': fr
                                })
                                # self.sio.emit(self.uid, fr)
                            except Exception as e:
                                print(e)
                                pass
                            self.prev_time = time.time()
                if cv2.waitKey(20) & 0xFF == ord('q'):
                    print('err')
                    break
                time.sleep(self.sleep)

        except Exception as e:
            print(e)
            # self.end()

    def end(self):
        # print('releasing stream')
        # self.stream.release()
        print('clearing alive')
        self.keep_alive.clear()
        print('joining')
        self.join(timeout=1)
        print('done')


