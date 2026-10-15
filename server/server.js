import express from "express";
import path from "node:path";
import { execFile, spawn } from "node:child_process";
import { Readable } from "node:stream";
import { createHmac, timingSafeEqual } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const app = express();
const db = new PrismaClient();
const validId = (id) => /^[\w-]{11}$/.test(id);

// yt-dlp necesita un runtime JS para YouTube; usamos node (ya está en el contenedor)
const run = (args) =>
  new Promise((ok, fail) =>
    execFile("yt-dlp", ["--no-warnings", "--js-runtimes", "node", ...args], { maxBuffer: 20e6 }, (e, out, err) =>
      e ? fail(new Error(err || e.message)) : ok(out)
    )
  );

// Actualiza yt-dlp al arrancar y cada 24h
const update = () => spawn("yt-dlp", ["-U"], { stdio: "ignore" }).on("error", () => {});
update();
setInterval(update, 24 * 3600e3);

app.use(express.json());

// Login con cookie (APP_PASSWORD). La sesión es un HMAC de la contraseña: si la cambias, se cierran todas
const PASS = process.env.APP_PASSWORD;
const TOKEN = PASS && createHmac("sha256", PASS).update("musica-session").digest("hex");
const same = (a, b) => {
  const x = Buffer.from(String(a ?? "")), y = Buffer.from(String(b ?? ""));
  return x.length === y.length && timingSafeEqual(x, y);
};
const getCookie = (req, name) =>
  (req.headers.cookie || "").split(/;\s*/).find((c) => c.startsWith(name + "="))?.slice(name.length + 1);
const setSession = (req, res, value, maxAge) =>
  res.setHeader(
    "Set-Cookie",
    `sid=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}` +
      (req.headers["x-forwarded-proto"] === "https" ? "; Secure" : "")
  );

app.post("/api/login", async (req, res) => {
  if (!PASS) return res.sendStatus(204);
  if (!same(req.body.password, PASS)) {
    await new Promise((r) => setTimeout(r, 1000)); // frena fuerza bruta
    return res.status(401).json({ error: "Contraseña incorrecta" });
  }
  setSession(req, res, TOKEN, 365 * 86400);
  res.sendStatus(204);
});
app.post("/api/logout", (req, res) => {
  setSession(req, res, "", 0);
  res.sendStatus(204);
});
app.use("/api", (req, res, next) => (!PASS || same(getCookie(req, "sid"), TOKEN) ? next() : res.sendStatus(401)));
app.get("/api/me", (_, res) => res.sendStatus(204));

const parseList = (out) =>
  out.trim().split("\n").filter(Boolean).map((l) => {
    const v = JSON.parse(l);
    return { videoId: v.id, title: v.title, channel: v.channel ?? v.uploader, duration: v.duration ?? null };
  });

app.get("/api/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json([]);
  db.search.upsert({ where: { q }, create: { q }, update: { q } }).catch(() => {});
  res.json(parseList(await run([`ytsearch20:${q}`, "--flat-playlist", "--dump-json"])));
});

// Radio: el "Mix" automático de YouTube para esa canción (RD + id)
app.get("/api/radio/:id", async (req, res) => {
  const { id } = req.params;
  if (!validId(id)) return res.sendStatus(400);
  const url = `https://www.youtube.com/watch?v=${id}&list=RD${id}`;
  res.json(parseList(await run([url, "--flat-playlist", "--dump-json", "--playlist-end", "25"])));
});

// Cache de URLs directas de googlevideo (caducan en ~6h)
const cache = new Map();
function streamUrl(id, fresh) {
  const c = cache.get(id);
  if (!fresh && c && c.exp > Date.now()) return c.url;
  const entry = { exp: Date.now() + 60e3 };
  entry.url = run(["-g", "-f", "bestaudio[ext=m4a]/bestaudio", `https://www.youtube.com/watch?v=${id}`]).then((out) => {
    const url = out.trim().split("\n")[0];
    entry.exp = (Number(new URL(url).searchParams.get("expire")) * 1000 || Date.now() + 3600e3) - 300e3;
    return url;
  });
  entry.url.catch(() => cache.delete(id));
  cache.set(id, entry);
  return entry.url;
}

