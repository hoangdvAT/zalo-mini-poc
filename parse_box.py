from PIL import Image
import sys
from collections import Counter

def parse_box(path):
    img = Image.open(path).convert('RGB')
    width, height = img.size
    print(f"Image size: {width}x{height}")
    
    # center pixel
    cx, cy = width//2, height//2
    print(f"Center color: #{img.getpixel((cx, cy))[0]:02x}{img.getpixel((cx, cy))[1]:02x}{img.getpixel((cx, cy))[2]:02x}")
    
    # top-left corner might be white or the box
    print(f"Top-left (0,0): #{img.getpixel((0,0))[0]:02x}{img.getpixel((0,0))[1]:02x}{img.getpixel((0,0))[2]:02x}")
    
    # let's scan a line across the middle
    colors = []
    for x in range(width):
        r, g, b = img.getpixel((x, cy))
        colors.append('#%02x%02x%02x' % (r, g, b))
    
    c = Counter(colors)
    print("Most common colors across the middle line:")
    for k, v in c.most_common(5):
        print(f"{k}: {v} pixels")

parse_box(sys.argv[1])
