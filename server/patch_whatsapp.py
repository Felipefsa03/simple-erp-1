import re

with open(r'C:\Users\junio\Desktop\Asaas Oportunity\server\routes\whatsappRoutes.js', 'r', encoding='utf-8') as f:
    content = f.read()

if 'import sharp from "sharp";' not in content:
    if 'import crypto from "crypto";' in content:
        content = content.replace('import crypto from "crypto";', 'import crypto from "crypto";\nimport sharp from "sharp";')
    else:
        content = 'import sharp from "sharp";\n' + content

old_func_pattern = r'function addMediaFingerprint\(base64Data, mimeType\) \{[\s\S]*?return base64Data;\n\s*\}\n\s*\}'
new_func = """async function addMediaFingerprint(base64Data, mimeType) {
  try {
    const buf = Buffer.from(base64Data, "base64");
    if (!mimeType || (!mimeType.includes("jpeg") && !mimeType.includes("png"))) {
      return base64Data;
    }
    
    // Use sharp to slightly alter the image by changing quality randomly
    const randomQuality = Math.floor(Math.random() * 5) + 90; // 90 to 94
    let processedBuf;
    
    if (mimeType.includes("png")) {
      processedBuf = await sharp(buf)
        .png({ compressionLevel: Math.floor(Math.random() * 3) + 6 }) // Random compression
        .toBuffer();
    } else {
      processedBuf = await sharp(buf)
        .jpeg({ quality: randomQuality }) // Random quality changes file hash
        .toBuffer();
    }
    
    return processedBuf.toString("base64");
  } catch (e) {
    console.error("[API] Error in addMediaFingerprint:", e);
    return base64Data;
  }
}"""

content = re.sub(old_func_pattern, new_func, content)

content = content.replace(
    'const fingerprintedMedia = addMediaFingerprint(media, mimeType || "image/jpeg");',
    'const fingerprintedMedia = await addMediaFingerprint(media, mimeType || "image/jpeg");'
)

with open(r'C:\Users\junio\Desktop\Asaas Oportunity\server\routes\whatsappRoutes.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("whatsappRoutes.js patched successfully.")
