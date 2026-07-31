import re

file_path = r'C:\Users\junio\Desktop\Asaas Oportunity\server\routes\whatsappRoutes.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

new_func = '''function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
  }
  crcTable[i] = c;
}

function addMediaFingerprint(base64Data, mimeType) {
  try {
    const buf = Buffer.from(base64Data, "base64");
    const randStr = crypto.randomBytes(6).toString('hex'); // 12 bytes of hex
    
    // Check for JPEG: starts with FF D8
    if (buf.length > 2 && buf[0] === 0xFF && buf[1] === 0xD8) {
      // Create COM segment: FF FE 00 10 [14 bytes string]
      const comment = "JPB-" + randStr; // 16 bytes total string (16 + 2 = 18 bytes length)
      const comLen = Buffer.byteLength(comment) + 2; // +2 for the length bytes themselves
      
      const comSegment = Buffer.alloc(comLen + 2); // +2 for FF FE
      comSegment[0] = 0xFF;
      comSegment[1] = 0xFE;
      comSegment[2] = (comLen >> 8) & 0xFF;
      comSegment[3] = comLen & 0xFF;
      comSegment.write(comment, 4, 'ascii');
      
      // Insert right after FF D8 (the first 2 bytes)
      const newBuf = Buffer.concat([buf.slice(0, 2), comSegment, buf.slice(2)]);
      return newBuf.toString("base64");
    }
    
    // Check for PNG: starts with 89 50 4E 47 0D 0A 1A 0A
    if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
      // Create a tEXt chunk
      const keyword = "Comment";
      const text = "JPB-" + randStr;
      const chunkData = Buffer.alloc(keyword.length + 1 + text.length);
      chunkData.write(keyword, 0, "ascii");
      chunkData[keyword.length] = 0; // null separator
      chunkData.write(text, keyword.length + 1, "ascii");
      
      const chunkType = Buffer.from("tEXt", "ascii");
      const lengthBuf = Buffer.alloc(4);
      lengthBuf.writeUInt32BE(chunkData.length, 0);
      
      // CRC is calculated over chunkType + chunkData
      const crcInput = Buffer.concat([chunkType, chunkData]);
      const crcValue = crc32(crcInput);
      const crcBuf = Buffer.alloc(4);
      crcBuf.writeUInt32BE(crcValue, 0);
      
      const textChunk = Buffer.concat([lengthBuf, chunkType, chunkData, crcBuf]);
      
      // Insert right after the 8-byte PNG signature
      const newBuf = Buffer.concat([buf.slice(0, 8), textChunk, buf.slice(8)]);
      return newBuf.toString("base64");
    }
    
    // If not JPEG or PNG, return original to avoid corruption
    return base64Data;
  } catch (e) {
    console.error("[API] Error in addMediaFingerprint:", e);
    return base64Data;
  }
}'''

# Replace the existing addMediaFingerprint
pattern = re.compile(r'function addMediaFingerprint\(base64Data, mimeType\) \{.*?\n\}', re.DOTALL)
if pattern.search(content):
    content = pattern.sub(new_func, content)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Safe fingerprint function injected!")
else:
    print("Function addMediaFingerprint not found!")
