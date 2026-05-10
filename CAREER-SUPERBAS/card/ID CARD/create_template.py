"""
Create transparent-hole template v3.
Bigger corner radius to match the blue frame border.
"""
from PIL import Image, ImageDraw

img = Image.open('1.png').convert('RGBA')
w, h = img.size

hole_left = 780
hole_top = 1620
hole_right = 2305
hole_bottom = 3555

mask = Image.new('L', (w, h), 255)
draw = ImageDraw.Draw(mask)

# Increase corner radius to match blue frame roundness
corner_radius = 120
draw.rounded_rectangle(
    [hole_left, hole_top, hole_right, hole_bottom],
    radius=corner_radius,
    fill=0
)

img.putalpha(mask)
img.save('1-template.png', 'PNG')
print(f"Done! Corner radius: {corner_radius}px")
