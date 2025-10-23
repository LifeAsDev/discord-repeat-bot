const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const fs = require("fs");
const { ServerSignalling } = require("./ServerSignalling");
const http = require("http");

const app = express();
const PORT = 3000;
dotenv.config({ path: "./.env" });
const cors = require("cors");
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const publicPath = path.join(__dirname, "public");

const versionPath = "/filesv19"; // 🔹 cambia esto a /filesv2, /filesv3 cuando actualices
const versionFile = 3;
app.use(
	versionPath,
	express.static(publicPath, {
		etag: false,
		lastModified: false,
		setHeaders: (res) =>
			res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate"),
	})
);

app.use(
	express.static(publicPath, {
		etag: false,
		lastModified: false,
		setHeaders: (res) =>
			res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate"),
	})
);

app.post("/api/token", async (req, res) => {
	console.log({
		client_id: process.env.VITE_DISCORD_CLIENT_ID,
		client_secret: process.env.DISCORD_CLIENT_SECRET,
		grant_type: "authorization_code",
		code: req.body.code,
	});
	const response = await fetch(`https://discord.com/api/oauth2/token`, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			client_id: process.env.VITE_DISCORD_CLIENT_ID,
			client_secret: process.env.DISCORD_CLIENT_SECRET,
			grant_type: "authorization_code",
			code: req.body.code,
		}),
	});

	// Retrieve the access_token from the response
	const { access_token } = await response.json();
	console.log(access_token);
	// Return the access_token to our client as { access_token: "..."}
	res.send({ access_token });
});
app.post("/log", (req, res) => {
	console.log("📱 iOS Log:", req.body.msg);
	res.sendStatus(204);
});
const server = http.createServer(app);

const signalling = new ServerSignalling(server);

server.listen(3000, "0.0.0.0", () => {
	console.log("Servidor corriendo en http://0.0.0.0:3000");
});

const { Client, GatewayIntentBits } = require("discord.js");
const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once("clientReady", () => {
	console.log(`Bot conectado como ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);

// Luego en tu endpoint puedes usarlo
app.post("/send", async (req, res) => {
	console.log(req.body.text);
	const channel = await client.channels.fetch(process.env.CHANNEL_ID);
	await channel.send(req.body.text);
	res.send({ success: true });
});

const rooms = {}; // aquí guardamos los cuartos abiertos { nombre: { browser, page } }
const puppeteer = require("puppeteer-core");

// Crear un cuarto
app.post("/rooms/create", async (req, res) => {
	try {
		const { nombre } = req.body;
		if (rooms[nombre] && nombre !== "") {
			return res.status(400).send({ error: "Ese cuarto ya existe" });
		}

		const browser = await puppeteer.launch({
			headless: true,
			executablePath:
				process.env.CHROME_PATH || "/usr/bin/google-chrome-stable",
			args: [
				"--no-sandbox",
				"--disable-setuid-sandbox",
				"--disable-dev-shm-usage",
				"--disable-extensions",
				"--disable-background-timer-throttling",
				"--disable-gpu",
				"--enable-logging",
				"--v=1",
			],
			dumpio: true,
		});

		browser.on("disconnected", () => {
			console.error(
				"[!] Puppeteer: el navegador se ha desconectado (posible crash)"
			);
		});

		const page = await browser.newPage();
		await page.setViewport({ width: 1, height: 1 });
		await page.goto(
			`http://localhost:${PORT}/RustCoon${versionFile}/index.html?nombre=${nombre}`
		);

		rooms[nombre] = { browser, page };
		if (!roomNames.includes(nombre)) {
			roomNames.push(nombre);
			saveRoomNames(roomNames);
		}
		console.log(`✅ Cuarto creado: ${nombre} (PID ${browser.process().pid})`);
		res.send({ success: true, nombre });
	} catch (err) {
		console.error(err);
		res.status(500).send({ error: "No se pudo crear el cuarto" });
	}
});

// Destruir un cuarto
app.post("/rooms/destroy", async (req, res) => {
	try {
		const { nombre } = req.body;
		if (!rooms[nombre]) {
			return res.status(404).send({ error: "Ese cuarto no existe" });
		}

		await rooms[nombre].browser.close();
		delete rooms[nombre];

		roomNames = roomNames.filter((r) => r !== nombre);
		saveRoomNames(roomNames);

		console.log(`❌ Cuarto destruido: ${nombre}`);
		res.send({ success: true, nombre });
	} catch (err) {
		console.error(err);
		res.status(500).send({ error: "No se pudo destruir el cuarto" });
	}
});

// Listar cuartos activos
app.get("/rooms", (req, res) => {
	res.send({ rooms: Object.keys(rooms) });
});
app.get("/", (req, res) => {
	res.send({ message: "Servidor funcionando correctamente." });
});

const ROOMS_FILE = "./rooms.json";

function loadRoomNames() {
	if (!fs.existsSync(ROOMS_FILE)) return [];
	return JSON.parse(fs.readFileSync(ROOMS_FILE));
}

function saveRoomNames(names) {
	fs.writeFileSync(ROOMS_FILE, JSON.stringify(names, null, 2));
}

let roomNames = loadRoomNames();

// --- Inicializar rooms al iniciar el servidor ---
async function initRooms() {
	for (const nombre of roomNames) {
		if (!rooms[nombre]) {
			try {
				const browser = await puppeteer.launch({
					headless: true,
					executablePath:
						process.env.CHROME_PATH || "/usr/bin/google-chrome-stable",
					args: [
						"--no-sandbox",
						"--disable-setuid-sandbox",
						"--enable-logging",
						"--v=1",
						"--use-gl=swiftshader",
						"--enable-unsafe-swiftshader",
						"--use-gl=swiftshader",
						"--enable-unsafe-swiftshader",
						"--ignore-gpu-blocklist",
						"--disable-features=VizDisplayCompositor",
						"--disable-software-rasterizer=false",
						"--disable-gpu-sandbox",
						"--disable-features=WebRtcHideLocalIpsWithMdns",
					],
					dumpio: true,
				});
				browser.on("disconnected", () => {
					console.error(
						"[!] Puppeteer: el navegador se ha desconectado (posible crash)"
					);
				});

				const page = await browser.newPage();
				await page.setViewport({ width: 1, height: 1 });
				await page.goto(
					`http://localhost:${PORT}/RustCoon${versionFile}/index.html?nombre=${nombre}`
				);

				rooms[nombre] = { browser, page };
				console.log(`♻ Room recreada al iniciar: ${nombre}`);
			} catch (err) {
				console.error(`No se pudo recrear la room ${nombre}:`, err);
			}
		}
	}
}

initRooms();
