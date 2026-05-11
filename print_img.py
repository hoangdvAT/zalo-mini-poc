from PIL import Image
import sys

def print_img(path):
    img = Image.open(path).convert('RGB')
    # Resize to fit in terminal
    img.thumbnail((80, 80))
    for y in range(img.height):
        line = ""
        for x in range(img.width):
            r, g, b = img.getpixel((x, y))
            # simple luminance to ascii
            lum = 0.2126*r + 0.7152*g + 0.0722*b
            if lum > 200: line += " "
            elif lum > 100: line += "."
            else: line += "#"
        print(line)

print_img(sys.argv[1])
