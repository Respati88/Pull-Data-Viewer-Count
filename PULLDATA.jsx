import React, { useEffect, useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Eye, TrendingUp, TrendingDown, RotateCcw, PlusCircle, Minus } from "lucide-react";

const STORAGE_KEY = "undira-viewer-counts-v1";

const MONTH_NAMES_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const CATEGORIES = [
  {
    id: "kampus",
    label: "Seputar Kampus",
    short: "Kampus",
    color: "#1B3A5C",
    subs: [
      { id: "kegiatan", label: "Kegiatan" },
      { id: "kerjasama", label: "Kerja Sama" },
      { id: "pengabdian", label: "Pengabdian kepada Masyarakat" },
    ],
  },
  {
    id: "artikel",
    label: "Artikel",
    short: "Artikel",
    color: "#1F7A6C",
    subs: [],
  },
  {
    id: "penelitian",
    label: "Penelitian dan Inovasi",
    short: "Penelitian",
    color: "#5B4B8A",
    subs: [
      { id: "penelitian", label: "Penelitian" },
      { id: "pkm", label: "Program Kreativitas Mahasiswa" },
    ],
  },
  {
    id: "prestasi",
    label: "Prestasi",
    short: "Prestasi",
    color: "#C68A2E",
    subs: [
      { id: "dosentendik", label: "Dosen dan Tendik" },
      { id: "mahasiswa", label: "Mahasiswa" },
    ],
  },
];

function getLastMonths(n) {
  const now = new Date();
  const arr = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    arr.push({ key, label: `${MONTH_NAMES_ID[d.getMonth()]} ${d.getFullYear()}`, short: MONTH_NAMES_ID[d.getMonth()].slice(0, 3) });
  }
  return arr;
}

function seedCategoryData() {
  const data = {};
  CATEGORIES.forEach((cat) => {
    if (cat.subs.length) {
      data[cat.id] = {};
      cat.subs.forEach((s) => {
        data[cat.id][s.id] = Math.floor(80 + Math.random() * 220);
      });
    } else {
      data[cat.id] = { _all: Math.floor(150 + Math.random() * 320) };
    }
  });
  return data;
}

function fmt(n) {
  return n.toLocaleString("id-ID");
}

