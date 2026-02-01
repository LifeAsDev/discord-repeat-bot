const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const fs = require("fs");
const { ServerSignalling } = require("./ServerSignalling");
const http = require("http");
const { chromium } = require("playwright"); // 👈 así se importa en CommonJS
const { fork } = require("child_process");

const app = express();
const PORT = 3000;
dotenv.config({ path: "./.env" });
const cors = require("cors");
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

const publicPath = path.join(__dirname, "public");

const versionFile = 38;

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

// 🧩 Guardar data asociada a un cuarto
app.patch("/storage/save", (req, res) => {
	try {
		const { nombre, data } = req.body;
		if (!nombre || typeof data !== "string") {
			return res.status(400).send({
				error: "Se requiere 'nombre' (string) y 'data' (string).",
			});
		}

		const fileData = loadDataFile();
		fileData[nombre] = data;
		saveDataFile(fileData);

		console.log(`💾 Data guardada para cuarto '${nombre}'`);
		res.send({ success: true, message: `Data guardada para '${nombre}'` });
	} catch (err) {
		console.error("Error al guardar:", err);
		res.status(500).send({ error: "No se pudo guardar la data." });
	}
});

// 🧩 Cargar data asociada a un cuarto
app.get("/storage/load/:nombre", (req, res) => {
	try {
		const nombre = req.params.nombre;
		const fileData = loadDataFile();
		if (!fileData[nombre]) {
			return res.send({
				found: false,
				message: `No se encontró data para el cuarto '${nombre}'.`,
			});
		}

		res.send({ found: true, nombre, data: fileData[nombre] });
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
			"--disable-gpu", // muy importante si usas canvas/WebGL
			"--disable-dev-shm-usage",
			"--mute-audio",
			"--disable-accelerated-2d-canvas", // reduce mucho cpu en canvas 2D
			"--disable-background-timer-throttling",
			"--disable-renderer-backgrounding",
			"--no-zygote",
			"--disable-breakpad",
			"--log-level=3",
			// Opcional pero recomendado:
			"--disable-setuid-sandbox",
			"--disable-infobars",
			"--window-size=800,600", // o el tamaño real de tu juego
		],
	});

	console.log("→ Browser compartido iniciado");
}

// Tu nueva createRoom (sin lanzar browser cada vez)
async function createRoom(nombre) {
	if (!nombre || rooms[nombre]) return false;

	await initSharedBrowser(); // se ejecuta solo la primera vez

	const context = await sharedBrowser.newContext({
		viewport: { width: 800, height: 600 }, // ajusta al tamaño real de tu juego
		ignoreHTTPSErrors: true,
		// Puedes agregar más opciones de aislamiento si necesitas
	});

	const page = await context.newPage();

	// Muy importante: viewport pequeño reduce algo de carga de render
	// await page.setViewportSize({ width: 1, height: 1 });  ← ¡NO! Esto fuerza resize constante y más cpu en algunos juegos

	// Mejor: usa el tamaño real del juego o uno razonable
	await page.setViewportSize({ width: 800, height: 600 });

	const safeNombre = encodeURIComponent(nombre);

	await page.goto(
		`http://localhost:${PORT}/RustCoon${versionFile}/index.html?nombre=${safeNombre}`,
		{ waitUntil: "load" },
	);

	rooms[nombre] = { context, page }; // ya no guardas browser

	console.log(`🟢 Room ${nombre} lanzada (context compartido)`);
	return true;
}

app.post("/rooms/create", (req, res) => {
	const { nombre } = req.body;

	const ok = createRoom(nombre);

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

	const room = rooms[nombre];

	if (!room) {
		return res.status(404).json({ error: "Ese cuarto no existe" });
	}

	try {
		// Cerramos page y context de forma segura
		if (room.page && !room.page.isClosed()) {
			await room.page.close().catch((err) => {
				console.warn(`Advertencia al cerrar page de ${nombre}:`, err.message);
			});
		}

		if (room.context) {
			await room.context.close().catch((err) => {
				console.warn(
					`Advertencia al cerrar context de ${nombre}:`,
					err.message,
				);
			});
		}

		// Eliminamos la referencia
		delete rooms[nombre];

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
	browser = await chromium.launch({
		headless: true,
		args: [
			"--disable-gpu",
			"--disable-dev-shm-usage",
			"--no-sandbox",
			"--disable-background-timer-throttling",
			"--disable-backgrounding-occluded-windows",
			"--disable-renderer-backgrounding",
		],
	});

	for (const nombre of roomNames) {
		if (!rooms[nombre]) {
			console.log(`[!] Room recreada al iniciar: ${nombre}`);

			createRoom(nombre);
		}
	}
}

initRooms();
