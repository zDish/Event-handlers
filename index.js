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

const token = process.env.BOT_TOKEN;
const room = process.env.ROOM_ID;

if (!token || !room) {
  console.error("Missing BOT_TOKEN or ROOM_ID in environment variables.");
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
  room,
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
  console.log(`[EMOTE] ${user?.username} did ${emote_id} ${receiver ? `to ${receiver.username}` : ""}`.trim());
});

// reaction
client.on("reaction", ({ user, reaction, receiver }) => {
  console.log(`[REACTION] ${user?.username} -> ${receiver?.username} : ${reaction?.id || JSON.stringify(reaction)}`);
});

// user_joined
client.on("user_joined", ({ user }) => {
  console.log(`[JOIN] ${user?.username}`);
});

// user_left
client.on("user_left", ({ user }) => {
  console.log(`[LEAVE] ${user?.username}`);
});

// user_moved
client.on("user_moved", ({ user, position }) => {
  const p = position || {};
  console.log(`[MOVE] ${user?.username} -> x:${p.x} y:${p.y} z:${p.z}`);
});

// tip_reaction
client.on("tip_reaction", ({ sender, receiver, tip }) => {
  console.log(`[TIP] ${sender?.username} -> ${receiver?.username} : ${tip?.type || ""} ${tip?.amount || ""}`);
});

// voice
client.on("voice", ({ user, speaking }) => {
  console.log(`[VOICE] ${user?.username} speaking=${speaking}`);
});

// channel
client.on("channel", ({ sender_id, message, tags }) => {
  console.log(`[CHANNEL] from:${sender_id} tags:${[...new Set(tags || [])].join(",")} msg:${message}`);
});

// fallback
client.on("*", (payload) => {
  if (payload?.event && payload?.data) {
    console.log(`[ANY] ${payload.event}`, payload.data);
  }
});
