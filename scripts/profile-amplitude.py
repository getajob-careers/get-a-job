#!/usr/bin/env python3
# Chroma profiler — how much of a screenshot actually carries colour. Turns
# "does it feel colourful" into a number so each amplitude rung is an agreed
# target, not an argument. Usage: profile-amplitude.py <img> [label]
import sys
from PIL import Image

def profile(path, label):
    im = Image.open(path).convert("RGB")
    W, H = im.size
    px = im.load()
    tot = W * H
    neutral = faint = real = sat = 0
    for y in range(H):
        for x in range(W):
            r, g, b = px[x, y]
            c = max(r, g, b) - min(r, g, b)  # chroma
            if c < 8:
                neutral += 1
            elif c < 25:
                faint += 1
            elif c < 60:
                real += 1
            else:
                sat += 1
    pc = lambda n: f"{100*n/tot:5.1f}%"
    # "carries colour" = faint+real+sat (anything a viewer reads as tinted)
    carries = faint + real + sat
    print(f"{label:16} neutral {pc(neutral)}  faint {pc(faint)}  real {pc(real)}  "
          f"sat {pc(sat)}  |  CARRIES COLOUR {pc(carries)}  real+sat {pc(real+sat)}")

if __name__ == "__main__":
    profile(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else sys.argv[1])
