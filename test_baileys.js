import { useMultiFileAuthState, makeWASocket } from 'baileys';
import path from 'path';
import fs from 'fs';

async function testBaileys() {
    const authDir = path.join(process.cwd(), 'server', 'auth', 'test-clinic');
    if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

    console.log('Starting Baileys test...');
    try {
        const { state, saveCreds } = await useMultiFileAuthState(authDir);
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            browser: ['Test', 'Chrome', '1.0']
        });

        sock.ev.on('connection.update', (update) => {
            const { connection, qr } = update;
            console.log('Update:', connection, !!qr);
            if (qr) {
                console.log('QR CODE GENERATED!');
                process.exit(0);
            }
        });

        sock.ev.on('creds.update', saveCreds);

        setTimeout(() => {
            console.log('Timeout - No QR generated in 30s');
            process.exit(1);
        }, 30000);

    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}

testBaileys();
