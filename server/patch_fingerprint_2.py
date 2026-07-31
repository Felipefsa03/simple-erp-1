import re

file_path = r'C:\Users\junio\Desktop\Asaas Oportunity\server\routes\whatsappRoutes.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'function addMediaFingerprint\(base64Data, mimeType\) \{.*?\n\}', re.DOTALL)
new_func = '''function addMediaFingerprint(base64Data, mimeType) {
  // WhatsApp is too strict about image formats and rejects trailing bytes or injected headers.
  // We will return the original image untouched to avoid corruption errors.
  return base64Data;
}'''

if pattern.search(content):
    content = pattern.sub(new_func, content)
else:
    print("Function not found!")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fingerprint function disabled completely!")
