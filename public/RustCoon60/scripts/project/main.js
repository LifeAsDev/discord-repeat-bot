import { DiscordSDK } from "./vendor.bundle.js"
import { setupDiscordSdk } from "./utils/discordSDK.js"
runOnStartup(async runtime => {


    runtime._pendingServers = null;

    runtime.ServerList = {
        onSelectServer: null,
        onRefresh: null,

        updateServers(servers) {
            // guardar siempre
            runtime._pendingServers = servers;

            // intentar render si ya existe
            this._render();
        },

        _render() {
            const container = document.getElementById("c3-servers");
            if (!container) return; // menú aún no cargó

            container.innerHTML = "";

            const servers = runtime._pendingServers;
            if (!servers || servers.length === 0) {
                container.innerHTML = "<p>No servers available.</p>";
                return;
            }

            for (const server of servers) {
                const div = document.createElement("div");
                div.className = "server";
                div.textContent = server?.name ?? server;

                div.onclick = () => {
                    this.onSelectServer?.(server);
                };

                container.appendChild(div);
            }
        },

        refresh() {
            this.onRefresh?.();
        }
    };

    const clientId = "1411008879885549711";
    const discord = new DiscordSDK(clientId);

    runtime.lifeAsDevUtils = runtime.lifeAsDevUtils || {};

    async function authenticateDiscord() {
        try {
            console.log("update");
            // Usa la función de utils que ya maneja el flujo completo
            const auth = await setupDiscordSdk(discord);

            console.log("Discord auth success:", auth);

            // Guarda datos globales en Construct
            runtime.globalVars.alias = auth.user.global_name || auth.user.username;
            runtime.globalVars.discordId = auth.user.id.toString();

            // Si hay frameId, conecta al proxy
            if (discord && discord.frameId) {
                const frameId = discord.frameId;
                console.log("Frame:", frameId);

                const target = "wss://multiplayer.construct.net";
                const proxyUrl = "/";

                runtime.callFunction("connect", proxyUrl);
            }

            return auth;
        } catch (error) {
            console.error("Error al autenticar con Discord:", error);
            throw error;
        }
    }


    runtime.lifeAsDevUtils.startDiscordLogin = async function () {
        const result = await authenticateDiscord();
        console.log("Autenticación completada:", result);

    };

    runtime.playersArr = [];


    runtime.addEventListener("beforeprojectstart", () => OnBeforeProjectStart(runtime));
});
async function OnBeforeProjectStart(runtime) {
    // Code to run just before 'On start of layout' on
    // the first layout. Loading has finished and initial
    // instances are created and available to use here.

    runtime.addEventListener("tick", () => Tick(runtime));
}
function Tick(runtime) {
    // Code to run every tick
}
