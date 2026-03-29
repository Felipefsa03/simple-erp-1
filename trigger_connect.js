(async () => {
    try {
        console.log("Triggering connect...");
        const res = await fetch("http://localhost:8787/api/whatsapp/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clinicId: "clinic-1", phoneNumber: "" })
        });
        const data = await res.json();
        console.log("Connect RESPONSE:", JSON.stringify(data));

        console.log("Waiting for QR Code (max 30s)...");
        for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 1000));
            const res2 = await fetch("http://localhost:8787/api/whatsapp/status/clinic-1");
            const d2 = await res2.json();
            process.stdout.write("."); // Progress
            if (d2.status === "qr") {
                console.log("\nSUCCESS! QR Code found.");
                process.exit(0);
            }
            if (d2.status === "error") {
                console.log("\nERROR from server:", d2.message);
                process.exit(1);
            }
        }
        console.log("\nTIMEOUT waiting for QR.");
        process.exit(1);
    } catch (e) {
        console.error("\nFETCH ERROR:", e);
        process.exit(1);
    }
})();
