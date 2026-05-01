from PIL import Image
import os

img_path = r'c:\Users\junio\Desktop\Asaas Oportunity\frontend\public\logo-full.png'
icon_path = r'c:\Users\junio\Desktop\Asaas Oportunity\frontend\public\logo-icon.png'

if os.path.exists(img_path):
    img = Image.open(img_path).convert("RGBA")
    
    # Trim the original logo to remove excessive white space
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        img.save(img_path) # Overwrite with trimmed version
        print(f"Trimmed logo-full saved")
    
    # Now create the icon (just the cross)
    width, height = img.size
    # The cross is on the left. In the trimmed version, it's the left part.
    # Let's find the first vertical gap or just crop a square from the left.
    icon_width = height
    img_icon = img.crop((0, 0, icon_width, height))
    
    # Trim icon again
    bbox_icon = img_icon.getbbox()
    if bbox_icon:
        img_icon = img_icon.crop(bbox_icon)
        
    img_icon.save(icon_path)
    print(f"Icon saved to {icon_path}")
else:
    print("Image not found")
