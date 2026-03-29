(async () => {
    try {
        console.log("Connecting...");
        const res = await fetch("https://clinxia.vercel.app/api/whatsapp/connect", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true"
            },
            body: JSON.stringify({ clinicId: "clinic-1", phoneNumber: "" })
        });
        const text = await res.text();
        console.log("Connect RESPONSE:", text);

        for(let i = 0; i < 5; i++) {
            await new Promise(r => setTimeout(r, 2000));
            console.log("Polling status...");
            const res2 = await fetch("https://clinxia.vercel.app/api/whatsapp/status/clinic-1?t=" + Date.now(), {
                cache: 'no-store',
                headers: { "ngrok-skip-browser-warning": "true" }
            });
            console.log("STATUS:", await res2.text());
        }
    } catch (e) {
        console.error("ERROR:", e);
    }
})();
