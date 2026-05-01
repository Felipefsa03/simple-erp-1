from PIL import Image
import os

img_path = r'c:\Users\junio\Desktop\Asaas Oportunity\frontend\public\logo-full.png'
save_path = r'c:\Users\junio\Desktop\Asaas Oportunity\frontend\public\logo-icon.png'

if os.path.exists(img_path):
    img = Image.open(img_path)
    # The logo has the cross on the left.
    # Let's crop roughly the first 40% of the width.
    width, height = img.size
    # Crop the cross (left side)
    # Assuming the cross is a square-ish aspect ratio on the left
    icon_width = int(height * 1.2) # A bit wider than height to be safe
    img_icon = img.crop((0, 0, icon_width, height))
    
    # Trim transparency
    bbox = img_icon.getbbox()
    if bbox:
        img_icon = img_icon.crop(bbox)
        
    img_icon.save(save_path)
    print(f"Icon saved to {save_path}")
    
    # Create white version (just invert text if possible, but simpler is just keep as is for now)
    # Actually, let's try to make it visible on dark backgrounds by adding a slight glow or something
    # but the user just wants the logo they sent.
else:
    print("Image not found")
