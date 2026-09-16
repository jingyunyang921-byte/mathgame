#!/usr/bin/env python3
# Minimal Chrome DevTools Protocol client (pure stdlib) to drive the WebView.
# Usage: python3 cdp.py <ws_url> <js_expression>
import sys, socket, base64, os, struct, json, hashlib

def ws_connect(url):
    # ws://host:port/path
    assert url.startswith("ws://")
    rest = url[5:]
    hostport, _, path = rest.partition("/")
    host, _, port = hostport.partition(":")
    port = int(port or 80)
    s = socket.create_connection((host, port))
    key = base64.b64encode(os.urandom(16)).decode()
    req = (
        f"GET /{path} HTTP/1.1\r\n"
        f"Host: {host}:{port}\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        f"Sec-WebSocket-Key: {key}\r\n"
        "Sec-WebSocket-Version: 13\r\n\r\n"
    )
    s.sendall(req.encode())
    buf = b""
    while b"\r\n\r\n" not in buf:
        buf += s.recv(4096)
    return s

def send_text(s, msg):
    data = msg.encode()
    header = bytearray([0x81])  # FIN + text
    n = len(data)
    mask = os.urandom(4)
    if n < 126:
        header.append(0x80 | n)
    elif n < 65536:
        header.append(0x80 | 126); header += struct.pack(">H", n)
    else:
        header.append(0x80 | 127); header += struct.pack(">Q", n)
    header += mask
    masked = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
    s.sendall(bytes(header) + masked)

def _recv_exact(s, n):
    b = b""
    while len(b) < n:
        chunk = s.recv(n - len(b))
        if not chunk:
            raise IOError("socket closed")
        b += chunk
    return b

def recv_frame(s):
    b0, b1 = _recv_exact(s, 2)
    opcode = b0 & 0x0F
    length = b1 & 0x7F
    if length == 126:
        length = struct.unpack(">H", _recv_exact(s, 2))[0]
    elif length == 127:
        length = struct.unpack(">Q", _recv_exact(s, 8))[0]
    payload = _recv_exact(s, length) if length else b""
    return opcode, payload

def recv_message(s):
    # assemble until FIN not needed for small msgs; CDP responses are single frames here
    data = b""
    while True:
        opcode, payload = recv_frame(s)
        if opcode == 0x8:  # close
            raise IOError("ws closed")
        if opcode == 0x9:  # ping -> ignore
            continue
        data += payload
        return data.decode("utf-8", "replace")

def main():
    ws_url, expr = sys.argv[1], sys.argv[2]
    s = ws_connect(ws_url)
    cmd = {"id": 1, "method": "Runtime.evaluate",
           "params": {"expression": expr, "returnByValue": True, "awaitPromise": True}}
    send_text(s, json.dumps(cmd))
    for _ in range(50):
        msg = recv_message(s)
        try:
            obj = json.loads(msg)
        except Exception:
            continue
        if obj.get("id") == 1:
            print(json.dumps(obj.get("result", obj)))
            break
    s.close()

if __name__ == "__main__":
    main()
