   import ClientSignalling from "./client-signalling.js"
import  "./utils/socketio-client.js" 
let client;

   const items = [
  "Piedra", "Hierro", "Pico de cobre", "Hacha de cobre", "Mineral de hierro",
  "Madera", "Pico de piedra", "Hacha de piedra", "Pico de hierro", "Hacha de hierro",
  "Horno","Pico de oro","Hacha de oro", "Azufre", "Azufre procesado", "Tela", "Saco",
  "Metal Crudo", "Metal", "Metal de alta calidad crudo", "Metal de alta calidad",
  "Arco", "Flecha"
];


const scriptsInEvents = {

	async EventConnect_Event2_Act1(runtime, localVars)
	{

	},

	async EventConnect_Event2_Act2(runtime, localVars)
	{

	},

	async EventConnect_Event3(runtime, localVars)
	{
		const params = new URLSearchParams(window.location.search);
		const nombre = params.get("nombre"); 
		if(nombre) { 
		runtime.globalVars.state = "host";
		runtime.globalVars.realHost = "host";
		runtime.globalVars.roomName = nombre;
		runtime.callFunction("connect", "https://1411008879885549711.discordsays.com");
		} 
	},

	async EventConnect_Event7_Act1(runtime, localVars)
	{
		runtime.lifeAsDevUtils.startDiscordLogin();
	},

	async EventWebsocket_Event1_Act1(runtime, localVars)
	{
		client.getListRooms();
	},

	async EventWebsocket_Event2_Act1(runtime, localVars)
	{
		client.createRoom(localVars.name);
	},

	async EventWebsocket_Event3_Act1(runtime, localVars)
	{
		client.joinRoom(localVars.name);
	},

	async EventWebsocket_Event4_Act1(runtime, localVars)
	{
		client.connect();
	},

	async EventWebsocket_Event5_Act1(runtime, localVars)
	{
		client.sendMessage(localVars.targetId,localVars.message,localVars.tag);
	},

	async EventWorld_Event19(runtime, localVars)
	{
		/**
		 * Generates a random terrain map.
		 * @param {number} width - Number of tiles horizontally.
		 * @param {number} height - Number of tiles vertically.
		 * @param {Array<{tile:any, probability:number}>} tileOptions - List of tiles with their probability (0..1).
		 * @returns {any[][]} 2D array of selected tiles.
		 */
		function generateTerrain(width, height, tileOptions) {
		    const map = [];
		
		    // Normalizar probabilidades
		    const total = tileOptions.reduce((sum, opt) => sum + opt.probability, 0);
		    const cumulative = [];
		    let sum = 0;
		    for (let opt of tileOptions) {
		        sum += opt.probability / total;
		        cumulative.push({ tile: opt.tile, limit: sum });
		    }
		
		    // Generar mapa
		    for (let y = 0; y < height; y++) {
		        map[y] = [];
		        for (let x = 0; x < width; x++) {
		            const r = Math.random();
		            for (let opt of cumulative) {
		                if (r < opt.limit) {
		                    map[y][x] = opt.tile;
		                    break;
		                }
		            }
		        }
		    }
		
		    return map;
		}
		
		const tiles = [  
		    { tile: -1, probability: 30 },
		    { tile: 0, probability: 0.2 },
		    { tile: 1, probability: 0.2 }, 
		    { tile: 2, probability: 0.2 },   
			{ tile: 3, probability: 0.2 }, 
			{ tile: 4, probability: 0.2 },    
			{ tile: 5, probability: 0.2 },
			{ tile: 6, probability: 0.75 },
			{ tile: 7, probability: 0.2 },
			{ tile: 8, probability: 0.2 },
			{ tile: 9, probability: .2 },  
			{ tile: 10, probability: 0.3 },
			{ tile: 11, probability: 1.2},
			{ tile: 13, probability: 0.1 },
		    { tile: 14, probability: 0.4 },
		
		];
		
		const terrain = generateTerrain(runtime.globalVars.tileWidth,runtime.globalVars.tileHeight,tiles);
		for (let y = 0; y < terrain.length; y++) {
		    for (let x = 0; x < terrain[y].length; x++) {
		        const tile = terrain[y][x];
		        runtime.callFunction("setTile", tile, x, y);
		    }
		}
	},

	async EventWorld_Event298_Act1(runtime, localVars)
	{
function sanitizeAndFormat(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed.c2array || !parsed.data) {
      throw new Error("Formato inválido");
    }

    const cleaned = parsed.data
      .filter(row => row[0][0] !== -1 && row[1][0] !== -1)
      .map(row => {
        const frame = row[0][0];
		console.log(frame);
        const count = row[1][0];
        const itemName = items[frame] || `Item(${frame})`; // frame 1 → Piedra
        return `x${count} ${itemName}`;
      });

    return cleaned;
  } catch (err) {
    console.error("Error parseando JSON:", err);
    return [];
  }
}

