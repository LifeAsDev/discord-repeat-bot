import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

// Servidor Socket.IO principal
const io = new Server(server, {
	cors: { origin: "*" },
	path: "/socket.io/", // path raíz (para clientes sin namespace)
});

app.use(express.static("public"));

// Conexión al namespace raíz "/"
io.on("connection", (socket) => {
	console.log("🛰️ Cliente conectado al namespace raíz:", socket.id);
	socket.emit("welcome", `Bienvenido al servidor, tu ID es ${socket.id}`);
});

// --- Creamos el namespace "/socket" ---
const socketNSP = io.of("/socket");

socketNSP.on("connection", (socket) => {
	console.log("🛰️ Cliente conectado al namespace /socket:", socket.id);

	socket.emit(
		"welcome",
		`Bienvenido al namespace /socket, tu ID es ${socket.id}`
	);

	socket.on("ping", (msg) => {
		console.log("📡 Mensaje recibido en /socket:", msg);
		socket.emit("pong", "Respuesta del servidor desde /socket 🧠");
	});

	socket.on("disconnect", () => {
		console.log("❌ Cliente desconectado del namespace /socket:", socket.id);
	});
});

server.listen(3000, () => {
	console.log("🚀 Servidor corriendo en http://localhost:3000");
});
