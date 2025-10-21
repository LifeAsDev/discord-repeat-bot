// server/ServerSignalling.js
const { Server } = require("socket.io");

class ServerSignalling {
	constructor(httpServer) {
		this.io = new Server(httpServer, {
			cors: { origin: "*" },
			path: "/signalling/socket.io",
		});
		console.log("signalling server ready");
		this.rooms = new Map(); // roomName -> { hostId, peers: Set() }

		this._setupEvents();
	}

	_setupEvents() {
		this.io.on("connection", (socket) => {
			console.log("🟢 New client:", socket.id);

			socket.emit("signalling:connected");

			socket.on("create_room", (roomName) => {
				this._createRoom(socket, roomName);
			});

			socket.on("signalling:join", (roomName) => {
				this._joinRoom(socket, roomName);
			});

			socket.on("disconnect", () => {
				this._handleDisconnect(socket);
			});

			// ✅ Mensaje a un peer específico
			socket.on("send_message", ({ targetId, message, tag }) => {
				const roomData = this._getRoomBySocket(socket);
				if (!roomData) return;
				const { room } = roomData;

				if (socket.id === room.hostId) {
					// Host puede enviar a un peer específico
					if (targetId && room.peers.has(targetId)) {
						this.io.to(targetId).emit("signalling:message", {
							from: socket.id,
							message,
							tag,
						});
					}
				} else {
					// Peer solo puede enviar al host
					this.io.to(room.hostId).emit("signalling:message", {
						from: socket.id,
						message,
						tag,
					});
				}
			});

			// ✅ Broadcast a todos los peers (solo el host puede)
			socket.on("broadcast_message", ({ fromId, message, tag }) => {
				const roomData = this._getRoomBySocket(socket);
				if (!roomData) return;
				const { room } = roomData;

				if (socket.id === room.hostId) {
					room.peers.forEach((peerId) => {
						if (peerId !== room.hostId) {
							this.io.to(peerId).emit("signalling:message", {
								from: fromId || socket.id,
								message,
								tag,
							});
						}
					});
				}
			});
			socket.on("list_rooms", () => {
				const roomsList = Array.from(this.rooms.keys());
				socket.emit("signalling:rooms_list", roomsList);
			});
		});
	}

	_createRoom(socket, roomName) {
		if (this._getRoomBySocket(socket)) return; // ya está en un cuarto

		if (this.rooms.has(roomName)) {
			socket.emit("signalling:error", "room-exists");
			return;
		}

		this.rooms.set(roomName, {
			hostId: socket.id,
			peers: new Set([socket.id]),
		});

		socket.join(roomName);
		socket.emit("room_created", roomName);
		console.log(`🏠 Room '${roomName}' created by ${socket.id}`);
	}

	_joinRoom(socket, roomName) {
		if (this._getRoomBySocket(socket)) return; // ya está en un cuarto

		const room = this.rooms.get(roomName);
		if (!room) {
			socket.emit("signalling:error", "room-not-found");
			return;
		}

		room.peers.add(socket.id);
		socket.join(roomName);
		socket.emit("room_joined", roomName);

		// Notificar al host
		this.io.to(room.hostId).emit("signalling:peer_joined", {
			id: socket.id,
			room: roomName,
		});

		console.log(`👥 ${socket.id} joined '${roomName}'`);
	}

	_handleDisconnect(socket) {
		for (const [roomName, room] of this.rooms.entries()) {
			if (!room.peers.has(socket.id)) continue;

			room.peers.delete(socket.id);
			this.io.to(room.hostId).emit("signalling:peer_left", socket.id);

			// Si el host se fue, cerrar el cuarto
			if (socket.id === room.hostId) {
				this.io.to(roomName).emit("signalling:room_closed");
				this.io.socketsLeave(roomName);
				this.rooms.delete(roomName);
				console.log(`❌ Room '${roomName}' closed (host left)`);
			}
		}
	}

	_getRoomBySocket(socket) {
		for (const [name, room] of this.rooms.entries()) {
			if (room.peers.has(socket.id)) return { name, room };
		}
		return null;
	}
}

module.exports = { ServerSignalling };
