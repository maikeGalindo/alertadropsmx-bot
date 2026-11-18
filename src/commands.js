/**
 * Lógica de comandos compartida entre Twitch y Discord
 */

import {
  fetchBadges,
  getActive,
  getExpiringSoon,
  findBadge,
  getByCategory,
  formatTimeLeft,
} from "./sheet.js";

const MAX_LIST = 12; // máximo de insignias en una lista para no spamear

/**
 * Construye el texto de respuesta para un comando
 * @returns {{ text: string, embed?: object }}
 */
export async function handleCommand(cmd, args = []) {
  const badges = await fetchBadges();
  const command = cmd.toLowerCase().replace(/^!/, "");

  switch (command) {
    case "insignias":
    case "activas":
    case "badges":
    case "activas":
      return listActive(badges);

    case "expiran":
    case "pronto":
    case "terminan":
    case "expiring":
      return listExpiring(badges);

    case "badge":
    case "insignia":
    case "info": {
      const query = args.join(" ");
      if (!query) {
        return {
          text: "Uso: !badge <nombre o slug>  |  Ejemplo: !badge pearl",
        };
      }
      return badgeInfo(badges, query);
    }

    case "categoria":
    case "category":
    case "juego": {
      const query = args.join(" ");
      if (!query) {
        return {
          text: "Uso: !categoria <nombre del juego>  |  Ejemplo: !categoria payday",
        };
      }
      return listByCategory(badges, query);
    }

    case "comandos":
    case "comnd":
    case "cmd":
      return helpText();

    default:
      return null; // comando no reconocido
  }
}

function listActive(badges) {
  const active = getActive(badges);
  if (active.length === 0) {
    return { text: "No hay insignias activas en este momento." };
  }

  const list = active
    .slice(0, MAX_LIST)
    .map((b) => {
      const left = formatTimeLeft(b.endsAt);
      const type = b.type === "sub" ? "Sub" : "Watch";
      return `• ${b.name} (${type}) – ${left}`;
    })
    .join("\n");

  const extra =
    active.length > MAX_LIST
      ? `\n… y ${active.length - MAX_LIST} más. Usa !badge <nombre> para detalles.`
      : "";

  return {
    text: `🎖️ Insignias activas (${active.length}):\n${list}${extra}`,
    embed: {
      title: `🎖️ Insignias activas (${active.length})`,
      description: list + extra,
      color: 0x00f0ff,
    },
  };
}

function listExpiring(badges) {
  const soon = getExpiringSoon(badges);
  if (soon.length === 0) {
    return {
      text: "Ninguna insignia activa termina en los próximos días. ¡Todo tranquilo!",
    };
  }

  // Ordenar por las que terminan antes
  soon.sort((a, b) => (a.endsAt?.getTime() || 0) - (b.endsAt?.getTime() || 0));

  const list = soon
    .slice(0, MAX_LIST)
    .map((b) => {
      const left = formatTimeLeft(b.endsAt);
      return `⚠️ ${b.name} – queda ${left}`;
    })
    .join("\n");

  return {
    text: `⏰ Terminan pronto (${soon.length}):\n${list}`,
    embed: {
      title: `⏰ Terminan pronto (${soon.length})`,
      description: list,
      color: 0xff6b00,
    },
  };
}

function badgeInfo(badges, query) {
  const b = findBadge(badges, query);
  if (!b) {
    return {
      text: `No encontré ninguna insignia que coincida con "${query}". Prueba con el nombre o el slug.`,
    };
  }

  const statusEmoji = b.status === "active" ? "🟢" : "🔴";
  const typeLabel = b.type === "sub" ? "Suscripción / Regalo" : "Tiempo visto";
  const left = formatTimeLeft(b.endsAt);
  const starts = b.startsAt
    ? b.startsAt.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })
    : "—";
  const ends = b.endsAt
    ? b.endsAt.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })
    : "—";

  const text = [
    `${statusEmoji} **${b.name}**`,
    `Estado: ${b.status} | Tipo: ${typeLabel}`,
    `Categoría: ${b.category || "—"}`,
    `Cómo: ${b.claimMethod || "—"}`,
    `Inicio: ${starts} | Fin: ${ends} (${left})`,
  ].join("\n");

  return {
    text,
    embed: {
      title: b.name,
      description: b.notes || b.claimMethod || "",
      color: b.status === "active" ? 0x00f0ff : 0x666666,
      thumbnail: b.image ? { url: b.image } : undefined,
      fields: [
        { name: "Estado", value: `${statusEmoji} ${b.status}`, inline: true },
        { name: "Tipo", value: typeLabel, inline: true },
        { name: "Categoría", value: b.category || "—", inline: true },
        { name: "Cómo conseguirla", value: b.claimMethod || "—", inline: false },
        { name: "Inicio", value: starts, inline: true },
        { name: "Fin", value: `${ends}\n(${left})`, inline: true },
      ],
      footer: { text: `slug: ${b.slug}` },
    },
  };
}

function listByCategory(badges, category) {
  const list = getByCategory(badges, category);
  if (list.length === 0) {
    return {
      text: `No hay insignias activas en la categoría "${category}".`,
    };
  }

  const text = list
    .map((b) => `• ${b.name} – ${formatTimeLeft(b.endsAt)}`)
    .join("\n");

  return {
    text: `🎮 ${category} – ${list.length} activa(s):\n${text}`,
    embed: {
      title: `🎮 ${category}`,
      description: text,
      color: 0x3b82f6,
    },
  };
}

function helpText() {
  const text = [
    "📋 Comandos de AlertaDropsMX:",
    "!activas / !insignias  → Lista de insignias activas",
    "!expiran / !pronto     → Las que terminan pronto",
    "!badge <nombre>        → Info detallada de una insignia",
    "!categoria <juego>     → Insignias de una categoría",
    "!ayuda                 → Este mensaje",
  ].join("\n");

  return {
    text,
    embed: {
      title: "📋 Comandos de AlertaDropsMX",
      description: text.replace(/📋 Comandos de AlertaDropsMX:\n/, ""),
      color: 0x00f0ff,
    },
  };
}

/**
 * Texto de anuncio automático (para cron)
 */
export async function buildAnnouncement() {
  const badges = await fetchBadges(true); // forzar refresh
  const active = getActive(badges);
  const soon = getExpiringSoon(badges);

  let text = `🎖️ **AlertaDropsMX** – Resumen de insignias\n`;
  text += `Activas: **${active.length}**`;

  if (soon.length > 0) {
    text += ` | Terminan pronto: **${soon.length}**\n\n`;
    soon
      .sort((a, b) => (a.endsAt?.getTime() || 0) - (b.endsAt?.getTime() || 0))
      .slice(0, 6)
      .forEach((b) => {
        text += `⚠️ ${b.name} – queda ${formatTimeLeft(b.endsAt)}\n`;
      });
  } else {
    text += `\nNinguna termina en los próximos días.`;
  }

  text += `\nUsa !activas o !badge <nombre> para más info.`;

  return {
    text,
    embed: {
      title: "🎖️ Resumen de insignias",
      description: text,
      color: soon.length > 0 ? 0xff6b00 : 0x00f0ff,
      footer: { text: "AlertaDropsMX Bot" },
      timestamp: new Date().toISOString(),
    },
  };
}
