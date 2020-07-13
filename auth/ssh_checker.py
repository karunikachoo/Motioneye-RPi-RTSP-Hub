import time
import requests


class SSHChecker:
    def __init__(self, auth_path, webhook_url):
        self.auth_path = auth_path
        self.webhook_url = webhook_url
        self.history = []

    def check(self):
        f = open(self.auth_path, 'r')
        data = f.readlines()
        f.close()

        to_notify = []

        for line in data:
            if "ssh" in line or "systemd-logind" in line:
                if line not in self.history:
                    self.history.append(line)
                    to_notify.append(line)
                    print(line)

        if len(to_notify) > 0:
            string = '```' + '\n'.join(to_notify) + '```'
            requests.post(self.webhook_url, json={
                "text": string
            })


if __name__ == '__main__':
    s = SSHChecker('/var/log/auth.log',
                   "YOUR SLACK WEBHOOK URL HERE")
    while True:
        try:
            s.check()
            time.sleep(1)
        except Exception as e:
            print(e)
            break
