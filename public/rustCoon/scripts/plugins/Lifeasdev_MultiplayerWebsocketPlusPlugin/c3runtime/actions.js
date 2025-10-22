const C3 = globalThis.C3;
C3.Plugins.Lifeasdev_MultiplayerWebsocketPlusPlugin.Acts = {
	connect(url) {
		this.client.connect(url);
	},
	disconnectFromRoom() {
		this.client.disconnectFromRoom();
	},
	disconnectFromSignalling() {
		this.client.disconnectFromSignalling();
	},
	requestRoomList() {
		this.client.getListRooms();
	},
	joinRoom(roomName) {
		this.client.joinRoom(roomName);
	},
	createRoom(roomName) {
		this.client.createRoom(roomName);
	},
	sendPeerMessage(peerId, tag, message) {
		this.client.sendMessage(peerId, message, tag);
	},
	broadcastMessage(fromId, tag, message) {
		this.client.broadcastMessage(fromId, message, tag);
	},
	kickPeer(peerId, reason) {
		//placeholder
	},
};
export {};
