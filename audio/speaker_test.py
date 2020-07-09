import time

import pyaudio
import wave
import sys
import struct

CHUNK = 1024

"""
https://www.codeproject.com/Articles/501521/How-to-convert-between-most-audio-formats-in-NET
"""


def stereo_to_mono(data_in):
    """
    byte[] output = new byte[input.Length / 2];
        int outputIndex = 0;
        for (int n = 0; n < input.Length; n+=4)
        {
            // copy in the first 16 bit sample
            output[outputIndex++] = input[n];
            output[outputIndex++] = input[n+1];
        }
    """
    output = bytearray()
    for n in range(len(data_in)):
        if n % 4 == 0:
            output.append(data_in[n])
            output.append(data_in[n + 1])
    return bytes(output)


def uint8_to_float(data_in):
    output = bytearray()
    for n in range(len(data_in)):
        output.extend(struct.pack('f', data_in[n] / 255.0))

    return bytes(output)

def uint8_to_int8(data_in):
    output = bytearray()
    for n in range(len(data_in)):
        output.append((data_in[n] - 128) % 256)
    return bytes(output)


def callback(in_data, frame_count, time_info, status):
    data = wf.readframes(frame_count)
    print(data)
#     return uint8_to_float(stereo_to_mono(data)), pyaudio.paContinue
    return uint8_to_int8(stereo_to_mono(data)), pyaudio.paContinue


if len(sys.argv) < 2:
    print("Plays a wave file.\n\nUsage: %s filename.wav" % sys.argv[0])
    sys.exit(-1)

wf = wave.open(sys.argv[1], 'rb')

p = pyaudio.PyAudio()

stream = p.open(
    # format=p.get_format_from_width(wf.getsampwidth()),
#     format=pyaudio.paFloat32,
    format=pyaudio.paInt8,
    # channels=wf.getnchannels(),
    channels=1,
    # rate=wf.getframerate(),
    rate=44100,
    output=True,
    stream_callback=callback)
# print(p.get_format_from_width(wf.getsampwidth()))
print(pyaudio.paFloat32)
# data = wf.readframes(CHUNK)
#
# while data != '':
#     stream.write(uint8_to_float(stereo_to_mono(data)))
#     data = wf.readframes(CHUNK)

stream.start_stream()

while stream.is_active():
    time.sleep(2)

stream.stop_stream()
stream.close()
p.terminate()


wf = wave.open(sys.argv[1], 'rb')

p = pyaudio.PyAudio()

stream = p.open(
    # format=p.get_format_from_width(wf.getsampwidth()),
#     format=pyaudio.paFloat32,
    format=pyaudio.paInt8,
    # channels=wf.getnchannels(),
    channels=1,
    # rate=wf.getframerate(),
    rate=44100,
    output=True,
    stream_callback=callback)
# print(p.get_format_from_width(wf.getsampwidth()))
print(pyaudio.paFloat32)
# data = wf.readframes(CHUNK)
#
# while data != '':
#     stream.write(uint8_to_float(stereo_to_mono(data)))
#     data = wf.readframes(CHUNK)

stream.start_stream()

while stream.is_active():
    time.sleep(2)

stream.stop_stream()
stream.close()
p.terminate()
