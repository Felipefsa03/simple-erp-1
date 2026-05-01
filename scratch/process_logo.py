from PIL import Image
import os

img_path = r'c:\Users\junio\Desktop\Asaas Oportunity\frontend\public\logo-full.png'
icon_path = r'c:\Users\junio\Desktop\Asaas Oportunity\frontend\public\logo-icon.png'
white_path = r'c:\Users\junio\Desktop\Asaas Oportunity\frontend\public\logo-white.png'

if os.path.exists(img_path):
    img = Image.open(img_path).convert("RGBA")
    
    # Trim transparency
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        img.save(img_path)
    
    # Save as white (filter handles it in component)
    img.save(white_path)
    
    # Create icon (square cross from left)
    width, height = img.size
    img_icon = img.crop((0, 0, height, height))
    bbox_icon = img_icon.getbbox()
    if bbox_icon:
        img_icon = img_icon.crop(bbox_icon)
    img_icon.save(icon_path)
    print("Logo processed successfully")
else:
    print("Logo not found")
