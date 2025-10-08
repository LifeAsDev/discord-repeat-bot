async function setupDiscordSdk(discordSdk) {
  await discordSdk.ready();
    const clientId = "1411008879885549711";

  // Authorize with Discord Client
  const { code } = await discordSdk.commands.authorize({
    client_id: clientId,
    response_type: "code",
    state: "",
    prompt: "none",
    scope: [
      "identify",
      "guilds",
      "applications.commands"
    ],
  });
console.log(code);

  const response = await fetch("/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code,
    }),
  });

console.log(response);

  const { access_token } = await response.json();
console.log(access_token);

  // Authenticate with Discord client (using the access_token)
  const auth = await discordSdk.commands.authenticate({
    access_token,
  });

  if (auth == null) {
    throw new Error("Authenticate command failed");
  } 
   return auth;
}

export {setupDiscordSdk};