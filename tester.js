const fetch = require('node-fetch'); // or native fetch if node > 18
(async () => {
    try {
        const res = await fetch("https://clinxia.vercel.app/api/whatsapp/connect", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true"
            },
            body: JSON.stringify({ clinicId: "clinic-1", phoneNumber: "" })
        });
        const text = await res.text();
        console.log("STATUS:", res.status);
        console.log("BODY:", text);
    } catch (e) {
        console.error("ERROR:", e);
    }
})();
