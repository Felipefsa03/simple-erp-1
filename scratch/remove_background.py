from PIL import Image
import os

img_path = r'c:\Users\junio\Desktop\Asaas Oportunity\frontend\public\logo-full.png'
save_path = r'c:\Users\junio\Desktop\Asaas Oportunity\frontend\public\logo-full.png' # Overwrite

def remove_checkerboard(img):
    img = img.convert("RGBA")
    datas = img.getdata()
    
    new_data = []
    # Most "fake transparent" checkerboards use white (255,255,255) 
    # and light gray (usually 204,204,204 or 192,192,192)
    for item in datas:
        # If it's pure white or very close to light gray
        if (item[0] > 240 and item[1] > 240 and item[2] > 240) or \
           (190 <= item[0] <= 210 and 190 <= item[1] <= 210 and 190 <= item[2] <= 210):
            new_data.append((255, 255, 255, 0)) # Make transparent
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    return img

if os.path.exists(img_path):
    img = Image.open(img_path)
    img = remove_checkerboard(img)
    
    # Trim transparency
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    img.save(save_path)
    print(f"Transparency processed and saved to {save_path}")
    
    # Also update icon and white variants
    icon_path = r'c:\Users\junio\Desktop\Asaas Oportunity\frontend\public\logo-icon.png'
    white_path = r'c:\Users\junio\Desktop\Asaas Oportunity\frontend\public\logo-white.png'
    
    # Save full trimmed as white (filter handles text)
    img.save(white_path)
    
    # Crop icon from the now transparent img
    width, height = img.size
    img_icon = img.crop((0, 0, height, height)) # Square cross on left
    bbox_icon = img_icon.getbbox()
    if bbox_icon:
        img_icon = img_icon.crop(bbox_icon)
    img_icon.save(icon_path)
    print("Updated icon and white variants")
else:
    print("Image not found")
