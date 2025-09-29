// webhook.js
const http = require("http");
const { exec } = require("child_process");

http
	.createServer((req, res) => {
		if (req.method === "POST") {
			exec("/home/root/juego/deploy.sh", (err, stdout, stderr) => {
				if (err) console.error(err);
				console.log(stdout);
			});
			res.writeHead(200, { "Content-Type": "text/plain" });
			res.end("Despliegue ejecutado");
		} else {
			res.writeHead(200, { "Content-Type": "text/plain" });
			res.end("Servidor de webhook");
		}
	})
	.listen(9000, () => console.log("Webhook escuchando en puerto 9000"));
