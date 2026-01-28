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
			"--no-sandbox",
			"--disable-gpu",
			"--mute-audio",
			"--disable-dev-shm-usage",
			"--no-zygote",
			"--disable-breakpad",
			"--log-level=3",
		],
	});

	const context = await browser.newContext();
	const page = await context.newPage();
	await page.setViewportSize({ width: 1, height: 1 });

	// 🔥 Simula pestaña minimizada
	/* 	await page.addInitScript(() => {
		Object.defineProperty(document, "hidden", { get: () => true });
		Object.defineProperty(document, "visibilityState", {
			get: () => "hidden",
		});
		document.dispatchEvent(new Event("visibilitychange"));
	}); */
	const safeNombre = encodeURIComponent(nombre);
	await page.addInitScript(() => {
		const MAX_FPS = 60;
		const FRAME_TIME = 1000 / MAX_FPS;

		const _raf = window.requestAnimationFrame.bind(window);

		window.requestAnimationFrame = function (cb) {
			return _raf(function (t) {
				setTimeout(() => cb(t), FRAME_TIME);
			});
		};
	});

	await page.goto(
		`http://localhost:${PORT}/RustCoon${versionFile}/index.html?nombre=${safeNombre}`,
		{ waitUntil: "load" },
	);

	console.log(`🟢 Room ${nombre} iniciada`);

	process.on("SIGTERM", async () => {
		console.log(`🔴 Cerrando room ${nombre}`);
		await browser.close();
		process.exit(0);
	});
})();
