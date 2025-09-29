module.exports = {
	apps: [
		{
			name: "juego", // Nombre del proceso en PM2
			script: "bot.js", // Archivo principal de tu servidor de juego
			watch: true, // Reinicia automáticamente si hay cambios
			ignore_watch: ["node_modules"], // No reiniciar por cambios en node_modules
			env: {
				NODE_ENV: "development",
			},
			env_production: {
				NODE_ENV: "production",
			},
		},
	],
};
