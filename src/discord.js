/**
 * Cliente de Discord (discord.js)
 */

import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  Partials,
} from "discord.js";
import { handleCommand, buildAnnouncement } from "./commands.js";

let client = null;
let announceTimer = null;

export function startDiscord() {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    console.warn("[Discord] Falta DISCORD_TOKEN. Discord desactivado.");
    return null;
  }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
  });

  client.once("ready", () => {
    console.log(`[Discord] Conectado como ${client.user.tag}`);
  });

  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const prefix = process.env.DISCORD_PREFIX || "!";
    if (!message.content.startsWith(prefix)) return;

    const withoutPrefix = message.content.slice(prefix.length).trim();
    const parts = withoutPrefix.split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    try {
      const result = await handleCommand(cmd, args);
      if (!result) return;

      if (result.embed) {
        const embed = new EmbedBuilder(result.embed);
        await message.reply({ embeds: [embed] });
      } else {
        await message.reply(result.text);
      }
    } catch (err) {
      console.error("[Discord] Error en comando:", err.message);
      await message.reply("Ocurrió un error al procesar el comando.").catch(() => {});
    }
  });

  client.login(token).catch((err) => {
    console.error("[Discord] Error al conectar:", err.message);
  });

  // Anuncios automáticos en el canal configurado
  const hours = Number(process.env.ANNOUNCE_HOURS) || 2;
  const channelId = process.env.DISCORD_ANNOUNCE_CHANNEL_ID;

  if (hours > 0 && channelId) {
    const ms = hours * 60 * 60 * 1000;
    // Esperar un poco a que el cliente esté listo
    setTimeout(() => {
      announceTimer = setInterval(async () => {
        try {
          const channel = await client.channels.fetch(channelId);
          if (!channel || !channel.isTextBased()) return;

          const { embed } = await buildAnnouncement();
          const e = new EmbedBuilder(embed);
          await channel.send({ embeds: [e] });
          console.log("[Discord] Anuncio automático enviado");
        } catch (err) {
          console.error("[Discord] Error en anuncio:", err.message);
        }
      }, ms);
    }, 15000);
  }

  return client;
}

export function stopDiscord() {
  if (announceTimer) clearInterval(announceTimer);
  if (client) {
    client.destroy();
    client = null;
  }
}

export async function sendDiscordAnnouncement(textOrEmbed) {
  if (!client) return;
  const channelId = process.env.DISCORD_ANNOUNCE_CHANNEL_ID;
  if (!channelId) return;

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) return;

    if (typeof textOrEmbed === "string") {
      await channel.send(textOrEmbed);
    } else {
      const embed = new EmbedBuilder(textOrEmbed);
      await channel.send({ embeds: [embed] });
    }
  } catch (err) {
    console.error("[Discord] Error al enviar anuncio:", err.message);
  }
}
