import { DiscordSDK } from "./vendor.bundle.js"
import { setupDiscordSdk} from "./utils/discordSDK.js"

runOnStartup(async runtime =>
{
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
                const proxyUrl = "/connect";

                runtime.callFunction("connect", proxyUrl);
            }

            return auth;
        } catch (error) {
            console.error("Error al autenticar con Discord:", error);
            throw error;
        }
    }


    runtime.lifeAsDevUtils.startDiscordLogin = async function() {
        const result = await authenticateDiscord();
                    console.log("Autenticación completada:", result);

    };

    runtime.playersArr = [];
    runtime.addEventListener("beforeprojectstart", () => OnBeforeProjectStart(runtime));
});
async function OnBeforeProjectStart(runtime)
{
	// Code to run just before 'On start of layout' on
	// the first layout. Loading has finished and initial
	// instances are created and available to use here.
	
	runtime.addEventListener("tick", () => Tick(runtime));
}
function Tick(runtime)
{
	// Code to run every tick
}