export default function ViewerCounterDashboard() {
  const months = useMemo(() => getLastMonths(3), []);
  const [monthly, setMonthly] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCat, setSelectedCat] = useState(CATEGORIES[0].id);
  const [logCat, setLogCat] = useState(CATEGORIES[0].id);
  const [logSub, setLogSub] = useState(CATEGORIES[0].subs[0]?.id || "_all");
  const [note, setNote] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, true);
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          let changed = false;
          months.forEach((m) => {
            if (!parsed[m.key]) {
              parsed[m.key] = seedCategoryData();
              changed = true;
            }
          });
          setMonthly(parsed);
          if (changed) persist(parsed);
        } else {
          const seeded = {};
          months.forEach((m) => (seeded[m.key] = seedCategoryData()));
          setMonthly(seeded);
          await persist(seeded);
        }
      } catch (e) {
        const seeded = {};
        months.forEach((m) => (seeded[m.key] = seedCategoryData()));
        setMonthly(seeded);
        await persist(seeded);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function persist(obj) {
    try {
      const ok = await window.storage.set(STORAGE_KEY, JSON.stringify(obj), true);
      if (!ok) setError("Gagal menyimpan data ke storage.");
    } catch (e) {
      setError("Gagal menyimpan data ke storage.");
    }
  }

  function catMonthTotal(catId, monthKey) {
    const m = monthly?.[monthKey]?.[catId];
    if (!m) return 0;
    return Object.values(m).reduce((a, b) => a + b, 0);
  }

  function catTotalAll(catId) {
    return months.reduce((sum, m) => sum + catMonthTotal(catId, m.key), 0);
  }

  function subTotalAll(catId, subId) {
    return months.reduce((sum, m) => sum + (monthly?.[m.key]?.[catId]?.[subId] || 0), 0);
  }

  function catDelta(catId) {
    if (months.length < 2) return 0;
    const last = catMonthTotal(catId, months[months.length - 1].key);
    const prev = catMonthTotal(catId, months[months.length - 2].key);
    if (prev === 0) return last > 0 ? 100 : 0;
    return Math.round(((last - prev) / prev) * 100);
  }

  function grandTotal() {
    return CATEGORIES.reduce((s, c) => s + catTotalAll(c.id), 0);
  }

  function handleLogView() {
    const currentMonthKey = months[months.length - 1]?.key;
    if (!currentMonthKey) return;
    setMonthly((prev) => {
      const next = JSON.parse(JSON.stringify(prev || {}));
      if (!next[currentMonthKey]) next[currentMonthKey] = {};
      if (!next[currentMonthKey][logCat]) next[currentMonthKey][logCat] = {};
      const subKey = logSub || "_all";
      next[currentMonthKey][logCat][subKey] = (next[currentMonthKey][logCat][subKey] || 0) + 1;
      persist(next);
      return next;
    });
    const cat = CATEGORIES.find((c) => c.id === logCat);
    const subLabel = cat.subs.find((s) => s.id === logSub)?.label;
    setNote(`+1 view dicatat — ${cat.label}${subLabel ? " / " + subLabel : ""}`);
    setTimeout(() => setNote(""), 2500);
  }

  async function handleReset() {
    const seeded = {};
    months.forEach((m) => (seeded[m.key] = seedCategoryData()));
    setMonthly(seeded);
    await persist(seeded);
    setNote("Data demo direset.");
    setTimeout(() => setNote(""), 2000);
  }

  if (loading) {
    return (
      <div className="vc-root vc-loading">
        <style>{CSS}</style>
        <div className="vc-spinner" />
        <p>Memuat data pengunjung…</p>
      </div>
    );
  }

  const barData = months.map((m) => {
    const row = { month: m.short };
    CATEGORIES.forEach((c) => (row[c.id] = catMonthTotal(c.id, m.key)));
    return row;
  });

  const selCat = CATEGORIES.find((c) => c.id === selectedCat);
  const pieData = selCat.subs.length
    ? selCat.subs.map((s) => ({ name: s.label, value: subTotalAll(selCat.id, s.id) }))
    : [{ name: selCat.label, value: catTotalAll(selCat.id) }];

  const total3mo = grandTotal();

  return (
    <div className="vc-root">
      <style>{CSS}</style>

      <div className="vc-header">
        <div className="vc-eyebrow">UNDIRA · VIEWER ANALYTICS</div>
        <h1 className="vc-title">Statistik Pengunjung Website</h1>
        <p className="vc-sub">
          Rekap jumlah viewer per kategori &amp; subkategori — 3 bulan terakhir
          <span className="vc-sub-muted"> ({months[0].label} – {months[months.length - 1].label})</span>
        </p>
      </div>

      <div className="vc-hero">
        <div className="vc-hero-number">
          <Eye size={28} strokeWidth={1.6} />
          <div>
            <div className="vc-hero-value">{fmt(total3mo)}</div>
            <div className="vc-hero-label">total view · 3 bulan terakhir</div>
          </div>
        </div>

        <div className="vc-ribbon">
          {months.map((m) => {
            const monthTotal = CATEGORIES.reduce((s, c) => s + catMonthTotal(c.id, m.key), 0) || 1;
            return (
              <div className="vc-ribbon-row" key={m.key}>
                <div className="vc-ribbon-label">{m.label}</div>
                <div className="vc-ribbon-bar">
                  {CATEGORIES.map((c) => {
                    const v = catMonthTotal(c.id, m.key);
                    const pct = (v / monthTotal) * 100;
                    return (
                      <div
                        key={c.id}
                        className="vc-ribbon-seg"
                        style={{ width: `${pct}%`, background: c.color }}
                        title={`${c.label}: ${fmt(v)}`}
                      />
                    );
                  })}
                </div>
                <div className="vc-ribbon-total">{fmt(monthTotal)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="vc-cards">
        {CATEGORIES.map((c) => {
          const delta = catDelta(c.id);
          return (
            <button
              key={c.id}
              className={`vc-card ${selectedCat === c.id ? "vc-card-active" : ""}`}
              style={{ "--accent": c.color }}
              onClick={() => setSelectedCat(c.id)}
            >
              <div className="vc-card-top">
                <span className="vc-card-dot" />
                <span className="vc-card-label">{c.label}</span>
              </div>
              <div className="vc-card-value">{fmt(catTotalAll(c.id))}</div>
              <div className={`vc-card-delta ${delta >= 0 ? "up" : "down"}`}>
                {delta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {Math.abs(delta)}% vs bulan lalu
              </div>
            </button>
          );
        })}
      </div>

      <div className="vc-grid">
        <div className="vc-panel">
          <h3 className="vc-panel-title">Tren Bulanan per Kategori</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E2DA" vertical={false} />
              <XAxis dataKey="month" tick={{ fontFamily: "IBM Plex Sans", fontSize: 12, fill: "#5B6570" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontFamily: "IBM Plex Mono", fontSize: 11, fill: "#5B6570" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontFamily: "IBM Plex Sans", fontSize: 13, borderRadius: 8, border: "1px solid #E4E2DA" }}
                formatter={(value, name) => [fmt(value), CATEGORIES.find((c) => c.id === name)?.label || name]}
              />
              <Legend
                formatter={(value) => CATEGORIES.find((c) => c.id === value)?.short || value}
                wrapperStyle={{ fontFamily: "IBM Plex Sans", fontSize: 12 }}
              />
              {CATEGORIES.map((c) => (
                <Bar key={c.id} dataKey={c.id} stackId="a" fill={c.color} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="vc-panel">
          <div className="vc-panel-headrow">
            <h3 className="vc-panel-title">Rincian Subkategori</h3>
            <div className="vc-tabs">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  className={`vc-tab ${selectedCat === c.id ? "vc-tab-active" : ""}`}
                  style={{ "--accent": c.color }}
                  onClick={() => setSelectedCat(c.id)}
                >
                  {c.short}
                </button>
              ))}
            </div>
          </div>

          {selCat.subs.length ? (
            <div className="vc-pie-wrap">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={shade(selCat.color, i)} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={{ fontFamily: "IBM Plex Sans", fontSize: 13, borderRadius: 8, border: "1px solid #E4E2DA" }} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="vc-sub-list">
                {selCat.subs.map((s, i) => (
                  <li key={s.id}>
                    <span className="vc-sub-dot" style={{ background: shade(selCat.color, i) }} />
                    <span className="vc-sub-name">{s.label}</span>
                    <span className="vc-sub-count">{fmt(subTotalAll(selCat.id, s.id))}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="vc-no-sub">
              <div className="vc-no-sub-value">{fmt(catTotalAll(selCat.id))}</div>
              <div className="vc-no-sub-label">total view Artikel (3 bulan) — kategori ini tidak memiliki subkategori</div>
            </div>
          )}
        </div>
      </div>

      <div className="vc-panel vc-log">
        <h3 className="vc-panel-title">Simulasikan Kunjungan (mode demo)</h3>
        <p className="vc-log-desc">
          Gunakan panel ini untuk menguji tampilan seolah ada pengunjung baru membuka halaman.
          Data tersimpan otomatis dan dibagikan ke semua orang yang membuka dashboard ini.
        </p>
        <div className="vc-log-controls">
          <select
            className="vc-select"
            value={logCat}
            onChange={(e) => {
              const c = CATEGORIES.find((x) => x.id === e.target.value);
              setLogCat(c.id);
              setLogSub(c.subs[0]?.id || "_all");
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>

          {CATEGORIES.find((c) => c.id === logCat)?.subs.length > 0 && (
            <select className="vc-select" value={logSub} onChange={(e) => setLogSub(e.target.value)}>
              {CATEGORIES.find((c) => c.id === logCat).subs.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          )}

          <button className="vc-btn-primary" onClick={handleLogView}>
            <PlusCircle size={16} /> Tambah 1 View
          </button>
          <button className="vc-btn-ghost" onClick={handleReset}>
            <RotateCcw size={14} /> Reset data demo
          </button>
        </div>
        {note && <div className="vc-note">{note}</div>}
        {error && <div className="vc-error"><Minus size={14} /> {error}</div>}
      </div>

      <p className="vc-footnote">
        Catatan: dashboard ini menyimpan data pada penyimpanan bersama artifact (bukan pada server undira.ac.id).
        Untuk menghubungkan penghitung ini ke traffic asli situs undira.ac.id, dibutuhkan backend + database
        sungguhan (misalnya Node.js/Express dengan PostgreSQL atau SQLite) yang dipanggil setiap halaman dimuat,
        lalu dashboard ini diarahkan mengambil data dari API tersebut.
      </p>
    </div>
  );
}

function shade(hex, i) {
  const amt = i * 26;
  const num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) + amt;
  let g = ((num >> 8) & 0x00ff) + amt;
  let b = (num & 0x0000ff) + amt;
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

.vc-root {
  font-family: 'IBM Plex Sans', sans-serif;
  background: #F4F5F1;
  color: #14212B;
  padding: 28px;
  border-radius: 18px;
  max-width: 980px;
  margin: 0 auto;
  box-sizing: border-box;
}
.vc-loading { display:flex; flex-direction:column; align-items:center; gap:12px; padding:80px 0; color:#5B6570; }
.vc-spinner { width:28px; height:28px; border-radius:50%; border:3px solid #DAD7CC; border-top-color:#1B3A5C; animation: vcspin 0.8s linear infinite; }
@keyframes vcspin { to { transform: rotate(360deg); } }

.vc-eyebrow { font-family:'IBM Plex Mono', monospace; font-size:11px; letter-spacing:0.14em; color:#8A6A2E; font-weight:500; }
.vc-title { font-family:'Fraunces', serif; font-weight:600; font-size:30px; margin:6px 0 4px; letter-spacing:-0.01em; color:#12212E; }
.vc-sub { font-size:14px; color:#4B5560; margin:0 0 22px; }
.vc-sub-muted { color:#8A9099; }

.vc-hero { background:#12212E; border-radius:16px; padding:22px 24px; color:#F4F5F1; margin-bottom:22px; }
.vc-hero-number { display:flex; align-items:center; gap:14px; margin-bottom:18px; color:#F1D9A0; }
.vc-hero-value { font-family:'Fraunces', serif; font-size:34px; font-weight:600; line-height:1; color:#FFFFFF; }
.vc-hero-label { font-size:12px; color:#B9C0C6; margin-top:2px; }

.vc-ribbon { display:flex; flex-direction:column; gap:10px; }
.vc-ribbon-row { display:grid; grid-template-columns: 110px 1fr 60px; align-items:center; gap:12px; }
.vc-ribbon-label { font-size:12px; color:#C9CFD4; }
.vc-ribbon-bar { display:flex; height:14px; border-radius:7px; overflow:hidden; background:#243848; }
.vc-ribbon-seg { transition: width 0.4s ease; }
.vc-ribbon-total { font-family:'IBM Plex Mono', monospace; font-size:12px; text-align:right; color:#E8E4D8; }

.vc-cards { display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; margin-bottom:22px; }
.vc-card {
  text-align:left; background:#FFFFFF; border:1px solid #E4E2DA; border-radius:12px; padding:14px 16px;
  cursor:pointer; transition: box-shadow 0.15s, transform 0.15s; font-family:inherit;
}
.vc-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.06); transform: translateY(-1px); }
.vc-card-active { border-color: var(--accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent); }
.vc-card-top { display:flex; align-items:center; gap:7px; margin-bottom:8px; }
.vc-card-dot { width:9px; height:9px; border-radius:50%; background: var(--accent); }
.vc-card-label { font-size:12.5px; color:#4B5560; font-weight:500; }
.vc-card-value { font-family:'IBM Plex Mono', monospace; font-size:24px; font-weight:500; color:#12212E; }
.vc-card-delta { font-size:11.5px; display:flex; align-items:center; gap:4px; margin-top:6px; }
.vc-card-delta.up { color:#1F7A6C; }
.vc-card-delta.down { color:#B4442E; }

.vc-grid { display:grid; grid-template-columns: 1.3fr 1fr; gap:14px; margin-bottom:18px; }
.vc-panel { background:#FFFFFF; border:1px solid #E4E2DA; border-radius:14px; padding:18px 20px; }
.vc-panel-title { font-family:'Fraunces', serif; font-size:16px; font-weight:600; margin:0 0 12px; color:#12212E; }
.vc-panel-headrow { display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:4px; }
.vc-panel-headrow .vc-panel-title { margin-bottom:0; }

.vc-tabs { display:flex; gap:6px; flex-wrap:wrap; }
.vc-tab {
  font-family:'IBM Plex Sans', sans-serif; font-size:11.5px; padding:5px 10px; border-radius:999px;
  border:1px solid #E4E2DA; background:#FAFAF7; cursor:pointer; color:#5B6570;
}
.vc-tab-active { background: var(--accent); border-color: var(--accent); color:#FFFFFF; }

.vc-pie-wrap { display:flex; align-items:center; gap:10px; }
.vc-sub-list { list-style:none; margin:0; padding:0; flex:1; display:flex; flex-direction:column; gap:8px; }
.vc-sub-list li { display:flex; align-items:center; gap:8px; font-size:12.5px; }
.vc-sub-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; }
.vc-sub-name { flex:1; color:#333B44; }
.vc-sub-count { font-family:'IBM Plex Mono', monospace; color:#12212E; font-weight:500; }

.vc-no-sub { text-align:center; padding:24px 0; }
.vc-no-sub-value { font-family:'Fraunces', serif; font-size:38px; font-weight:600; color:#1F7A6C; }
.vc-no-sub-label { font-size:12px; color:#5B6570; margin-top:6px; }

.vc-log { }
.vc-log-desc { font-size:12.5px; color:#5B6570; margin:0 0 14px; max-width:640px; }
.vc-log-controls { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.vc-select {
  font-family:'IBM Plex Sans', sans-serif; font-size:13px; padding:7px 10px; border-radius:8px;
  border:1px solid #DAD7CC; background:#FAFAF7; color:#12212E;
}
.vc-btn-primary {
  display:flex; align-items:center; gap:6px; background:#12212E; color:#fff; border:none; border-radius:8px;
  padding:8px 14px; font-size:13px; cursor:pointer; font-family:inherit;
}
.vc-btn-primary:hover { background:#1B3A5C; }
.vc-btn-ghost {
  display:flex; align-items:center; gap:6px; background:transparent; color:#5B6570; border:1px solid #DAD7CC;
  border-radius:8px; padding:8px 12px; font-size:13px; cursor:pointer; font-family:inherit;
}
.vc-note { margin-top:10px; font-size:12.5px; color:#1F7A6C; }
.vc-error { margin-top:10px; font-size:12.5px; color:#B4442E; display:flex; align-items:center; gap:4px; }

.vc-footnote { font-size:11.5px; color:#8A9099; line-height:1.5; margin-top:6px; }

@media (max-width: 720px) {
  .vc-cards { grid-template-columns: repeat(2, 1fr); }
  .vc-grid { grid-template-columns: 1fr; }
  .vc-ribbon-row { grid-template-columns: 80px 1fr 46px; }
}
`;
