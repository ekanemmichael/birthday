const cardKey = "birthday-card";

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...init.headers,
    },
  });
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function cleanWish(entry) {
  return {
    name: cleanText(entry.name, 40),
    wish: cleanText(entry.wish, 80),
    note: cleanText(entry.note, 420),
    photo: String(entry.photo || "").slice(0, 220000),
  };
}

async function readCard(env) {
  const stored = await env.BIRTHDAY_KV.get(cardKey, "json");
  return {
    recipient: cleanText(stored?.recipient || "Friend", 40),
    wishes: Array.isArray(stored?.wishes) ? stored.wishes.map(cleanWish) : [],
  };
}

async function writeCard(env, card) {
  const nextCard = {
    recipient: cleanText(card.recipient || "Friend", 40),
    wishes: Array.isArray(card.wishes) ? card.wishes.map(cleanWish).slice(0, 120) : [],
  };
  await env.BIRTHDAY_KV.put(cardKey, JSON.stringify(nextCard));
  return nextCard;
}

export async function onRequest({ request, env }) {
  if (!env.BIRTHDAY_KV) {
    return json({ error: "Missing BIRTHDAY_KV binding" }, { status: 500 });
  }

  if (request.method === "GET") {
    return json(await readCard(env));
  }

  if (request.method === "POST") {
    const entry = cleanWish(await request.json());
    if (!entry.name || !entry.wish || !entry.note) {
      return json({ error: "Missing required wish fields" }, { status: 400 });
    }

    const card = await readCard(env);
    card.wishes.unshift(entry);
    return json(await writeCard(env, card));
  }

  if (request.method === "PUT") {
    const body = await request.json();
    return json(await writeCard(env, body));
  }

  if (request.method === "DELETE") {
    await env.BIRTHDAY_KV.delete(cardKey);
    return json({ recipient: "Friend", wishes: [] });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}
