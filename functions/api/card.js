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

function makeId(length = 12) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => (byte % 36).toString(36)).join("");
}

function wallKey(wallId) {
  return `wall:${wallId}`;
}

function publicWall(wall) {
  return {
    id: wall.id,
    recipient: cleanText(wall.recipient || "Friend", 40),
    wishes: Array.isArray(wall.wishes) ? wall.wishes.map(cleanWish) : [],
  };
}

async function readWall(env, wallId) {
  const wall = await env.BIRTHDAY_KV.get(wallKey(wallId), "json");
  return wall ? publicWall(wall) : null;
}

async function readPrivateWall(env, wallId) {
  return env.BIRTHDAY_KV.get(wallKey(wallId), "json");
}

async function writeWall(env, wall) {
  const nextWall = {
    id: cleanText(wall.id, 32),
    adminToken: cleanText(wall.adminToken, 64),
    createdAt: wall.createdAt || new Date().toISOString(),
    recipient: cleanText(wall.recipient || "Friend", 40),
    wishes: Array.isArray(wall.wishes) ? wall.wishes.map(cleanWish).slice(0, 120) : [],
  };
  await env.BIRTHDAY_KV.put(wallKey(nextWall.id), JSON.stringify(nextWall));
  return nextWall;
}

async function createWall(env, request) {
  const body = await request.json();
  const wall = await writeWall(env, {
    id: makeId(12),
    adminToken: makeId(24),
    createdAt: new Date().toISOString(),
    recipient: cleanText(body.recipient || "Friend", 40),
    wishes: [],
  });

  return json({
    ...publicWall(wall),
    adminToken: wall.adminToken,
  }, { status: 201 });
}

async function updateWall(env, request, wallId) {
  const token = request.headers.get("x-admin-token") || "";
  const currentWall = await readPrivateWall(env, wallId);
  if (!currentWall) return json({ error: "Wall not found" }, { status: 404 });
  if (currentWall.adminToken !== token) return json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const wall = await writeWall(env, {
    ...currentWall,
    recipient: body.recipient || currentWall.recipient,
    wishes: Array.isArray(body.wishes) ? body.wishes : currentWall.wishes,
  });

  return json(publicWall(wall));
}

async function addWish(env, request, wallId) {
  const entry = cleanWish(await request.json());
  if (!entry.name || !entry.wish || !entry.note) {
    return json({ error: "Missing required wish fields" }, { status: 400 });
  }

  const wall = await readPrivateWall(env, wallId);
  if (!wall) return json({ error: "Wall not found" }, { status: 404 });

  wall.wishes = Array.isArray(wall.wishes) ? wall.wishes : [];
  wall.wishes.unshift(entry);
  return json(publicWall(await writeWall(env, wall)));
}

async function resetWall(env, request, wallId) {
  const token = request.headers.get("x-admin-token") || "";
  const wall = await readPrivateWall(env, wallId);
  if (!wall) return json({ error: "Wall not found" }, { status: 404 });
  if (wall.adminToken !== token) return json({ error: "Unauthorized" }, { status: 401 });

  wall.wishes = [];
  return json(publicWall(await writeWall(env, wall)));
}

export async function onRequest({ request, env }) {
  if (!env.BIRTHDAY_KV) {
    return json({ error: "Missing BIRTHDAY_KV binding" }, { status: 500 });
  }

  const url = new URL(request.url);
  const wallId = cleanText(url.searchParams.get("wall"), 32);

  if (request.method === "POST" && !wallId) {
    return createWall(env, request);
  }

  if (!wallId) {
    return json({ error: "Missing wall id" }, { status: 400 });
  }

  if (request.method === "GET") {
    const wall = await readWall(env, wallId);
    return wall ? json(wall) : json({ error: "Wall not found" }, { status: 404 });
  }

  if (request.method === "POST") {
    return addWish(env, request, wallId);
  }

  if (request.method === "PUT") {
    return updateWall(env, request, wallId);
  }

  if (request.method === "DELETE") {
    return resetWall(env, request, wallId);
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}
