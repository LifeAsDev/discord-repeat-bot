const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const fs = require("fs");
const { ServerSignalling } = require("./ServerSignalling");
const http = require("http");
const { chromium } = require("playwright"); // 👈 así se importa en CommonJS

const app = express();
const PORT = 3000;
dotenv.config({ path: "./.env" });
const cors = require("cors");
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

const publicPath = path.join(__dirname, "public");

const versionFile = 24;


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

async function launchRoom(nombre) {
    try {
        const browser = await chromium.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-extensions",
                "--disable-gpu-sandbox",
                "--disable-logging",
                "--log-level=3",
                "--disable-breakpad",
                "--no-zygote",

                // 🔧 Evitar dependencias D-Bus y multimedia
                "--disable-features=AudioServiceOutOfProcess,VaapiVideoDecoder,UseDBus",
                "--disable-dbus",

                // 🔧 Mantener WebGL activo (SwiftShader fallback)
                "--use-gl=swiftshader",
                "--enable-unsafe-swiftshader",
                "--ignore-gpu-blocklist",
                "--enable-webgl",
            ],
        });

        browser.on("disconnected", () => {
            console.error(`[!] Playwright: navegador desconectado (${nombre})`);
        });

        const context = await browser.newContext();
        const page = await context.newPage();
        await page.setViewportSize({ width: 1, height: 1 });

        await page.goto(
            `http://localhost:${PORT}/RustCoon${versionFile}/index.html?nombre=${nombre}`
        );

        rooms[nombre] = { browser, page };

        console.log(`✅ Room lanzada: ${nombre}`);
        return true;
    } catch (err) {
        console.error(`[X] No se pudo lanzar room ${nombre}:`, err);
        return false;
    }
}

app.post("/rooms/create", async (req, res) => {
    const { nombre } = req.body;

    if (!nombre || rooms[nombre]) {
        return res
            .status(400)
            .send({ error: "Ese cuarto ya existe o nombre inválido" });
    }

    const success = await launchRoom(nombre);

    if (success) {
        if (!roomNames.includes(nombre)) {
            roomNames.push(nombre);
            saveRoomNames(roomNames);
        }
        res.send({ success: true, nombre });
    } else {
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
            await launchRoom(nombre);
            console.log(`[!] Room recreada al iniciar: ${nombre}`);
        }
    }
}

initRooms();
