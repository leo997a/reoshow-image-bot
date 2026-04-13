const BASE = (process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, "");
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

function ensureConfig() {
  if (!BASE || !TOKEN) {
    throw new Error("Missing Upstash Redis config");
  }
}

async function redisGet(key) {
  ensureConfig();
  const res = await fetch(`${BASE}/get/${encodeURIComponent(key)}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Redis GET failed: ${JSON.stringify(data)}`);
  }

  return data?.result ?? null;
}

async function redisSetEx(key, ttlSeconds, value) {
  ensureConfig();
  const res = await fetch(
    `${BASE}/setex/${encodeURIComponent(key)}/${ttlSeconds}/${encodeURIComponent(value)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Redis SETEX failed: ${JSON.stringify(data)}`);
  }

  return data?.result;
}

async function redisDel(key) {
  ensureConfig();
  const res = await fetch(`${BASE}/del/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Redis DEL failed: ${JSON.stringify(data)}`);
  }

  return data?.result;
}

function imageSessionKey(userId) {
  return `awaiting_photo:${userId}`;
}

export async function openImageSession(userId, ttlSeconds = 600) {
  return redisSetEx(imageSessionKey(userId), ttlSeconds, "1");
}

export async function hasImageSession(userId) {
  const value = await redisGet(imageSessionKey(userId));
  return value === "1";
}

export async function clearImageSession(userId) {
  return redisDel(imageSessionKey(userId));
}
