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

let browser; // global

function createRoom(nombre) {
	if (!nombre) return false;
	if (rooms[nombre]) return false;

	const child = fork("./roomworker.js", [nombre], {
		env: process.env,
		stdio: "inherit", // 👈 deja pasar logs
	});

	rooms[nombre] = { process: child };

	child.on("exit", (code) => {
		console.log(`⚠️ Room ${nombre} terminó (code ${code})`);
		delete rooms[nombre];
	});

	console.log(`✅ Room creada: ${nombre}`);
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

// Destruir un cuarto
app.post("/rooms/destroy", (req, res) => {
	const { nombre } = req.body;
	const room = rooms[nombre];

	if (!room) {
		return res.status(404).send({ error: "Ese cuarto no existe" });
	}

	room.process.kill("SIGTERM");
	delete rooms[nombre];

	roomNames = roomNames.filter((r) => r !== nombre);
	saveRoomNames(roomNames);

	console.log(`❌ Room destruida: ${nombre}`);
	res.send({ success: true, nombre });
});

// Listar cuartos activos
app.get("/rooms", (req, res) => {
	console.log(rooms);
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
			console.log(`[!] Room recreada al iniciar: ${nombre}`);

			createRoom(nombre);
		}
	}
}

initRooms();
