/**
 * AlertaDropsMX Bot
 * Twitch + Discord – Anuncios y comandos de insignias
 */

import "dotenv/config";
import { fetchBadges } from "./sheet.js";
import { startTwitch, stopTwitch } from "./twitch.js";
import { startDiscord, stopDiscord } from "./discord.js";

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("  AlertaDropsMX Bot  –  iniciando...");
  console.log("═══════════════════════════════════════");

  // Cargar base de datos al arrancar
  const badges = await fetchBadges(true);
  console.log(`[Init] ${badges.length} insignias cargadas`);

  // Arrancar clientes
  startTwitch();
  startDiscord();

  // Refresh periódico (además del cache interno)
  const refreshMin = Number(process.env.REFRESH_MINUTES) || 5;
  setInterval(() => {
    fetchBadges(true).catch((err) =>
      console.error("[Refresh] Error:", err.message)
    );
  }, refreshMin * 60 * 1000);

  // Cierre limpio
  const shutdown = () => {
    console.log("\nCerrando bot...");
    stopTwitch();
    stopDiscord();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
