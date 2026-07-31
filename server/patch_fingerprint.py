import re

file_path = r'C:\Users\junio\Desktop\Asaas Oportunity\server\routes\whatsappRoutes.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace addMediaFingerprint to just append bytes at the end
pattern = re.compile(r'function addMediaFingerprint\(base64Data, mimeType\) \{.*?\n\}', re.DOTALL)
new_func = '''function addMediaFingerprint(base64Data, mimeType) {
  try {
    const buf = Buffer.from(base64Data, "base64");
    const randBytes = crypto.randomBytes(12);
    // Para evitar corromper cabealhos (o que o WhatsApp pode rejeitar),
    // apenas anexamos bytes aleatrios no final do arquivo.
    const fingerprintedBuf = Buffer.concat([buf, randBytes]);
    return fingerprintedBuf.toString("base64");
  } catch (e) {
    return base64Data;
  }
}'''

if pattern.search(content):
    content = pattern.sub(new_func, content)
else:
    print("Function not found!")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fingerprint function patched!")
