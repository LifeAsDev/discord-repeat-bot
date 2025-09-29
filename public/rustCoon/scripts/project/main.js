import { DiscordSDK } from "./vendor.bundle.js"
import { setupDiscordSdk} from "./utils/discordSDK.js"

runOnStartup(async runtime =>
{
    const clientId = "1411008879885549711";
    const discord = new DiscordSDK(clientId);




    try {
        // La llamada a authenticate() se encargará de todo:
        // usará un token si existe, o pedirá al usuario que inicie sesión si no.
        const auth = await setupDiscordSdk(discord);
        console.log(auth);
        runtime.globalVars.alias = auth.user.global_name || auth.user.username;
        runtime.globalVars.discordId = auth.user.id.toString();
        // Tu lógica original después de la autenticación
        if(discord&&discord.frameId){ 
        const frameId = discord.frameId;
        console.log(discord);
        const target = "wss://multiplayer.construct.net";
        const proxyUrl = `wss://${clientId}.discordsays.com/connect`;
        runtime.callFunction("connect", proxyUrl);
        }

    } catch (error) {
        console.error("Error al autenticar con Discord:", error);
    }
    
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
