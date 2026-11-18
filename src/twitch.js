/**
 * Cliente de Twitch (tmi.js)
 */

import tmi from "tmi.js";
import { handleCommand, buildAnnouncement } from "./commands.js";

let client = null;
let announceTimer = null;

export function startTwitch() {
  const username = process.env.TWITCH_USERNAME;
  const password = process.env.TWITCH_OAUTH;
  const channel = (process.env.TWITCH_CHANNEL || "alertadropsmx").toLowerCase();

  if (!username || !password) {
    console.warn("[Twitch] Faltan TWITCH_USERNAME o TWITCH_OAUTH. Twitch desactivado.");
    return null;
  }

  client = new tmi.Client({
    options: { debug: false },
    identity: {
      username,
      password,
    },
    channels: [channel],
  });

  client.on("connected", (addr, port) => {
    console.log(`[Twitch] Conectado a ${addr}:${port} → #${channel}`);
  });

  client.on("message", async (chan, tags, message, self) => {
    if (self) return;
    if (!message.startsWith("!")) return;

    const parts = message.trim().slice(1).split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    try {
      const result = await handleCommand(cmd, args);
      if (!result) return;

      // Twitch tiene límite de ~500 caracteres, cortamos si es muy largo
      let text = result.text;
      if (text.length > 480) {
        text = text.slice(0, 477) + "...";
      }
      await client.say(chan, text);
    } catch (err) {
      console.error("[Twitch] Error en comando:", err.message);
    }
  });

  client.on("disconnected", (reason) => {
    console.warn("[Twitch] Desconectado:", reason);
  });

  client.connect().catch((err) => {
    console.error("[Twitch] Error al conectar:", err.message);
  });

  // Anuncios automáticos en Twitch
  const hours = Number(process.env.ANNOUNCE_HOURS) || 2;
  if (hours > 0) {
    const ms = hours * 60 * 60 * 1000;
    announceTimer = setInterval(async () => {
      try {
        const { text } = await buildAnnouncement();
        // En Twitch mejor mensajes más cortos
        const short = text
          .replace(/\*\*/g, "")
          .split("\n")
          .slice(0, 8)
          .join(" | ");
        await client.say(`#${channel}`, short.slice(0, 480));
        console.log("[Twitch] Anuncio automático enviado");
      } catch (err) {
        console.error("[Twitch] Error en anuncio:", err.message);
      }
    }, ms);
  }

  return client;
}

export function stopTwitch() {
  if (announceTimer) clearInterval(announceTimer);
  if (client) {
    client.disconnect();
    client = null;
  }
}

export async function sendTwitchMessage(text) {
  if (!client) return;
  const channel = (process.env.TWITCH_CHANNEL || "alertadropsmx").toLowerCase();
  await client.say(`#${channel}`, text.slice(0, 480));
}
