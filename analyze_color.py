from PIL import Image
import sys

def get_colors(image_path):
    try:
        img = Image.open(image_path).convert('RGB')
        # get colors
        colors = img.getcolors(maxcolors=1000000)
        # sort by count
        colors.sort(reverse=True, key=lambda x: x[0])
        print("Top colors:")
        for count, color in colors[:10]:
            hex_color = '#%02x%02x%02x' % color
            print(f"{hex_color}: {count} pixels")
    except Exception as e:
        print(f"Error: {e}")

if len(sys.argv) > 1:
    get_colors(sys.argv[1])
else:
    print("Please provide an image path")
