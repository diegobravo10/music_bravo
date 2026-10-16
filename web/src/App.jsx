import { useEffect, useRef, useState } from "react";

const api = (path, opts = {}) =>
  fetch(`/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json" },
    body: opts.body && JSON.stringify(opts.body),
  }).then((r) => {
    if (r.status === 401 && path !== "/login") dispatchEvent(new Event("unauth"));
    return !r.ok ? Promise.reject(r) : r.status === 204 ? null : r.json();
  });
const store = {
  get: (k, d) => {
    try {
      return JSON.parse(localStorage.getItem(k)) ?? d;
    } catch {
      return d;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};
const thumb = (id, hq) => `https://i.ytimg.com/vi/${id}/${hq ? "hqdefault" : "mqdefault"}.jpg`;
const fmt = (s) => (!s || !isFinite(s) ? "–:––" : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`);
const pick = ({ videoId, title, channel, duration }) => ({ videoId, title, channel, duration });
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
};

const I = {
  play: "M8 5.5v13l10.5-6.5z",
  pause: "M7 5h3.5v14H7zm6.5 0H17v14h-3.5z",
  next: "M6 6l8.5 6L6 18zM16 6h2v12h-2z",
  prev: "M18 6l-8.5 6L18 18zM6 6h2v12H6z",
  plus: "M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z",
  x: "M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z",
  vol: "M4 9v6h4l5 4V5L8 9zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z",
  search: "M10 4a6 6 0 1 0 3.7 10.7l4.8 4.8 1.4-1.4-4.8-4.8A6 6 0 0 0 10 4zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z",
  home: "M12 4 4 10.5V20h5.5v-5.5h5V20H20v-9.5z",
  radio: "M12 4a8 8 0 1 0 8 8h-2a6 6 0 1 1-1.8-4.2L13 11h7V4l-2.4 2.4A8 8 0 0 0 12 4z",
  queue: "M4 6h13v2H4zm0 5h13v2H4zm0 5h8v2H4zm11 0v5l4.5-2.5z",
  down: "M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z",
  more: "M6 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z",
  ban: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 2a7 7 0 0 1 5.6 11.2L7.8 6.4A7 7 0 0 1 12 5zm-5.6 2.8 9.8 9.8A7 7 0 0 1 6.4 7.8z",
  out: "M10 4H5v16h5v-2H7V6h3zm5.6 3.4L14.2 8.8l2.2 2.2H9v2h7.4l-2.2 2.2 1.4 1.4L20.2 12z",
};
const Icon = ({ d, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d={d} />
  </svg>
);
const Brand = () => (
  <div className="brand">
    <img src="/logo.svg" alt="" />
    <span>
      Bravo<b>Sound</b>
    </span>
  </div>
);
const Eq = () => (
  <span className="eq">
    <i />
    <i />
    <i />
  </span>
);

export default function App() {
  const [authed, setAuthed] = useState(null);
  useEffect(() => {
    api("/me").then(() => setAuthed(true), () => setAuthed(false));
    const off = () => setAuthed(false);
    addEventListener("unauth", off);
    return () => removeEventListener("unauth", off);
  }, []);
  const logout = () => api("/logout", { method: "POST" }).finally(() => setAuthed(false));

  if (authed === null) return null;
  return authed ? <Music onLogout={logout} /> : <Login onOk={() => setAuthed(true)} />;
}

function Login({ onOk }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api("/login", { method: "POST", body: { password: pw } });
      onOk();
    } catch {
      setErr("Esa no es. Intenta otra vez.");
      setPw("");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="login">
      <form onSubmit={submit}>
        <Brand />
        <p className="c">Tu música, en tu servidor.</p>
        <input type="text" name="username" autoComplete="username" value="musica" readOnly hidden />
        <input
          className="field"
          type="password"
          autoComplete="current-password"
          autoFocus
          placeholder="Contraseña"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        {err && <p className="err">{err}</p>}
        <button className="primary" disabled={busy || !pw}>
          {busy ? <span className="spin" /> : "Entrar"}
        </button>
      </form>
    </div>
  );
}

function Music({ onLogout }) {
  const [q, setQ] = useState("");
  const [view, setView] = useState({ type: "home" });
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [hist, setHist] = useState({ searches: [], recent: [], top: [] });
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(-1);
  const [st, setSt] = useState({ playing: false, time: 0, dur: 0, buffering: false });
  const [vol, setVol] = useState(1);
  const [menu, setMenu] = useState(null);
  const [newPl, setNewPl] = useState(null);
  const [toast, setToast] = useState("");
  const [blocked, setBlocked] = useState([]);
  const [full, setFull] = useState(false);
  const [source, setSource] = useState("");
  const fullT = useRef();
  const [autoplay, setAutoplay] = useState(() => store.get("autoplay", true));
  const audio = useRef();
  const toastT = useRef();
  const current = queue[idx];
  // El m4a de YouTube a veces trae mal la duración en la cabecera (sale el doble),
  // así que manda la que da yt-dlp y la del <audio> queda solo de respaldo
  const dur = current?.duration || (isFinite(st.dur) ? st.dur : 0);
  const onTime = (e) => {
    const t = e.target.currentTime;
    upd({ time: t });
    if (current?.duration && t > current.duration + 1) return next(); // por si no llega "ended"
    if (dur && "mediaSession" in navigator)
      try {
        navigator.mediaSession.setPositionState({ duration: dur, position: Math.min(t, dur), playbackRate: 1 });
      } catch {}
  };
  const onWaiting = () => {
    // se quedó esperando datos justo al final: la canción ya terminó
    if (current?.duration && audio.current.currentTime >= current.duration - 1.5) return next();
    upd({ buffering: true });
  };
  const upd = (o) => setSt((s) => ({ ...s, ...o }));

  const flash = (m) => {
    setToast(m);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(""), 2400);
  };
  const loadPlaylists = () => api("/playlists").then(setPlaylists);
  const loadHist = () => api("/history").then(setHist);
  const loadBlocked = () => api("/blocked").then(setBlocked);

  useEffect(() => {
    loadPlaylists();
    loadHist();
    loadBlocked();
    const close = () => setMenu(null);
    const pop = () => setFull(false);
    addEventListener("click", close);
    addEventListener("popstate", pop);
    return () => {
      removeEventListener("click", close);
      removeEventListener("popstate", pop);
    };
  }, []);

  // Con la pantalla apagada el navegador congela la página si deja de sonar, así que el cambio de
  // canción se hace en el mismo evento (sin esperar a React) y la siguiente se prepara de antemano
  const qRef = useRef();
  qRef.current = { queue, idx };
  const load = (t) => {
    const a = audio.current;
    if (a.dataset.vid === t.videoId && !a.ended) return;
    a.dataset.vid = t.videoId;
    a.src = `/api/stream/${t.videoId}`;
    a.play().catch(() => {});
    upd({ time: 0, dur: 0, buffering: true });
  };
  const jump = (i) => {
    const t = qRef.current.queue[i];
    if (!t) return;
    load(t);
    setIdx(i);
  };
  const next = () => jump(qRef.current.idx + 1);
  const prev = () => {
    if (audio.current.currentTime > 3) audio.current.currentTime = 0;
    else jump(qRef.current.idx - 1);
  };
  const upcoming = queue[idx + 1]?.videoId;
  useEffect(() => {
    if (upcoming) api(`/prepare/${upcoming}`).catch(() => {});
  }, [upcoming]);
  const toggle = () => current && (audio.current.paused ? audio.current.play() : audio.current.pause());
  const playFrom = (items, i) => {
    if (current?.videoId === items[i].videoId) return toggle();
    setQueue(items);
    setIdx(i);
    setSource(sourceLabel());
  };

  useEffect(() => {
    if (!current) return;
    load(current);
    document.title = `${current.title} · BravoSound`;
    api("/history", { method: "POST", body: pick(current) }).then(loadHist).catch(() => {});
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: current.title,
        artist: current.channel,
        artwork: [{ src: thumb(current.videoId, true), sizes: "480x360" }],
      });
      navigator.mediaSession.setActionHandler("nexttrack", next);
      navigator.mediaSession.setActionHandler("previoustrack", prev);
    }
  }, [current]);

  // Autoplay: al llegar a la última canción de la cola, se le agrega su Mix (sin repetir)
  useEffect(() => {
    if (!autoplay || !current || idx < queue.length - 1) return;
    let stale = false;
    api(`/radio/${current.videoId}`)
      .then((items) => {
        if (stale) return;
        setQueue((qu) => {
          const seen = new Set(qu.map((t) => t.videoId));
          return [...qu, ...items.filter((t) => !seen.has(t.videoId))];
        });
      })
      .catch(() => {});
    return () => (stale = true);
  }, [current, autoplay]);

  // Como Spotify: lo agregado a la cola suena después de la actual (y de lo ya encolado)
  const addToQueue = (t) => {
    setMenu(null);
    const item = { ...pick(t), queued: true };
    if (!current) {
      setQueue([item]);
      setIdx(0);
      return;
    }
    setQueue((qu) => {
      let at = idx + 1;
      while (qu[at]?.queued) at++;
      return [...qu.slice(0, at), item, ...qu.slice(at)];
    });
    flash("Agregada a la cola");
  };
  const removeFromQueue = (k) => setQueue((qu) => qu.filter((_, j) => j !== k));
  const block = async (t) => {
    setMenu(null);
    await api("/blocked", { method: "POST", body: pick(t) });
    const rest = queue.filter((x, k) => k <= idx || x.videoId !== t.videoId);
    setQueue(rest);
    if (current?.videoId === t.videoId) idx + 1 < rest.length ? setIdx(idx + 1) : audio.current.pause();
    loadBlocked();
    flash("Listo, no volverá a sonar en la radio");
  };
  const unblock = async (b) => {
    await api(`/blocked/${b.videoId}`, { method: "DELETE" });
    loadBlocked();
    flash(`“${b.title}” puede volver a sonar`);
  };

  const openFull = () => {
    if (!current) return;
    history.pushState({ full: true }, "");
    setFull(true);
  };
  const closeFull = () => (history.state?.full ? history.back() : setFull(false));
  const artTouch = {
    onTouchStart: (e) => (fullT.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }),
    onTouchEnd: (e) => {
      const s = fullT.current;
      if (!s) return;
      const dx = e.changedTouches[0].clientX - s.x;
      const dy = e.changedTouches[0].clientY - s.y;
      if (dy > 100 && dy > Math.abs(dx)) closeFull();
      else if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy)) dx < 0 ? next() : prev();
    },
  };
  const sourceLabel = () =>
    view.type === "playlist" ? view.pl.name : view.type === "search" ? `“${view.q}”` : view.type === "queue" ? "Tu cola" : "Inicio";

  const toggleAutoplay = () => {
    store.set("autoplay", !autoplay);
    setAutoplay(!autoplay);
    flash(autoplay ? "Autoplay apagado" : "Autoplay encendido");
  };
  const startRadio = async (t) => {
    setMenu(null);
    flash("Armando la radio…");
    try {
      const items = await api(`/radio/${t.videoId}`);
      // si ya suena, se mantiene el mismo objeto para no reiniciarla
      const first = current?.videoId === t.videoId ? current : pick(t);
      setQueue([first, ...items.filter((x) => x.videoId !== t.videoId)]);
      setIdx(0);
      setSource(`Radio de ${t.title}`);
    } catch {
      flash("No se pudo armar la radio");
    }
  };

  // Espacio = play/pausa
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && full) closeFull();
      if (e.code === "Space" && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) {
        e.preventDefault();
        toggle();
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  const search = async (term = q) => {
    term = term.trim();
    if (!term) return;
    setQ(term);
    setView({ type: "search", q: term });
    setList([]);
    setLoading(true);
    try {
      setList(await api(`/search?q=${encodeURIComponent(term)}`));
      loadHist();
    } catch {
      flash("No se pudo buscar, intenta otra vez");
    } finally {
      setLoading(false);
    }
  };
  const openPlaylist = async (pl) => {
    setView({ type: "playlist", pl });
    setList([]);
    setLoading(true);
    try {
      setList((await api(`/playlists/${pl.id}`)).tracks);
    } finally {
      setLoading(false);
    }
  };
  const createPlaylist = async (e) => {
    e.preventDefault();
    const name = newPl.trim();
    setNewPl(null);
    if (!name) return;
    const pl = await api("/playlists", { method: "POST", body: { name } });
    await loadPlaylists();
    flash(`Playlist “${pl.name}” creada`);
  };
  const deletePlaylist = async () => {
    if (!confirm(`¿Borrar “${view.pl.name}”?`)) return;
    await api(`/playlists/${view.pl.id}`, { method: "DELETE" });
    setView({ type: "home" });
    loadPlaylists();
  };
  const addTo = async (t, pl) => {
    setMenu(null);
    await api(`/playlists/${pl.id}/tracks`, { method: "POST", body: pick(t) });
    flash(`Añadida a ${pl.name}`);
  };
  const removeTrack = async (t) => {
    await api(`/tracks/${t.id}`, { method: "DELETE" });
    setList((ts) => ts.filter((x) => x !== t));
  };
  const clearHistory = async () => {
    if (!confirm("¿Borrar búsquedas y escuchas recientes?")) return;
    await api("/history", { method: "DELETE" });
    loadHist();
  };

  // Celular: deslizar → agrega a la cola; ← quita (solo en la cola)
  const swipe = (onRight, onLeft) => ({
    onTouchStart: (e) => {
      const el = e.currentTarget;
      el._sw = { x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0, dir: null };
      el.style.transition = "none";
    },
    onTouchMove: (e) => {
      const el = e.currentTarget;
      const s = el._sw;
      if (!s) return;
      const mx = e.touches[0].clientX - s.x;
      const my = e.touches[0].clientY - s.y;
      if (!s.dir && Math.hypot(mx, my) > 8) s.dir = Math.abs(mx) > Math.abs(my) ? "h" : "v";
      if (s.dir !== "h") return;
      s.dx = Math.max(onLeft ? -120 : 0, Math.min(onRight ? 120 : 0, mx));
      el.style.transform = `translateX(${s.dx}px)`;
      el.parentNode.dataset.sw = (s.dx > 0 ? "r" : s.dx < 0 ? "l" : "") + (Math.abs(s.dx) > 70 ? " go" : "");
    },
    onTouchEnd: (e) => {
      const el = e.currentTarget;
      const dx = el._sw?.dx || 0;
      el._sw = null;
      el.style.transition = "";
      el.style.transform = "";
      el.parentNode.dataset.sw = "";
      if (dx > 70) onRight();
      else if (dx < -70) onLeft();
    },
  });

  const trackMenu = (t, { remove, inPlaylist, up } = {}) => (
    <div className={up ? "menu up" : "menu"}>
        <button onClick={() => addToQueue(t)}>
          <Icon d={I.queue} size={16} /> Agregar a la cola
        </button>
        <button onClick={() => startRadio(t)}>
          <Icon d={I.radio} size={16} /> Iniciar radio
        </button>
        {remove && (
          <button onClick={() => (setMenu(null), remove())}>
            <Icon d={I.x} size={16} /> Quitar de la cola
          </button>
        )}
        {inPlaylist && (
          <button onClick={() => (setMenu(null), removeTrack(t))}>
            <Icon d={I.x} size={16} /> Quitar de esta playlist
          </button>
        )}
        <button className="danger" onClick={() => block(t)}>
          <Icon d={I.ban} size={16} /> No volver a poner
        </button>
        <p>Añadir a playlist</p>
        {playlists.length ? (
          playlists.map((pl) => (
            <button key={pl.id} onClick={() => addTo(t, pl)}>
              {pl.name}
            </button>
          ))
        ) : (
          <span>Primero crea una playlist</span>
        )}
      </div>
  );

  const rows = (items, { inPlaylist, counts, onPlay, onRemove, start = 0 } = {}) => (
    <ol className="rows">
      {items.map((t, i) => {
        const on = current?.videoId === t.videoId;
        const key = `${t.id ?? t.videoId}-${start + i}`;
        const remove = onRemove && (() => onRemove(i));
        const open = menu?.key === key;
        return (
          <li key={key} className="sw">
            <div
              className={`row${on ? " on" : ""}${open ? " open" : ""}`}
              onClick={() => (onPlay ? onPlay(i) : playFrom(items, i))}
              {...swipe(() => addToQueue(t), remove)}
            >
              <span className="n">
                {on && st.playing ? <Eq /> : <b>{start + i + 1}</b>}
                <Icon d={on && st.playing ? I.pause : I.play} size={16} />
              </span>
              <img src={thumb(t.videoId)} alt="" loading="lazy" />
              <div className="meta">
                <div className="t">
                  {t.queued && <em className="tag">en cola</em>}
                  {t.title}
                </div>
                <div className="c">{t.channel}</div>
              </div>
              {counts && <span className="plays">{t.count} {t.count === 1 ? "vez" : "veces"}</span>}
              <span className="d">{fmt(t.duration)}</span>
              <div className="act" onClick={(e) => e.stopPropagation()}>
                <button
                  className="ghost"
                  title="Opciones"
                  onClick={(e) => {
                    const up = e.currentTarget.getBoundingClientRect().bottom > innerHeight * 0.55;
                    setMenu(open ? null : { key, up });
                  }}
                >
                  <Icon d={I.more} size={18} />
                </button>
                {open && trackMenu(t, { remove, inPlaylist, up: menu.up })}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );

  const bar = (
    <div className="bar">
      <span>{fmt(st.time)}</span>
      <input
        type="range"
        min={0}
        max={dur || 1}
        step="0.1"
        value={st.time}
        disabled={!current}
        style={{ "--p": `${dur ? (st.time / dur) * 100 : 0}%` }}
        onChange={(e) => (audio.current.currentTime = +e.target.value)}
      />
      <span>{fmt(dur)}</span>
    </div>
  );

  const skeleton = (
    <ol className="rows">
      {Array.from({ length: 8 }, (_, i) => (
        <li key={i} className="row skel">
          <span className="n" />
          <span className="img" />
          <div className="meta">
            <span />
            <span />
          </div>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="app">
      <aside className="side">
        <Brand />
        <nav>
          <button className={view.type === "home" ? "on" : ""} onClick={() => setView({ type: "home" })}>
            <Icon d={I.home} size={18} /> Inicio
          </button>
        </nav>
        <div className="side-h">
          <span>Tus playlists</span>
          <button className="ghost" title="Nueva playlist" onClick={() => setNewPl("")}>
            <Icon d={I.plus} size={16} />
          </button>
        </div>
        {newPl !== null && (
          <form onSubmit={createPlaylist}>
            <input
              className="pl-input"
              autoFocus
              value={newPl}
              placeholder="Nombre y Enter"
              onChange={(e) => setNewPl(e.target.value)}
              onBlur={() => !newPl.trim() && setNewPl(null)}
            />
          </form>
        )}
        <div className="pls">
          {playlists.map((pl) => (
            <button
              key={pl.id}
              className={view.pl?.id === pl.id ? "on" : ""}
              onClick={() => openPlaylist(pl)}
            >
              {pl.name}
            </button>
          ))}
          {!playlists.length && newPl === null && <p className="hint">Aún no tienes ninguna.</p>}
        </div>
        <button className="logout" onClick={onLogout} title="Cerrar sesión">
          <Icon d={I.out} size={18} /> <span>Salir</span>
        </button>
      </aside>

      <main className="main">
        <form
          className="searchbar"
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
        >
          <Icon d={I.search} size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca una canción, artista o álbum" />
        </form>

        {view.type === "home" && (
          <section>
            <header className="hero">
              <p className="kicker">{greeting()}</p>
              <h1>¿Qué suena hoy?</h1>
            </header>
            {hist.searches.length > 0 && (
              <div className="block">
                <div className="block-h">
                  <h3>Buscaste hace poco</h3>
                  <button className="link" onClick={clearHistory}>
                    Borrar historial
                  </button>
                </div>
                <div className="chips">
                  {hist.searches.map((s) => (
                    <button key={s} className="chip" onClick={() => search(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {hist.recent.length > 0 && (
              <div className="block">
                <h3>Escuchado hace poco</h3>
                <div className="cards">
                  {hist.recent.map((t, i) => (
                    <button
                      key={t.videoId}
                      className={current?.videoId === t.videoId ? "card on" : "card"}
                      onClick={() => playFrom(hist.recent, i)}
                    >
                      <span className="art">
                        <img src={thumb(t.videoId, true)} alt="" loading="lazy" />
                        <span className="fab">
                          <Icon d={current?.videoId === t.videoId && st.playing ? I.pause : I.play} />
                        </span>
                      </span>
                      <span className="t">{t.title}</span>
                      <span className="c">{t.channel}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {hist.top.length > 0 && (
              <div className="block">
                <h3>Lo que más pones</h3>
                {rows(hist.top, { counts: true })}
              </div>
            )}
            {blocked.length > 0 && (
              <div className="block">
                <h3>No vuelven a sonar</h3>
                <div className="chips">
                  {blocked.map((b) => (
                    <button key={b.videoId} className="chip" title="Volver a permitir" onClick={() => unblock(b)}>
                      {b.title} <Icon d={I.x} size={14} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!hist.recent.length && !hist.searches.length && (
              <p className="empty">Busca algo arriba para empezar. Lo que escuches se va guardando aquí.</p>
            )}
          </section>
        )}

        {view.type === "search" && (
          <section>
            <header className="hero small">
              <p className="kicker">Resultados</p>
              <h1>{view.q}</h1>
            </header>
            {loading ? (
              skeleton
            ) : list.length ? (
              rows(list, { onPlay: (i) => playFrom(autoplay ? [list[i]] : list, autoplay ? 0 : i) })
            ) : (
              <p className="empty">Nada por aquí. Prueba con otra búsqueda.</p>
            )}
          </section>
        )}

        {view.type === "queue" && (
          <section>
            <header className="hero small">
              <p className="kicker">{autoplay ? "Cola · autoplay encendido" : "Cola"}</p>
              <h1>A continuación</h1>
            </header>
            {current && (
              <div className="block">
                <h3>Sonando</h3>
                {rows([current], { onPlay: toggle, start: idx })}
              </div>
            )}
            {queue.length > idx + 1 ? (
              <div className="block">
                <h3>Después</h3>
                {rows(queue.slice(idx + 1), {
                  onPlay: (i) => setIdx(idx + 1 + i),
                  onRemove: (i) => removeFromQueue(idx + 1 + i),
                  start: idx + 1,
                })}
              </div>
            ) : (
              <p className="empty">
                {autoplay
                  ? "Cuando suene algo, aquí aparece lo que viene."
                  : "La cola termina aquí. Enciende el autoplay para que siga sonando música parecida."}
              </p>
            )}
          </section>
        )}

        {view.type === "playlist" && (
          <section>
            <header className="hero pl-hero">
              <div className="mosaic">
                {[0, 1, 2, 3].map((i) =>
                  list[i] ? <img key={i} src={thumb(list[i].videoId)} alt="" /> : <span key={i} />
                )}
              </div>
              <div>
                <p className="kicker">Playlist · {list.length} canciones</p>
                <h1>{view.pl.name}</h1>
                <div className="hero-act">
                  <button className="primary" disabled={!list.length} onClick={() => playFrom(list, 0)}>
                    <Icon d={I.play} size={18} /> Reproducir
                  </button>
                  <button className="link" onClick={deletePlaylist}>
                    Borrar playlist
                  </button>
                </div>
              </div>
            </header>
            {loading ? (
              skeleton
            ) : list.length ? (
              rows(list, { inPlaylist: true })
            ) : (
              <p className="empty">Vacía. Busca canciones y añádelas con el +.</p>
            )}
          </section>
        )}
      </main>

      <footer className="player">
        <div className="np" onClick={openFull} title={current ? "Ver reproducción" : undefined}>
          {current ? (
            <>
              <img src={thumb(current.videoId)} alt="" />
              <div className="meta">
                <div className="t">{current.title}</div>
                <div className="c">{current.channel}</div>
              </div>
            </>
          ) : (
            <span className="c">Nada sonando</span>
          )}
        </div>
        <div className="ctl">
          <div className="btns">
            <button className="ghost" onClick={prev} disabled={!current} title="Anterior">
              <Icon d={I.prev} />
            </button>
            <button className="pp" onClick={toggle} disabled={!current} title="Play/Pausa (espacio)">
              {st.buffering ? <span className="spin" /> : <Icon d={st.playing ? I.pause : I.play} size={22} />}
            </button>
            <button className="ghost" onClick={next} disabled={!current} title="Siguiente">
              <Icon d={I.next} />
            </button>
          </div>
          {bar}
        </div>
        <div className="vol">
          <button
            className={autoplay ? "ghost lit" : "ghost"}
            title={autoplay ? "Autoplay encendido" : "Autoplay apagado"}
            onClick={toggleAutoplay}
          >
            <Icon d={I.radio} size={18} />
          </button>
          <button
            className={view.type === "queue" ? "ghost lit" : "ghost"}
            title="Cola"
            onClick={() => setView(view.type === "queue" ? { type: "home" } : { type: "queue" })}
          >
            <Icon d={I.queue} size={18} />
          </button>
          <Icon d={I.vol} size={18} />
          <input
            type="range"
            min={0}
            max={1}
            step="0.01"
            value={vol}
            style={{ "--p": `${vol * 100}%` }}
            onChange={(e) => {
              setVol(+e.target.value);
              audio.current.volume = +e.target.value;
            }}
          />
        </div>
        <audio
          ref={audio}
          onTimeUpdate={onTime}
          onDurationChange={(e) => upd({ dur: e.target.duration })}
          onPlay={() => upd({ playing: true })}
          onPause={() => upd({ playing: false })}
          onWaiting={onWaiting}
          onPlaying={() => upd({ buffering: false })}
          onEnded={next}
          onError={() => current && (upd({ buffering: false }), flash("No se pudo reproducir esta canción"))}
        />
      </footer>

      {full && current && (
        <div className="full">
          <div className="full-bg" style={{ backgroundImage: `url(${thumb(current.videoId, true)})` }} />
          <header className="full-h">
            <button className="ghost" onClick={closeFull} title="Cerrar">
              <Icon d={I.down} size={28} />
            </button>
            <div>
              <p className="kicker">Sonando desde</p>
              <b>{source || "BravoSound"}</b>
            </div>
            <div className="full-more" onClick={(e) => e.stopPropagation()}>
              <button
                className="ghost"
                title="Opciones"
                onClick={() => setMenu(menu?.key === "full" ? null : { key: "full" })}
              >
                <Icon d={I.more} size={24} />
              </button>
              {menu?.key === "full" && trackMenu(current)}
            </div>
          </header>
          <div className="full-art" {...artTouch}>
            <img
              key={current.videoId}
              src={`https://i.ytimg.com/vi/${current.videoId}/maxresdefault.jpg`}
              onError={(e) => (e.currentTarget.src = thumb(current.videoId, true))}
              alt=""
            />
          </div>
          <div className="full-meta">
            <div className="t">{current.title}</div>
            <div className="c">{current.channel}</div>
          </div>
          {bar}
          <div className="full-ctl">
            <button className={autoplay ? "ghost lit" : "ghost"} onClick={toggleAutoplay} title="Autoplay">
              <Icon d={I.radio} size={22} />
            </button>
            <button className="ghost big" onClick={prev} title="Anterior">
              <Icon d={I.prev} size={32} />
            </button>
            <button className="pp big" onClick={toggle} title="Play/Pausa">
              {st.buffering ? <span className="spin" /> : <Icon d={st.playing ? I.pause : I.play} size={32} />}
            </button>
            <button className="ghost big" onClick={next} title="Siguiente">
              <Icon d={I.next} size={32} />
            </button>
            <button
              className="ghost"
              title="Cola"
              onClick={() => {
                closeFull();
                setView({ type: "queue" });
              }}
            >
              <Icon d={I.queue} size={22} />
            </button>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
