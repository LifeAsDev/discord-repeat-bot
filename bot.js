const express = require("express");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const cors = require("cors");
const puppeteer = require("puppeteer-core");
const { Client, GatewayIntentBits } = require("discord.js");

dotenv.config({ path: "./.env" });

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  express.static(path.join(__dirname, "public"), {
    etag: false,
    lastModified: false,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "no-store");
    },
  })
);

// --- JSON para persistir rooms ---
const ROOMS_FILE = "./rooms.json";

function loadRoomNames() {
  if (!fs.existsSync(ROOMS_FILE)) return [];
  return JSON.parse(fs.readFileSync(ROOMS_FILE));
}

function saveRoomNames(names) {
  fs.writeFileSync(ROOMS_FILE, JSON.stringify(names, null, 2));
}

let roomNames = loadRoomNames();
const rooms = {}; // rooms activos { nombre: { browser, page } }

// --- Discord bot ---
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once("ready", () => {
  console.log(`Bot conectado como ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);

// Endpoint para enviar mensaje al canal
app.post("/send", async (req, res) => {
  try {
    const channel = await client.channels.fetch(process.env.CHANNEL_ID);
    await channel.send(req.body.text);
    res.send({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "No se pudo enviar el mensaje" });
  }
});

// --- Endpoints para rooms ---

// Crear room
app.post("/rooms/create", async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).send({ error: "Nombre inválido" });
    if (rooms[nombre])
      return res.status(400).send({ error: "Ese cuarto ya existe" });

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
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1, height: 1 });
    await page.goto(
      `http://localhost:${PORT}/rustCoon/index.html?nombre=${nombre}`
    );

    rooms[nombre] = { browser, page };

    if (!roomNames.includes(nombre)) {
      roomNames.push(nombre);
      saveRoomNames(roomNames);
    }

    console.log(`✅ Room creado: ${nombre} (PID ${browser.process().pid})`);
    res.send({ success: true, nombre });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "No se pudo crear el cuarto" });
  }
});

// Destruir room
app.post("/rooms/destroy", async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!rooms[nombre])
      return res.status(404).send({ error: "Ese cuarto no existe" });

    await rooms[nombre].browser.close();
    delete rooms[nombre];

    roomNames = roomNames.filter((r) => r !== nombre);
    saveRoomNames(roomNames);

    console.log(`❌ Room destruido: ${nombre}`);
    res.send({ success: true, nombre });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "No se pudo destruir el cuarto" });
  }
});

// Listar rooms
app.get("/rooms", (req, res) => {
  res.send({ rooms: roomNames });
});

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
            "--disable-dev-shm-usage",
            "--disable-extensions",
            "--disable-background-timer-throttling",
            "--disable-gpu",
          ],
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1, height: 1 });
        await page.goto(
          `http://localhost:${PORT}/rustCoon/index.html?nombre=${nombre}`
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

// --- Iniciar servidor ---
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
