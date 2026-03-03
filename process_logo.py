from PIL import Image

# Open the image
img = Image.open('public/logo_pegasus.png').convert("RGBA")
datas = img.getdata()

# Cut out the pseudo-transparent checkerboard background
newData = []
for item in datas:
    # the checkerboard is primarily gray/white, while the pegasus is golden/yellow
    # we can define a threshold for the checkerboard
    # R, G, B, A = item
    if item[0] > 200 and item[1] > 200 and item[2] > 200:
        # Change all white/light gray (checkerboard) to totally transparent
        newData.append((255, 255, 255, 0))
    else:
        newData.append(item)

img.putdata(newData)
img.save('public/logo_pegasus.png', "PNG")
print("Image background processed.")
