(async () => {
    try {
        const res = await fetch("http://localhost:8787/api/whatsapp/status/clinic-1");
        const data = await res.json();
        console.log("STATUS:", JSON.stringify(data));
    } catch (e) {
        console.error("ERROR:", e);
    }
})();