const result = sanitizeAndFormat(localVars.inventoryJson);

result.unshift(`<@${localVars.discordAlias}> Envio`);
result.push(`${runtime.globalVars.roomName}`);

console.log(result);

async function sendInventory(result) {
  // convierto el array a un solo string con saltos de línea
  const message = result.join("\n");

  try {
    const response = await fetch("/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message })
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    console.log("Mensaje enviado al bot ✅");
  } catch (err) {
    console.error("Error enviando inventario:", err);
  }
}

// ---- uso ----
const resultFetch = sanitizeAndFormat(localVars.inventoryJson);
sendInventory(result);


	},

	async EventWorld_Event440_Act1(runtime, localVars)
	{
		runtime.playersArr = [];
	},

	async EventWorld_Event444(runtime, localVars)
	{
		const jsonString = {px:localVars.px,py:localVars.py,animationName:localVars.animationName,mirror:localVars.mirror,inputs:localVars.inputs,id:localVars.id}
		runtime.playersArr.push(jsonString);
		
	},

	async EventWorld_Event445(runtime, localVars)
	{
		localVars.jsonStringify = JSON.stringify({playersArr:runtime.playersArr,date:localVars.date});
	},

	async EventWorld_Event450(runtime, localVars)
	{
		const jsonString = {px:localVars.px,py:localVars.py,animationName:localVars.animationName,date:localVars.date,mirror:localVars.mirror,inputs:localVars.inputs,id:localVars.id};
		localVars.jsonStringify = JSON.stringify(jsonString);
	},

	async EventWorld_Event456(runtime, localVars)
	{

	},

	async EventWorld_Event472_Act1(runtime, localVars)
	{
		const data = JSON.parse(localVars.jsonStringify);
		/* localVars.date = data.date;
		localVars.animationName = data.animationName;
		localVars.mirror = data.mirror;
		localVars.px = data.x;
		localVars.py = data.y;
		localVars.inputs = data.inputs; */
		if(data){
		runtime.callFunction("playerSync",data.date,data.animationName,data.mirror,data.px,data.py,data.inputs,data.id);
		}
		
		
	},

	async EventWorld_Event473_Act1(runtime, localVars)
	{
		const data = JSON.parse(localVars.jsonStringify);
		/* localVars.date = data.date;
		localVars.animationName = data.animationName;
		localVars.mirror = data.mirror;
		localVars.px = data.x;
		localVars.py = data.y;
		localVars.inputs = data.inputs;
		 */
		 for (let i = 0 ; i < data.playersArr.length; i++){
		
		 runtime.callFunction("playerSync",data.date,data.playersArr[i].animationName,data.playersArr[i].mirror,data.playersArr[i].px,data.playersArr[i].py,data.playersArr[i].inputs,data.playersArr[i].id);
		 }
		
	}
};

globalThis.C3.JavaScriptInEvents = scriptsInEvents;
