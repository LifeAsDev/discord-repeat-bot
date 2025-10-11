import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
	cors: { origin: "*" },
	path: "/socket.io/",
});

app.use(express.static("public"));

io.on("connection", (socket) => {
	console.log("🛰️ Cliente conectado:", socket.id);

	socket.on("ping", (msg) => {
		console.log("📡 Mensaje recibido:", msg);
		socket.emit("pong", "Respuesta del servidor 🧠");
	});

	socket.on("disconnect", () => {
		console.log("❌ Cliente desconectado:", socket.id);
	});
});

server.listen(3000, () => {
	console.log("🚀 Servidor corriendo en http://localhost:3000");
});
