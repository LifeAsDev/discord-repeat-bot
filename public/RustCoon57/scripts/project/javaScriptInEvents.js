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
let roomsIndex = new Map(); // room -> index
roomsIndex.nextIndex = 0; // contador global

// --- 🔹 Guardar data de un cuarto ---
function isJsonString(str) {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

async function saveRoomData(nombre, data) {
  const payloadData =
    typeof data === "string"? data : JSON.stringify(data);

  const res = await fetch("https://rustycoon.site/storage/save", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, data: payloadData }),
  });

  return await res.json();
}

function worldToMinimap(pos, mapSize, miniSize) {
  return {
    x: (pos.x / mapSize.width)  * miniSize.width,
    y: (pos.y / mapSize.height) * miniSize.height
  };
}

// --- 🔹 Cargar data de un cuarto ---
async function loadRoomData(nombre) {
	try {
		const res = await fetch(`https://rustycoon.site/storage/load/${encodeURIComponent(nombre)}`);
		const json = await res.json();

		if (!json.found) {
			console.warn(`⚠️ No se encontró data para el cuarto '${nombre}'`);
			return null;
		}
		// parsear el string guardado de vuelta a objeto
		return json.data;
	} catch (err) {
		console.error("❌ Error cargando data del cuarto:", err);
		return null;
	}
}


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
		runtime.globalVars.mobile = 0;
		runtime.globalVars.state = "host";
		runtime.globalVars.realHost = "host";
		runtime.globalVars.roomName = nombre;
		runtime.callFunction("connect", "https://rustycoon.site/");
		} 
	},

	async EventConnect_Event9_Act2(runtime, localVars)
	{
		runtime.lifeAsDevUtils.startDiscordLogin();
	},

	async EventConnect_Event11_Act3(runtime, localVars)
	{
		runtime.ServerList?._render();
		runtime.ServerList.onSelectServer = (server) => {
			console.log(server);
		runtime.callFunction("joinServer",server)
		};
	},

	async EventConnect_Event17_Act1(runtime, localVars)
	{
runtime.listRoom = [];

const DEV_HOSTS = [
  "localhost",
  "127.0.0.1",
  "preview.construct.net"
];

const API_BASE = DEV_HOSTS.includes(location.hostname)
  ? "https://rustycoon.site"
  : "/connect";

fetch(`${API_BASE}/rooms`)
  .then(res => res.json())
  .then(data => {
    runtime.listRoom = data.rooms;
    runtime.ServerList.updateServers(runtime.listRoom);
  })
  .catch(err => console.error(err));
	},

	async EventConnect_Event19_Act1(runtime, localVars)
	{

	},

	async EventConnect_Event21_Act2(runtime, localVars)
	{

	},

	async EventConnect_Event22(runtime, localVars)
	{

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

	async EventWorld_Event8_Act3(runtime, localVars)
	{

	},

	async EventWorld_Event14_Act1(runtime, localVars)
	{
		async function getRooms() {
		  try {
		    const res = await fetch("https://rustycoon.site/rooms");
		
		    if (!res.ok) {
		      throw new Error("Error HTTP: " + res.status);
		    }
		
		    const data = await res.json();
		
		    return data.rooms;
		
		  } catch (err) {
		    console.error("Error obteniendo rooms:", err);
		    return [];
		  }
		}
		
		getRooms().then(rooms => {
		
		  const newSet = new Set(rooms);
		
		  // --- agregar ---
		  for (const room of newSet) {
		    if (!roomsIndex.has(room)) {
		
		      const index = roomsIndex.nextIndex++;
		      roomsIndex.set(room, index);
		
		      runtime.callFunction("roomAdded", room, index);
		    }
		  }
		
		  // --- remover ---
		  for (const [room, index] of roomsIndex) {
		
		    // ignorar la propiedad interna
		    if (room === "nextIndex") continue;
		
		    if (!newSet.has(room)) {
		      runtime.callFunction("roomRemoved", room, index);
		      roomsIndex.delete(room);
		    }
		  }
		
		});
		
	},

	async EventWorld_Event22(runtime, localVars)
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
		    { tile: 16, probability: 0.4 },
		
		];
		
		const terrain = generateTerrain(runtime.globalVars.tileWidth,runtime.globalVars.tileHeight,tiles);
		for (let y = 0; y < terrain.length; y++) {
		    for (let x = 0; x < terrain[y].length; x++) {
		        const tile = terrain[y][x];
		        runtime.callFunction("setTile", tile, x, y,0,-1,localVars.thenName);
		    }
		}
	},

	async EventWorld_Event198_Act3(runtime, localVars)
	{
		const miniPos = worldToMinimap(
		  { x: localVars.px, y: localVars.py },
		  { width: 6400, height: 6400 },
		  { width: 480, height: 480 }
		);
		
		localVars.miniX = miniPos.x;
		localVars.miniY = miniPos.y;
	},

	async EventWorld_Event200_Act3(runtime, localVars)
	{
		const miniPos = worldToMinimap(
		  { x: localVars.px, y: localVars.py },
		  { width: 6400, height: 6400 },
		  { width: 480, height: 480 }
		);
		
		localVars.miniX = miniPos.x;
		localVars.miniY = miniPos.y;
	},

	async EventWorld_Event444_Act1(runtime, localVars)
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
result.push(`${localVars.roomNamePlayer}`);

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

	async EventWorld_Event536_Act1(runtime, localVars)
	{
		runtime.playersArr = [];
	},

	async EventWorld_Event540(runtime, localVars)
	{
		const jsonString = {px:localVars.px,py:localVars.py,animationName:localVars.animationName,mirror:localVars.mirror,inputs:localVars.inputs,id:localVars.id,alias:localVars.aliasP}
		runtime.playersArr.push(jsonString);
		
	},

	async EventWorld_Event541(runtime, localVars)
	{
		localVars.jsonStringify = JSON.stringify({playersArr:runtime.playersArr,date:localVars.date});
	},

	async EventWorld_Event546(runtime, localVars)
	{
		const jsonString = {px:localVars.px,py:localVars.py,animationName:localVars.animationName,date:localVars.date,mirror:localVars.mirror,inputs:localVars.inputs,id:localVars.id};
		localVars.jsonStringify = JSON.stringify(jsonString);
	},

	async EventWorld_Event552(runtime, localVars)
	{

	},

	async EventWorld_Event568_Act2(runtime, localVars)
	{
		const data = JSON.parse(localVars.jsonStringify);
		/* localVars.date = data.date;
		localVars.animationName = data.animationName;
		localVars.mirror = data.mirror;
		localVars.px = data.x;
		localVars.py = data.y;
		localVars.inputs = data.inputs; */
		if(data){
		runtime.callFunction("playerSync",data.date,data.animationName,data.mirror,data.px,data.py,data.inputs,data.id,"");
		}
		
		
	},

	async EventWorld_Event569_Act3(runtime, localVars)
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
		
		 runtime.callFunction("playerSync",data.date,data.playersArr[i].animationName,data.playersArr[i].mirror,data.playersArr[i].px,data.playersArr[i].py,data.playersArr[i].inputs,data.playersArr[i].id,data.playersArr[i].alias);
		 }
		
	},

	async EventWorld_Event683_Act2(runtime, localVars)
	{
		await saveRoomData(runtime.globalVars.roomName, localVars.worldJson);
	},

	async EventWorld_Event690_Act1(runtime, localVars)
	{

	}
};

globalThis.C3.JavaScriptInEvents = scriptsInEvents;
