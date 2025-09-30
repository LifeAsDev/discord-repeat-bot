const express = require("express");
const path = require("path");
const dotenv = require("dotenv");

const app = express();
const PORT = 3000;
dotenv.config({ path: "./.env" });
const cors = require("cors");

app.use(cors());
// Servir archivos estáticos desde la carpeta "public"
app.use(
	express.static(path.join(__dirname, "public"), {
		etag: false,
		lastModified: false,
		setHeaders: (res, path) => {
			res.setHeader("Cache-Control", "no-store");
		},
	})
);
app.use(express.json());

// Opcional: parsear x-www-form-urlencoded si envías formularios
app.use(express.urlencoded({ extended: true }));

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

app.listen(PORT, () => {
	console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
const { Client, GatewayIntentBits } = require("discord.js");
const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once("ready", () => {
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

const puppeteer = require("puppeteer-core");

(async () => {
	const nombres = [];

	for (const nombre of nombres) {
		const browser = await puppeteer.launch({
			headless: true, // obligatorio en VPS
			executablePath: process.env.CHROME_PATH,
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
		});

		const page = await browser.newPage();
		await page.goto(
			`http://localhost:3000/rustCoon/index.html?nombre=${nombre}`
		);

		console.log("✅ Browser lanzado. PID:", browser.process().pid);
	}
})();
