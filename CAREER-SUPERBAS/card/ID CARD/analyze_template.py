"""
Analyze 1.png to find the red box and blue frame coordinates.
Then create a transparent-hole version of the template.
"""
from PIL import Image, ImageDraw
import json

img = Image.open('1.png').convert('RGBA')
w, h = img.size
pixels = img.load()

print(f"Image size: {w} x {h}")

# Scan for red pixels (the red box area)
red_pixels = []
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        # Red-ish pixels: high red, low green, low blue
        if r > 180 and g < 80 and b < 80:
            red_pixels.append((x, y))

if red_pixels:
    min_x = min(p[0] for p in red_pixels)
    max_x = max(p[0] for p in red_pixels)
    min_y = min(p[1] for p in red_pixels)
    max_y = max(p[1] for p in red_pixels)
    print(f"\nRed box bounds:")
    print(f"  Top-left:     ({min_x}, {min_y})")
    print(f"  Bottom-right: ({max_x}, {max_y})")
    print(f"  Width:  {max_x - min_x}")
    print(f"  Height: {max_y - min_y}")
    print(f"  As %: top={min_y/h*100:.1f}%, left={min_x/w*100:.1f}%, w={((max_x-min_x)/w)*100:.1f}%, h={((max_y-min_y)/h)*100:.1f}%")
else:
    print("No red pixels found!")

# Scan for blue frame pixels (the blue border around the photo area)
# Blue border: high blue, medium-high values
blue_frame_pixels = []
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        # Strong blue, like the frame border
        if b > 150 and r < 100 and g < 100 and b > r + 80:
            blue_frame_pixels.append((x, y))

if blue_frame_pixels:
    bf_min_x = min(p[0] for p in blue_frame_pixels)
    bf_max_x = max(p[0] for p in blue_frame_pixels)
    bf_min_y = min(p[1] for p in blue_frame_pixels)
    bf_max_y = max(p[1] for p in blue_frame_pixels)
    print(f"\nBlue frame bounds:")
    print(f"  Top-left:     ({bf_min_x}, {bf_min_y})")
    print(f"  Bottom-right: ({bf_max_x}, {bf_max_y})")
    print(f"  As %: top={bf_min_y/h*100:.1f}%, left={bf_min_x/w*100:.1f}%")

# Also look for the dark horizontal line below the photo area
# Scan horizontal lines looking for a thin dark stripe
print(f"\nScanning for horizontal line below photo area...")
for y in range(int(h * 0.6), int(h * 0.9)):
    dark_count = 0
    for x in range(int(w * 0.15), int(w * 0.85)):
        r, g, b, a = pixels[x, y]
        if r < 60 and g < 60 and b < 60 and a > 200:
            dark_count += 1
    line_width = int(w * 0.7)
    if dark_count > line_width * 0.5:  # At least 50% of the scan width is dark
        print(f"  Potential line at y={y} ({y/h*100:.1f}%), dark pixels: {dark_count}")

print("\nDone!")
