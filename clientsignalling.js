// Asegúrate de cargar primero socket.io.min.js antes de este script
export default class ClientSignalling {
	constructor(serverUrl, options = {}, runtime) {
		this.serverUrl = serverUrl;
		this.socket = null;
		this.room = null;
		this.isHost = false;
		this.connected = false;
		this.peers = new Map(); // id → info
		this.runtime = runtime;
		this.options = {
			path: options.path || "/signalling/socket.io",
			reconnect: options.reconnect !== false,
			autoConnect: options.autoConnect !== false,
		};

		this.eventHandlers = {};
	}

	// 🔹 Conectar al servidor
	connect() {
		if (this.connected) return;
		this.socket = io(this.serverUrl, {
			path: this.options.path,
		});

		this.socket.on("signalling:connected", () => {
			this.connected = true;
			this.runtime.callFunction("WS-OnConnected");
		});

		this.socket.on("disconnect", () => {
			this.connected = false;
			this._emitLocal("disconnect");
		});

		// Mensajes del servidor
		this.socket.on("room_created", (roomName) => {
			this.room = roomName;
			this.isHost = true;
			this.runtime.callFunction("WS-OnJoinedRoom");
		});

		this.socket.on("room_joined", (roomName) => {
			this.room = roomName;
			this.isHost = false;
			this._emitLocal("room_joined", roomName);
		});

		this.socket.on("signalling:message", (data) => {
			this.onMessage(data);
		});

		this.socket.on("signalling:rooms_list", (rooms) => {
			console.log("Cuartos activos:", rooms);
		});
	}

	// 🔹 Crear sala (host)
	createRoom(roomName) {
		if (!this.connected || this.room) return;
		this.socket.emit("create_room", roomName);
	}

	// 🔹 Unirse a sala
	joinRoom(roomName) {
		if (!this.connected || this.room) return;
		this.socket.emit("join_room", roomName);
	}

	sendMessage(targetId, message, tag = "") {
		if (!this.socket || !this.room) return;

		// Peer ignora targetId, siempre envía al host
		if (!this.isHost) targetId = null;

		this.socket.emit("send_message", {
			targetId,
			message,
			tag,
		});
	}

	broadcastMessage(fromId = undefined, message, tag = "") {
		if (!this.socket || !this.room || !this.isHost) return;
		this.socket.emit("broadcast_message", {
			fromId,
			message,
			tag,
		});
	}

	getListRooms() {
		this.socket.emit("list_rooms"); // pide la lista
	}

	// 🔹 Escuchar eventos locales
	on(event, callback) {
		if (!this.eventHandlers[event]) this.eventHandlers[event] = [];
		this.eventHandlers[event].push(callback);
	}

	_emitLocal(event, data) {
		const handlers = this.eventHandlers[event];
		if (handlers) handlers.forEach((cb) => cb(data));
	}
}
