# AlertaDropsMX Bot

Bot de **Twitch + Discord** para el canal AlertaDropsMX.

- Anuncia automáticamente insignias **activas** y las que **terminan pronto**
- Responde a comandos con información en vivo de la base de datos (Google Sheet)

---

## Comandos disponibles

| Comando | Descripción |
|---------|-------------|
| `!activas` / `!insignias` | Lista de insignias activas |
| `!expiran` / `!pronto` | Insignias que terminan en los próximos días |
| `!badge <nombre>` | Info detallada de una insignia |
| `!categoria <juego>` | Insignias activas de esa categoría |
| `!ayuda` | Muestra esta ayuda |

---

## Requisitos

- Node.js 18 o superior
- Cuenta de bot en Twitch (o usar la del canal)
- Bot de Discord creado en el [Developer Portal](https://discord.com/developers/applications)

---

## 1. Configurar Twitch

1. Entra a [twitchtokengenerator.com](https://twitchtokengenerator.com/) o usa el flujo de OAuth de Twitch.
2. Genera un token con scopes: `chat:read` + `chat:edit`.
3. Copia el token (empieza por `oauth:`).

En el `.env`:

```env
TWITCH_USERNAME=nombre_de_tu_bot
TWITCH_OAUTH=oauth:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWITCH_CHANNEL=alertadropsmx
```

> El bot debe estar unido al canal (o ser moderador) para poder hablar.

---

## 2. Configurar Discord

1. Ve a [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. En **Bot** → Create Bot → copia el **Token**.
3. Activa **Message Content Intent** (importante).
4. En **OAuth2 → URL Generator**:
   - Scopes: `bot`
   - Permissions: `Send Messages`, `Embed Links`, `Read Message History`
5. Abre el link generado e invita el bot a tu servidor.
6. Activa el modo desarrollador en Discord (Ajustes → Avanzado) y copia el **ID del canal** donde quieres los anuncios automáticos (clic derecho → Copiar ID).

En el `.env`:

```env
DISCORD_TOKEN=tu_token_aqui
DISCORD_CLIENT_ID=123456789012345678
DISCORD_ANNOUNCE_CHANNEL_ID=1234567890123456789
DISCORD_PREFIX=!
```

---

## 3. Instalación

```bash
cd alertadropsmx-bot
cp .env.example .env
# Edita .env con tus tokens

npm install
npm start
```

Para desarrollo (reinicia al cambiar código):

```bash
npm run dev
```

---

## 4. Variables de entorno (resumen)

| Variable | Descripción | Default |
|----------|-------------|---------|
| `TWITCH_USERNAME` | Usuario del bot de Twitch | — |
| `TWITCH_OAUTH` | Token OAuth (`oauth:...`) | — |
| `TWITCH_CHANNEL` | Canal donde habla el bot | `alertadropsmx` |
| `DISCORD_TOKEN` | Token del bot de Discord | — |
| `DISCORD_ANNOUNCE_CHANNEL_ID` | Canal de anuncios automáticos | — |
| `DISCORD_PREFIX` | Prefijo de comandos | `!` |
| `SHEET_CSV_URL` | URL del CSV del Google Sheet | (la del proyecto) |
| `REFRESH_MINUTES` | Cada cuántos minutos se refresca la base | `5` |
| `ANNOUNCE_HOURS` | Cada cuántas horas se hace anuncio automático | `2` |
| `EXPIRE_SOON_HOURS` | Horas para considerar “termina pronto” | `72` |

---

## 5. Desplegar 24/7 (recomendado)

Opciones fáciles y gratuitas/baratas:

- **[Railway](https://railway.app)** → New Project → Deploy from GitHub (o CLI)
- **[Render](https://render.com)** → Web Service (o Background Worker)
- **[Fly.io](https://fly.io)**
- Un VPS barato (Hetzner, Contabo, etc.)

En todos los casos:

1. Sube el código (o conéctalo a un repo)
2. Configura las variables de entorno en el panel
3. Comando de inicio: `npm start`

---

## Estructura del proyecto

```
alertadropsmx-bot/
├── src/
│   ├── index.js      ← punto de entrada
│   ├── sheet.js      ← lectura del Google Sheet
│   ├── commands.js   ← lógica de comandos + anuncios
│   ├── twitch.js     ← cliente Twitch (tmi.js)
│   └── discord.js    ← cliente Discord (discord.js)
├── .env.example
├── package.json
└── README.md
```

---

## Notas

- La base de datos es el **mismo Google Sheet** que usa el sitio y el overlay.
- El bot no necesita Google API Key: usa el CSV público.
- Si el Sheet no está actualizado, el bot tampoco lo estará (refresca cada 5 min por defecto).
- En Twitch los mensajes tienen límite de ~500 caracteres; el bot los recorta automáticamente.
