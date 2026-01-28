const { chromium } = require("playwright");

(async () => {
	const nombre = process.argv[2];
	const PORT = process.env.PORT || 3000;
	const versionFile = 38;

	if (!nombre) {
		console.error("Room sin nombre");
		process.exit(1);
	}

	const browser = await chromium.launch({
		headless: true,
		args: [
			"--disable-gpu",
			"--disable-software-rasterizer",
			"--disable-background-timer-throttling",
			"--disable-backgrounding-occluded-windows",
			"--disable-renderer-backgrounding",
		],
	});

	const context = await browser.newContext();
	const page = await context.newPage();
	await page.setViewportSize({ width: 320, height: 240 });

	// 🔥 Simula pestaña minimizada
	/* 	await page.addInitScript(() => {
		Object.defineProperty(document, "hidden", { get: () => true });
		Object.defineProperty(document, "visibilityState", {
			get: () => "hidden",
		});
		document.dispatchEvent(new Event("visibilitychange"));
	}); */
	const safeNombre = encodeURIComponent(nombre);

	await page.goto(
		`http://localhost:${PORT}/RustCoon${versionFile}/index.html?nombre=${safeNombre}`,
		{ waitUntil: "load" },
	);
	await page.setViewportSize({ width: 1, height: 1 });

	console.log(`🟢 Room ${nombre} iniciada`);

	process.on("SIGTERM", async () => {
		console.log(`🔴 Cerrando room ${nombre}`);
		await browser.close();
		process.exit(0);
	});
})();
