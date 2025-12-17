const { ServerSignalling } = require("./ServerSignalling");
const express = require("express");
const fs = require("fs");
const https = require("https");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());

// cargamos los certificados creados con openssl
const options = {
	key: fs.readFileSync("key.pem"),
	cert: fs.readFileSync("cert.pem"),
};
const publicPath = path.join(__dirname, "public");

app.use(
	express.static(publicPath, {
		etag: false,
		lastModified: false,
		setHeaders: (res) =>
			res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate"),
	})
);

// creamos servidor HTTPS en vez de HTTP
const server = https.createServer(options, app);

// tu signalling server conectado al servidor HTTPS
const signalling = new ServerSignalling(server);

// levantamos el servidor en el puerto 3000
server.listen(3000, "0.0.0.0", () => {
	console.log("Servidor WSS corriendo en https://0.0.0.0:3000");
});

app.get("/", (req, res) => {
	res.send({ message: "Servidor funcionando correctamente (WSS)." });
});