// Proxy con soporte de Range => permite adelantar/retroceder
app.get("/api/stream/:id", async (req, res) => {
  const { id } = req.params;
  if (!validId(id)) return res.sendStatus(400);
  const ac = new AbortController();
  res.on("close", () => ac.abort());
  let up;
  for (const fresh of [false, true]) {
    up = await fetch(await streamUrl(id, fresh), {
      headers: { range: req.headers.range || "bytes=0-" },
      signal: ac.signal,
    });
    if (up.ok) break;
    await up.body?.cancel();
  }
  if (!up.ok) return res.sendStatus(502);
  res.status(up.status).setHeader("Accept-Ranges", "bytes");
  for (const h of ["content-type", "content-length", "content-range"]) {
    const v = up.headers.get(h);
    if (v) res.setHeader(h, v);
  }
  Readable.fromWeb(up.body).on("error", () => {}).pipe(res);
});

// Playlists
const num = (v) => Number(v) || 0;
app.get("/api/playlists", async (_, res) => res.json(await db.playlist.findMany({ orderBy: { createdAt: "asc" } })));
app.post("/api/playlists", async (req, res) =>
  res.json(await db.playlist.create({ data: { name: String(req.body.name || "Nueva playlist").slice(0, 100) } }))
);
app.get("/api/playlists/:id", async (req, res) => {
  const p = await db.playlist.findUnique({ where: { id: num(req.params.id) }, include: { tracks: { orderBy: { addedAt: "asc" } } } });
  p ? res.json(p) : res.sendStatus(404);
});
app.delete("/api/playlists/:id", async (req, res) => {
  await db.playlist.delete({ where: { id: num(req.params.id) } });
  res.sendStatus(204);
});
app.post("/api/playlists/:id/tracks", async (req, res) => {
  const { videoId, title, channel, duration } = req.body;
  if (!validId(videoId)) return res.sendStatus(400);
  res.json(
    await db.track.create({
      data: { playlistId: num(req.params.id), videoId, title: String(title), channel: channel ?? null, duration: duration ?? null },
    })
  );
});
app.delete("/api/tracks/:id", async (req, res) => {
  await db.track.delete({ where: { id: num(req.params.id) } });
  res.sendStatus(204);
});

// Historial: búsquedas recientes, escuchado hace poco y lo más escuchado
app.get("/api/history", async (_, res) => {
  const [searches, recent, top] = await Promise.all([
    db.search.findMany({ orderBy: { updatedAt: "desc" }, take: 12 }),
    db.play.findMany({ orderBy: { playedAt: "desc" }, take: 12 }),
    db.play.findMany({ orderBy: [{ count: "desc" }, { playedAt: "desc" }], take: 10 }),
  ]);
  res.json({ searches: searches.map((s) => s.q), recent, top });
});
app.post("/api/history", async (req, res) => {
  const { videoId, title, channel, duration } = req.body;
  if (!validId(videoId)) return res.sendStatus(400);
  await db.play.upsert({
    where: { videoId },
    create: { videoId, title: String(title), channel: channel ?? null, duration: duration ?? null },
    update: { count: { increment: 1 }, playedAt: new Date() },
  });
  res.sendStatus(204);
});
app.delete("/api/history", async (_, res) => {
  await db.$transaction([db.search.deleteMany(), db.play.deleteMany()]);
  res.sendStatus(204);
});

// Frontend compilado (en Docker)
app.use(express.static("public"));
app.use((req, res) => res.sendFile(path.resolve("public/index.html")));

app.use((err, req, res, next) => {
  console.error(err.message);
  if (!res.headersSent) res.status(500).json({ error: err.message });
});

app.listen(process.env.PORT || 3000, () => console.log("Escuchando en :" + (process.env.PORT || 3000)));
