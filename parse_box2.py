from PIL import Image
import sys
from collections import Counter

def parse_box(path):
    img = Image.open(path).convert('RGB')
    width, height = img.size
    cx = width // 2
    
    colors = []
    for y in range(height):
        r, g, b = img.getpixel((cx, y))
        color = '#%02x%02x%02x' % (r, g, b)
        colors.append(color)
    
    # Print color distribution vertically
    current_color = colors[0]
    count = 1
    for i in range(1, len(colors)):
        if colors[i] == current_color:
            count += 1
        else:
            print(f"y={i-count} to {i-1}: {current_color} ({count} px)")
            current_color = colors[i]
            count = 1
    print(f"y={len(colors)-count} to {len(colors)-1}: {current_color} ({count} px)")

parse_box(sys.argv[1])
