(async () => {
    try {
        const res = await fetch("https://clinxia.vercel.app/api/whatsapp/status/clinic-1?t=" + Date.now(), {
            cache: 'no-store',
            headers: {
                "ngrok-skip-browser-warning": "true"
            }
        });
        const text = await res.text();
        console.log("STATUS:", res.status);
        console.log("BODY:", text);
    } catch (e) {
        console.error("ERROR:", e);
    }
})();
