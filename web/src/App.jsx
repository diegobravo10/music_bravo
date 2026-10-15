import { useEffect, useRef, useState } from "react";

const api = (path, opts = {}) =>
  fetch(`/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json" },
    body: opts.body && JSON.stringify(opts.body),
  }).then((r) => (!r.ok ? Promise.reject(r) : r.status === 204 ? null : r.json()));
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
};
const Icon = ({ d, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d={d} />
  </svg>
);
const Eq = () => (
  <span className="eq">
    <i />
    <i />
    <i />
  </span>
);

export default function App() {
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
  const audio = useRef();
  const toastT = useRef();
  const current = queue[idx];
  const dur = isFinite(st.dur) && st.dur ? st.dur : current?.duration || 0;
  const upd = (o) => setSt((s) => ({ ...s, ...o }));

  const flash = (m) => {
    setToast(m);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(""), 2400);
  };
  const loadPlaylists = () => api("/playlists").then(setPlaylists);
  const loadHist = () => api("/history").then(setHist);

  useEffect(() => {
    loadPlaylists();
    loadHist();
    const close = () => setMenu(null);
    addEventListener("click", close);
    return () => removeEventListener("click", close);
  }, []);

  const next = () => setIdx((i) => (i + 1 < queue.length ? i + 1 : i));
  const prev = () => {
    if (audio.current.currentTime > 3) audio.current.currentTime = 0;
    else setIdx((i) => Math.max(0, i - 1));
  };
  const toggle = () => current && (audio.current.paused ? audio.current.play() : audio.current.pause());
  const playFrom = (items, i) => {
    if (current?.videoId === items[i].videoId) return toggle();
    setQueue(items);
    setIdx(i);
  };

  useEffect(() => {
    if (!current) return;
    const a = audio.current;
    upd({ time: 0, dur: 0, buffering: true });
    a.src = `/api/stream/${current.videoId}`;
    a.play().catch(() => {});
    document.title = `${current.title} · música`;
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

  // Espacio = play/pausa
  useEffect(() => {
    const onKey = (e) => {
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

  const rows = (items, { inPlaylist, counts } = {}) => (
    <ol className="rows">
      {items.map((t, i) => {
        const on = current?.videoId === t.videoId;
        const key = `${t.id ?? t.videoId}-${i}`;
        return (
          <li key={key} className={on ? "row on" : "row"} onClick={() => playFrom(items, i)}>
            <span className="n">
              {on && st.playing ? <Eq /> : <b>{i + 1}</b>}
              <Icon d={on && st.playing ? I.pause : I.play} size={16} />
            </span>
            <img src={thumb(t.videoId)} alt="" loading="lazy" />
            <div className="meta">
              <div className="t">{t.title}</div>
              <div className="c">{t.channel}</div>
            </div>
            {counts && <span className="plays">{t.count} {t.count === 1 ? "vez" : "veces"}</span>}
            <span className="d">{fmt(t.duration)}</span>
            <div className="act" onClick={(e) => e.stopPropagation()}>
              {inPlaylist ? (
                <button className="ghost" title="Quitar de la playlist" onClick={() => removeTrack(t)}>
                  <Icon d={I.x} size={18} />
                </button>
              ) : (
                <>
                  <button className="ghost" title="Añadir a playlist" onClick={() => setMenu(menu === key ? null : key)}>
                    <Icon d={I.plus} size={18} />
                  </button>
                  {menu === key && (
                    <div className="menu">
                      <p>Añadir a…</p>
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
                  )}
                </>
              )}
            </div>
          </li>
        );
      })}
    </ol>
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
        <div className="brand">
          música<span>.</span>
        </div>
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
            {loading ? skeleton : list.length ? rows(list) : <p className="empty">Nada por aquí. Prueba con otra búsqueda.</p>}
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
        <div className="np">
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
        </div>
        <div className="vol">
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
          onTimeUpdate={(e) => upd({ time: e.target.currentTime })}
          onDurationChange={(e) => upd({ dur: e.target.duration })}
          onPlay={() => upd({ playing: true })}
          onPause={() => upd({ playing: false })}
          onWaiting={() => upd({ buffering: true })}
          onPlaying={() => upd({ buffering: false })}
          onEnded={next}
          onError={() => current && (upd({ buffering: false }), flash("No se pudo reproducir esta canción"))}
        />
      </footer>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
