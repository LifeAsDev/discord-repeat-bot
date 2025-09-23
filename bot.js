require("dotenv").config();
const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");

const app = express();
const PORT = 3000;

// Bot de Discord
const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// Cuando el bot esté listo
client.once("ready", () => {
	console.log(`✅ Bot conectado como ${client.user.tag}`);
});

// Middleware para leer JSON
app.use(express.json());

// Endpoint HTTP para mandar mensaje a Discord
app.post("/send", async (req, res) => {
	const { text } = req.body;

	if (!text) {
		return res.status(400).json({ error: "Falta el campo 'text'" });
	}

	try {
		const channel = await client.channels.fetch(process.env.CHANNEL_ID);
		await channel.send(text);
		res.json({ success: true, sent: text });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "No se pudo enviar el mensaje" });
	}
});

// Arrancar servidor HTTP
app.listen(PORT, () => {
	console.log(`Servidor HTTP en http://localhost:${PORT}`);
});

// Conectar el bot
client.login(process.env.DISCORD_TOKEN);
