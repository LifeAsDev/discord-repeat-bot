// webhook.js
const http = require("http");
const { execFile } = require("child_process");

http
	.createServer((req, res) => {
		console.log("github webhook received");

		if (req.method === "POST") {
			execFile(
				"/bin/bash",
				["/home/juego/deploy.sh"],
				{ cwd: "/home/juego" },
				(err, stdout, stderr) => {
					if (err) {
						console.error("DEPLOY ERROR:", err);
						console.error(stderr);
					} else {
						console.log(stdout);
					}
				},
			);

			res.writeHead(200, { "Content-Type": "text/plain" });
			res.end("Despliegue ejecutado");
		} else {
			res.writeHead(200, { "Content-Type": "text/plain" });
			res.end("Servidor de webhook");
		}
	})
	.listen(9000, () => console.log("Webhook escuchando en puerto 9000"));
