import sys
import time
import traceback

import socketio
from pprint import pprint
import queue
import pyaudio


"""
https://www.codeproject.com/Articles/501521/How-to-convert-between-most-audio-formats-in-NET
"""


class ALSASpeaker:
    def __init__(self, parent_url):
        self.parent_url = parent_url

        self.device = 'output'
        self.out = None
        self.p = None
        self.running = False

        self.last_alive = 0

        self.cmd_q = queue.Queue()

        self.sio = socketio.Client()
        self.sio.connect(self.parent_url)

        self.sio.on('identify', self.identify)
        self.sio.on('audio-write', self.write)
        self.sio.on('audio-end', self.end)

        self.data = bytearray()

    def identify(self):
        # if not self.identity_verified:
        print('identity Requested')
            # self.identity_verified = True
        self.sio.emit('identify', 'audio-backend')

    def write(self, data):
        # print(data)
        self.data.extend(data)

        if len(self.data) > len(data) * 2 and not self.running:
            self.create_stream()
            print('stream Created')
            self.out.start_stream()
            print('stream started')

    def end(self):
        self.cmd_q.put(3)

    def create_stream(self):
        self.running = True
        self.p = pyaudio.PyAudio()
        self.data = bytearray()
        self.out = self.p.open(format=pyaudio.paInt8,
                               channels=1,
                               rate=44100,
                               output=True,
                               stream_callback=self.py_audio_callback)

    def py_audio_callback(self, in_data, frame_count, time_info, status):
        if len(self.data) > 0:
            data = bytes(self.data[:frame_count])
            self.data = self.data[frame_count:]

            return data, pyaudio.paContinue
        else:
            return b'\x00' * frame_count, pyaudio.paContinue

    def housekeeping(self):
        """"""
        if not self.cmd_q.empty():
            cmd = self.cmd_q.get(True, 0.001)
            if cmd == 2:
                self.create_stream()
                print('stream Created')
                self.out.start_stream()
                print('stream started')
            elif cmd == 3:
                self.out.stop_stream()
                self.out.close()
                self.p.terminate()
                self.running = False
                self.data = bytearray()
                print('stream terminated')
#         if time.time() - self.last_alive > 30:
#             self.sio.emit('audio-alive')
#             self.last_alive = time.time()

if __name__ == '__main__':
    speaker = ALSASpeaker('http://localhost:3000')
    ka = True
    try:
        while ka:
            speaker.housekeeping()
            time.sleep(0.1)
    except KeyboardInterrupt:
        ka = False
        speaker.p.terminate()
    except Exception as e:
        print(traceback.format_exc())
