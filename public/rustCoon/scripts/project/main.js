import { DiscordSDK } from "./vendor.bundle.js"
import { setupDiscordSdk} from "./utils/discordSDK.js"

runOnStartup(async runtime =>
{
    const clientId = "1411008879885549711";
    const discord = new DiscordSDK(clientId);

    runtime.lifeAsDevUtils = runtime.lifeAsDevUtils || {};

    async function authenticateDiscord() {
        try {
            await discord.ready();

            const { code } = await discord.commands.authorize({
                client_id: clientId,
                response_type: "code",
                state: "",
                prompt: "none",
                scope: ["identify", "guilds", "applications.commands"],
            });

            const tokenResponse = await discord.commands.authenticate({
                code,
            });

            console.log("Discord auth success:", tokenResponse);
            runtime.globalVars.alias =
                tokenResponse.user.global_name || tokenResponse.user.username;
            runtime.globalVars.discordId = tokenResponse.user.id.toString();

            if (discord && discord.frameId) {
                const frameId = discord.frameId;
                console.log("Frame:", frameId);
                const target = "wss://multiplayer.construct.net";
                const proxyUrl = `wss://${clientId}.discordsays.com/connect`;
                runtime.callFunction("connect", proxyUrl);
            }

            return tokenResponse;
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
