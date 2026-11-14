"""Generate the app icons (pastel gradient + white sparkle) without external libraries.

Usage:  python tools/make_icons.py
"""
import math
import os
import struct
import zlib

TOP = (214, 196, 255)     # lavender
BOTTOM = (255, 200, 221)  # pink
STAR = (255, 255, 255)
SMALL = (255, 247, 214)


def star_inside(x, y, cx, cy, r_out, r_in):
    """Point-in-4-point-star test using a polar boundary."""
    dx, dy = x - cx, y - cy
    dist = math.hypot(dx, dy)
    if dist > r_out:
        return False
    ang = math.atan2(dy, dx)
    # concave star: radius shrinks towards the diagonals
    t = abs(math.cos(2 * ang))
    boundary = r_in + (r_out - r_in) * (t ** 14)
    return dist <= boundary


def render(size, path):
    ss = 3  # supersampling
    rows = []
    for py in range(size):
        row = bytearray([0])
        for px in range(size):
            acc = [0, 0, 0]
            for sy in range(ss):
                for sx in range(ss):
                    x = (px + (sx + 0.5) / ss) / size
                    y = (py + (sy + 0.5) / ss) / size
                    t = y
                    c = [TOP[i] + (BOTTOM[i] - TOP[i]) * t for i in range(3)]
                    if star_inside(x, y, 0.5, 0.52, 0.34, 0.07):
                        c = STAR
                    elif star_inside(x, y, 0.76, 0.24, 0.11, 0.025):
                        c = SMALL
                    elif star_inside(x, y, 0.25, 0.78, 0.08, 0.02):
                        c = SMALL
                    for i in range(3):
                        acc[i] += c[i]
            row += bytes(int(a / (ss * ss)) for a in acc)
        rows.append(bytes(row))
    raw = b"".join(rows)

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


if __name__ == "__main__":
    out = os.path.join(os.path.dirname(__file__), "..", "icons")
    os.makedirs(out, exist_ok=True)
    render(180, os.path.join(out, "icon-180.png"))
    render(512, os.path.join(out, "icon-512.png"))
    print("icons written")
