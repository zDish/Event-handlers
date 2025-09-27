require("dotenv").config();
const { Highrise } = require("highrise-js-sdk");

const EVENTS = [
  "chat",
  "emote",
  "reaction",
  "user_joined",
  "user_left",
  "user_moved",
  "tip_reaction",
  "voice",
  "channel",
];

// Hard-coded room ID
const ROOM_ID = "6682bdb29a847a2f1c0c0667";
const token = process.env.BOT_TOKEN;

if (!token) {
  console.error("Missing BOT_TOKEN in environment variables.");
  process.exit(1);
}

const eventsListMsg =
  "Highrise Bot Events:\n" +
  EVENTS.map((e, i) => `${i + 1}. ${e}`).join("\n") +
  "\n\nTip: subscribe via websocket query `?events=" +
  EVENTS.join(",") +
  "`.";

const client = new Highrise({
  token,
  room: ROOM_ID,
  events: EVENTS,
  reconnect: 5,
});

client.on("ready", async () => {
  console.log("[READY] Connected.");
  try {
    await client.chat("Type !events to see all event handlers I support.");
  } catch (e) {
    console.warn("Could not send ready chat:", e.message);
  }
});

async function handleEventsCommand(ctx, viaWhisper = false) {
  try {
    if (viaWhisper && ctx?.user?.id) {
      await client.whisper(ctx.user.id, eventsListMsg);
    } else {
      await client.chat(eventsListMsg);
    }
  } catch (e) {
    console.error("Failed to send events list:", e);
  }
}

async function parseCommand(fromUser, message, viaWhisper = false) {
  const text = (message || "").trim();
  if (!text.startsWith("!")) return;

  const [cmd] = text.slice(1).split(/\s+/);
  switch (cmd.toLowerCase()) {
    case "events":
    case "handlers":
    case "help":
      await handleEventsCommand({ user: fromUser }, viaWhisper);
      break;
    default:
      await (viaWhisper
        ? client.whisper(fromUser.id, "Unknown command. Try !events")
        : client.chat("Unknown command. Try !events"));
  }
}

// chat
client.on("chat", async ({ user, message, isWhisper }) => {
  console.log(`[CHAT] ${isWhisper ? "(whisper) " : ""}${user?.username}: ${message}`);
  if (message?.startsWith("!")) {
    await parseCommand(user, message, Boolean(isWhisper));
  }
});

// whisper (if SDK exposes separately)
client.on?.("whisper", async ({ user, message }) => {
  console.log(`[WHISPER] ${user?.username}: ${message}`);
  if (message?.startsWith("!")) await parseCommand(user, message, true);
});

// emote
client.on("emote", ({ user, emote_id, receiver }) => {
  console.log(`[EMOTE] ${user
