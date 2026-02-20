const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const fs = require("fs");
const { ServerSignalling } = require("./ServerSignalling");
const http = require("http");
const { chromium } = require("playwright"); // 👈 así se importa en CommonJS
const { fork } = require("child_process");
const fsp = require("fs/promises"); // async moderno

const app = express();
const PORT = 3000;
dotenv.config({ path: "./.env" });
const cors = require("cors");
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

const publicPath = path.join(__dirname, "public");

const versionFile = 53;

app.use(
	express.static(publicPath, {
		etag: false,
		lastModified: false,
		setHeaders: (res) =>
			res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate"),
	}),
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

// --- PATCH para guardar/cargar data por nombre de cuarto ---
const DATA_FILE = "./roomdata.json";

// 🔹 Función segura para leer el archivo (devuelve objeto vacío si no existe o falla)
function loadDataFile() {
	try {
		if (!fs.existsSync(DATA_FILE)) return {};
		return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
	} catch {
		return {};
	}
}

// 🔹 Función para guardar el archivo
function saveDataFile(data) {
	fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

const STORAGE_DIR = "./storage";

// crear la carpeta si no existe
if (!fs.existsSync(STORAGE_DIR)) {
	fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

function sanitizeFileName(name) {
	return name.replace(/[<>:"\/\\|?*]/g, "_");
}

app.patch("/storage/save", async (req, res) => {
	try {
		const { nombre, data } = req.body;

		if (!nombre || typeof data !== "string") {
			return res.status(400).send({
				error: "Se requiere 'nombre' y 'data'.",
			});
		}

		const safeName = sanitizeFileName(nombre);
		const filePath = path.join(STORAGE_DIR, `${safeName}.json`);

		await fsp.writeFile(filePath, data, "utf8");

		console.log(`💾 Guardado ${safeName}`);
		res.send({ success: true });
	} catch (err) {
		console.error("Error al guardar:", err);
		res.status(500).send({ error: "No se pudo guardar." });
	}
});

app.get("/storage/load/:nombre", async (req, res) => {
	try {
		const nombre = req.params.nombre;
		const filePath = path.join(STORAGE_DIR, `${nombre}.json`);

		let data;

		try {
			data = await fsp.readFile(filePath, "utf8");
		} catch {
			return res.send({
				found: false,
				message: `No se encontró data para '${nombre}'`,
			});
		}

		res.send({
			found: true,
			nombre,
			data,
		});
	} catch (err) {
		console.error("Error al cargar:", err);
		res.status(500).send({ error: "No se pudo cargar la data." });
	}
});

const rooms = {}; // aquí guardamos los cuartos abiertos { nombre: { browser, page } }

// Variable global (o dentro de tu objeto server / módulo)
let sharedBrowser = null;

// Inicializar el browser UNA VEZ al arrancar el servidor
async function initSharedBrowser() {
	if (sharedBrowser) return;

	sharedBrowser = await chromium.launch({
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-gpu",
			"--disable-dev-shm-usage",
			"--mute-audio",
			"--no-zygote",
			"--disable-breakpad",
			"--log-level=3",
		],
	});

	console.log("→ Browser compartido iniciado");
}

// Tu nueva createRoom (sin lanzar browser cada vez)
async function createRoom(nombre) {
	if (rooms[nombre]) return false;

	const browser = await chromium.launch({
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-gpu", // importante si no necesitas rendering
			"--disable-dev-shm-usage",
			"--mute-audio",
			"--disable-accelerated-2d-canvas",
			"--disable-background-timer-throttling",
			"--disable-renderer-backgrounding",
			"--log-level=3",
		],
	});

	const context = await browser.newContext({
		viewport: { width: 1, height: 1 }, // o el tamaño real de tu juego
		ignoreHTTPSErrors: true,
	});

	const page = await context.newPage();
	// Opcional: page.setViewportSize(...)

	const safeNombre = encodeURIComponent(nombre);
	await page.goto(
		`http://localhost:${PORT}/RustCoon${versionFile}/index.html?nombre=${safeNombre}`,
		{
			waitUntil: "networkidle", // o "domcontentloaded" si es más rápido
		},
	);

	// Aquí puedes automatizar el "Hostear partida" si no lo hace la URL
	// await page.click('#host-button'); etc.

	rooms[nombre] = { browser, context, page }; // guarda el browser para poder cerrarlo después

	console.log(`🟢 Room ${nombre} lanzada (browser independiente)`);
	return true;
}
app.post("/rooms/create", (req, res) => {
	const { nombre } = req.body;

	const ok = true; /* createRoom(nombre); */

	if (!ok) {
		return res.status(400).send({
			error:
				"No se pudo crear el cuarto (ya existe, nombre inválido o límite alcanzado)",
		});
	}

	if (!roomNames.includes(nombre)) {
		roomNames.push(nombre);
		saveRoomNames(roomNames);
	}

	res.send({ success: true, nombre });
});

app.post("/rooms/destroy", async (req, res) => {
	const { nombre } = req.body;

	if (!nombre) {
		return res.status(400).json({ error: "Falta el nombre de la sala" });
	}

	try {
		// Actualizamos la lista de nombres (si la usas)
		roomNames = roomNames.filter((r) => r !== nombre);
		saveRoomNames(roomNames);

		console.log(`❌ Room destruida: ${nombre}`);

		res.json({ success: true, nombre });
	} catch (err) {
		console.error(`Error al destruir room ${nombre}:`, err);
		res.status(500).json({ error: "No se pudo destruir el cuarto" });
	}
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
// Listar cuartos activos
app.get("/rooms", (req, res) => {
	res.send({ rooms: roomNames });
});
app.get("/", (req, res) => {
	res.send({ message: "Servidor funcionando correctamente." });
});

// --- Inicializar rooms al iniciar el servidor ---

async function initRooms() {
	createRoom("master");
}

initRooms();
