import React, { useEffect, useMemo, useState } from "react";

const SUPABASE_URL = "https://vcygeyybgzugwepbmoqf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_9W2d45IUtRQkGgmeBajhow_Oi4BabYt";
const STORAGE_BUCKET = "plant-images";

const categories = [
  "Alle",
  "Favoritter",
  "🐝 Bievennlige",
  "Blomster",
  "Stauder",
  "Sommerblomster",
  "Busker",
  "Trær",
  "Grønnsaker",
  "Urter",
  "Bær",
  "Inneplanter",
  "Annet",
];

const formCategories = categories.filter(
  (category) => !["Alle", "Favoritter", "🐝 Bievennlige"].includes(category)
);

const emptyPlant = {
  id: "",
  name: "",
  category: "Blomster",
  images: [],
  image_url: "",
  care: "",
  comment: "",
  favorite: false,
  location: "",
  sow_date: "",
  harvest_date: "",
  yield_notes: "",
  updated_at: "",
  ai_tips: "",
};

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `plant-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    ...extra,
  };
}

async function api(path, options = {}) {
  const response = await fetch(SUPABASE_URL + path, options);
  if (!response.ok) throw new Error((await response.text()) || `Supabase-feil: ${response.status}`);
  return response.status === 204 ? null : response.json();
}

async function uploadImage(file) {
  const extension = file.name.split(".").pop() || "jpg";
  const filePath = `${makeId()}.${extension}`;

  await api(`/storage/v1/object/${STORAGE_BUCKET}/${filePath}`, {
    method: "POST",
    headers: supabaseHeaders({
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "true",
    }),
    body: file,
  });

  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${filePath}`;
}

function normalizeImages(plant) {
  if (Array.isArray(plant.images) && plant.images.length) return plant.images.filter(Boolean);
  if (plant.image_url) return [plant.image_url];
  return [];
}

function formatDate(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("no-NO");
}

function isBeeFriendly(plant) {
  const category = String(plant.category || "").toLowerCase();
  const care = String(plant.care || "").toLowerCase();
  const comment = String(plant.comment || "").toLowerCase();
  return category.includes("blomster") || care.includes("bievennlig") || comment.includes("bievennlig");
}

function removeOldAiTips(careText) {
  const text = String(careText || "");
  const marker = "AI-stelltips:";
  const index = text.indexOf(marker);
  return index === -1 ? text.trim() : text.slice(0, index).trim();
}

function mergeAiTipsIntoCare(existingCare, tips) {
  const newline = String.fromCharCode(10);
  const cleanCare = removeOldAiTips(existingCare);
  const aiBlock = ["AI-stelltips:", tips].join(newline);
  return cleanCare ? [cleanCare, aiBlock].join(newline + newline) : aiBlock;
}

function runSelfTests() {
  const testCare = ["Vann lite", "", "AI-stelltips:", "Test"].join(String.fromCharCode(10));
  console.assert(normalizeImages({ images: ["a", ""], image_url: "b" }).length === 1, "normalizeImages filtrerer tomme bilder");
  console.assert(isBeeFriendly({ category: "Blomster" }) === true, "Blomster skal være bievennlig");
  console.assert(removeOldAiTips(testCare) === "Vann lite", "Gamle AI-tips skal fjernes");
  console.assert(mergeAiTipsIntoCare("Vann lite", "Ny tips").includes("AI-stelltips:"), "AI-tips skal legges inn i Stell");
}

if (typeof window !== "undefined") runSelfTests();

function Gallery({ images = [], plantName = "", onOpen }) {
  const [index, setIndex] = useState(0);
  const safeImages = images.filter(Boolean);
  const count = safeImages.length;

  function previous(event) {
    event.stopPropagation();
    setIndex((current) => (current - 1 + count) % count);
  }

  function next(event) {
    event.stopPropagation();
    setIndex((current) => (current + 1) % count);
  }

  if (!count) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-emerald-50 text-5xl text-emerald-300">
        ☘
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-2xl bg-emerald-50">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(index);
          }}
          className="block w-full p-0 text-left"
        >
          <img src={safeImages[index]} alt={plantName} className="aspect-[4/3] w-full object-cover" />
        </button>

        {count > 1 && (
          <>
            <button type="button" onClick={previous} className="absolute left-2 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-black/45 text-xl text-white shadow">‹</button>
            <button type="button" onClick={next} className="absolute right-2 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-black/45 text-xl text-white shadow">›</button>
            <div className="absolute bottom-2 right-2 rounded-full bg-black/55 px-3 py-1 text-xs font-bold text-white">{index + 1}/{count}</div>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {safeImages.map((image, imageIndex) => (
            <button
              type="button"
              key={`${image}-${imageIndex}`}
              onClick={(event) => {
                event.stopPropagation();
                setIndex(imageIndex);
              }}
              className={`shrink-0 rounded-xl border-2 p-0 ${imageIndex === index ? "border-emerald-700" : "border-transparent"}`}
            >
              <img src={image} alt="" className="h-14 w-20 rounded-lg object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GardenDecor() {
  return (
    <>
      <style>{`
        @keyframes beeFlightA { 0% { transform: translate(-12vw, 8vh) rotate(8deg); } 50% { transform: translate(55vw, 2vh) rotate(-8deg); } 100% { transform: translate(112vw, 10vh) rotate(6deg); } }
        @keyframes beeFlightB { 0% { transform: translate(110vw, 28vh) scaleX(-1); } 50% { transform: translate(42vw, 20vh) scaleX(-1) rotate(10deg); } 100% { transform: translate(-15vw, 30vh) scaleX(-1); } }
        @keyframes butterflyFloat { 0%, 100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-10px) rotate(6deg); } }
        @keyframes leafDrift { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; } 15% { opacity: .7; } 100% { transform: translateY(110vh) rotate(240deg); opacity: 0; } }
        .bee-a { animation: beeFlightA 18s linear infinite; }
        .bee-b { animation: beeFlightB 24s linear infinite; animation-delay: 4s; }
        .butterfly-float { animation: butterflyFloat 4s ease-in-out infinite; }
        .leaf-drift { animation: leafDrift 16s linear infinite; }
      `}</style>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="bee-a absolute text-2xl">🐝</div>
        <div className="bee-b absolute text-xl">🐝</div>
        <div className="butterfly-float absolute right-[8%] top-[18%] text-2xl opacity-70">🦋</div>
        <div className="leaf-drift absolute left-[18%] text-xl">🍃</div>
      </div>
    </>
  );
}

function getSeasonMood() {
  const month = new Date().getMonth() + 1;
  if ([3, 4, 5].includes(month)) return { label: "Vår i hagen", icon: "🌱", text: "Tid for forkultivering og ny vekst." };
  if ([6, 7, 8].includes(month)) return { label: "Sommerhage", icon: "🌸", text: "Følg med på blomstring og pollinatorer." };
  if ([9, 10, 11].includes(month)) return { label: "Høsthage", icon: "🍂", text: "Tid for innhøsting og overvintringsplan." };
  return { label: "Vinterhvile", icon: "❄️", text: "Planlegg neste sesong." };
}

function Lightbox({ images = [], startIndex = 0, plantName = "", onClose }) {
  const [index, setIndex] = useState(startIndex);
  const safeImages = images.filter(Boolean);
  const count = safeImages.length;

  if (!count) return null;

  function previous() {
    setIndex((current) => (current - 1 + count) % count);
  }

  function next() {
    setIndex((current) => (current + 1) % count);
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black/95 p-3 text-white">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-white/70">{plantName}</div>
          <div className="font-bold">Bilde {index + 1} av {count}</div>
        </div>
        <button type="button" onClick={onClose} className="rounded-full bg-white/15 px-4 py-2 text-white">Lukk</button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        <img src={safeImages[index]} alt={plantName} className="max-h-full max-w-full rounded-2xl object-contain" />
        {count > 1 && (
          <>
            <button type="button" onClick={previous} className="absolute left-1 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-white/15 text-3xl text-white">‹</button>
            <button type="button" onClick={next} className="absolute right-1 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-white/15 text-3xl text-white">›</button>
          </>
        )}
      </div>
    </div>
  );
}

function PlantDetailModal({ plant, onClose, onEdit, onDelete, onAiTips, aiLoading }) {
  if (!plant) return null;
  const images = normalizeImages(plant);

  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-black/50 p-0 md:items-center md:justify-center md:p-6">
      <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl md:rounded-[2rem]">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800">🌱 {plant.category}</div>
            <h2 className="text-3xl font-black text-stone-900">{plant.name}</h2>
            {plant.location && <p className="mt-1 text-stone-600">📍 {plant.location}</p>}
          </div>
          <button onClick={onClose} className="rounded-full bg-slate-100 px-4 py-2 font-bold text-slate-900">Lukk</button>
        </div>

        <div className="grid gap-5 md:grid-cols-[1.2fr_.8fr]">
          <div>
            {images.length ? (
              <img src={images[0]} alt={plant.name} className="aspect-[4/3] w-full rounded-3xl object-cover" />
            ) : (
              <div className="flex aspect-[4/3] w-full items-center justify-center rounded-3xl bg-emerald-50 text-6xl text-emerald-300">☘</div>
            )}
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {images.map((image, index) => (
                  <img key={`${image}-${index}`} src={image} alt="" className="h-20 w-24 rounded-2xl object-cover" />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <button onClick={onEdit} className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-800">Rediger</button>
              <button onClick={onDelete} className="rounded-2xl bg-red-600 px-3 py-2 text-sm font-bold text-white">Slett</button>
              <button onClick={onAiTips} className="rounded-2xl bg-blue-600 px-3 py-2 text-sm font-bold text-white" disabled={aiLoading}>{aiLoading ? "Tenker …" : "AI-tips"}</button>
            </div>

            {plant.favorite && <div className="rounded-2xl bg-amber-50 p-3 font-bold text-amber-900">★ Favoritt</div>}
            {isBeeFriendly(plant) && <div className="rounded-2xl bg-yellow-50 p-3 font-bold text-yellow-900">🐝 Bievennlig</div>}

            <section className="rounded-3xl bg-emerald-50 p-4">
              <h3 className="mb-2 font-black text-emerald-900">🌿 Stell</h3>
              <p className="whitespace-pre-wrap text-sm text-stone-700">{plant.care || "Ingen stellnotater ennå."}</p>
            </section>

            {plant.comment && (
              <section className="rounded-3xl bg-amber-50 p-4">
                <h3 className="mb-2 font-black text-amber-900">🪴 Kommentar</h3>
                <p className="whitespace-pre-wrap text-sm text-stone-700">{plant.comment}</p>
              </section>
            )}

            {(plant.sow_date || plant.harvest_date || plant.yield_notes) && (
              <section className="rounded-3xl bg-lime-50 p-4">
                <h3 className="mb-2 font-black text-lime-900">📔 Hagejournal</h3>
                {plant.sow_date && <p className="text-sm text-stone-700">Sådd/plantet: {formatDate(plant.sow_date)}</p>}
                {plant.harvest_date && <p className="text-sm text-stone-700">Høstet: {formatDate(plant.harvest_date)}</p>}
                {plant.yield_notes && <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">{plant.yield_notes}</p>}
              </section>
            )}

            {plant.updated_at && <p className="text-xs text-slate-400">Sist oppdatert: {formatDate(plant.updated_at)}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const seasonMood = getSeasonMood();
  const [plants, setPlants] = useState([]);
  const [form, setForm] = useState(emptyPlant);
  const [files, setFiles] = useState([]);
  const [open, setOpen] = useState(false);
  const [detailPlant, setDetailPlant] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Alle");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("gry_hage_dark_mode") === "true");
  const [aiLoadingId, setAiLoadingId] = useState(null);

  async function load() {
    try {
      setError("");
      const data = await api("/rest/v1/plants?select=*&order=created_at.desc", { headers: supabaseHeaders() });
      setPlants(data || []);
      if (detailPlant?.id) {
        const updated = (data || []).find((plant) => plant.id === detailPlant.id);
        if (updated) setDetailPlant(updated);
      }
    } catch (err) {
      setError(`Kunne ikke hente planter: ${err.message}`);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    localStorage.setItem("gry_hage_dark_mode", String(darkMode));
  }, [darkMode]);

  const filteredPlants = useMemo(() => {
    return plants.filter((plant) => {
      const matchesCategory =
        category === "Alle" ||
        (category === "Favoritter" ? plant.favorite : category === "🐝 Bievennlige" ? isBeeFriendly(plant) : plant.category === category);
      const text = `${plant.name || ""} ${plant.category || ""} ${plant.care || ""} ${plant.comment || ""} ${plant.location || ""}`.toLowerCase();
      return matchesCategory && text.includes(query.toLowerCase());
    });
  }, [plants, category, query]);

  async function save() {
    if (!form.name.trim()) {
      setError("Navn må fylles ut.");
      return;
    }
    setSaving(true);
    setError("");
    setStatus("Lagrer plante …");
    try {
      const uploadedUrls = [];
      for (const file of files) uploadedUrls.push(await uploadImage(file));
      const urls = [...(form.images || []).filter((image) => !String(image).startsWith("blob:")), ...uploadedUrls];
      const payload = { ...form, id: form.id || makeId(), images: urls, image_url: urls[0] || "", updated_at: new Date().toISOString() };

      if (editingId) {
        await api(`/rest/v1/plants?id=eq.${encodeURIComponent(editingId)}`, {
          method: "PATCH",
          headers: supabaseHeaders({ "Content-Type": "application/json", Prefer: "return=representation" }),
          body: JSON.stringify(payload),
        });
      } else {
        await api("/rest/v1/plants", {
          method: "POST",
          headers: supabaseHeaders({ "Content-Type": "application/json", Prefer: "return=representation" }),
          body: JSON.stringify(payload),
        });
      }

      setFiles([]);
      setForm(emptyPlant);
      setEditingId(null);
      setOpen(false);
      setStatus(`Lagret: ${payload.name}`);
      load();
    } catch (err) {
      setError(`Kunne ikke lagre: ${err.message}`);
      setStatus("");
    } finally {
      setSaving(false);
    }
  }

  function handleFiles(event) {
    const selectedFiles = Array.from(event.target.files || []);
    setFiles((prev) => [...prev, ...selectedFiles]);
    const previews = selectedFiles.map((file) => URL.createObjectURL(file));
    setForm((prev) => ({ ...prev, images: [...(prev.images || []), ...previews] }));
  }

  function removeImage(index) {
    setForm((prev) => ({
      ...prev,
      images: (prev.images || []).filter((_, imageIndex) => imageIndex !== index),
    }));
  }

  function openNewPlant() {
    setFiles([]);
    setEditingId(null);
    setForm({ ...emptyPlant, id: makeId() });
    setOpen(true);
  }

  function openEditPlant(plant) {
    setFiles([]);
    setEditingId(plant.id);
    setDetailPlant(null);
    setForm({ ...emptyPlant, ...plant, images: normalizeImages(plant), favorite: Boolean(plant.favorite) });
    setOpen(true);
  }

  async function deletePlant(plant) {
    if (!plant?.id) return;
    if (!window.confirm(`Slette ${plant.name}?`)) return;
    try {
      setError("");
      setStatus("Sletter plante …");
      await api(`/rest/v1/plants?id=eq.${encodeURIComponent(plant.id)}`, { method: "DELETE", headers: supabaseHeaders() });
      setDetailPlant(null);
      setStatus(`Slettet: ${plant.name}`);
      load();
    } catch (err) {
      setError(`Kunne ikke slette: ${err.message}`);
      setStatus("");
    }
  }

  async function getAiTips(plant) {
    setError("");
    setAiLoadingId(plant.id);
    try {
      let tips = plant.ai_tips || "";
      if (!tips) {
        const response = await fetch("/.netlify/functions/plant-tips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plant }),
        });
        if (!response.ok) {
          const errorText = await response.text();
          try {
            const parsed = JSON.parse(errorText);
            throw new Error(parsed.error || errorText);
          } catch {
            throw new Error(errorText);
          }
        }
        const data = await response.json();
        tips = data.tips || "Ingen tips mottatt.";
      }

      const newCare = mergeAiTipsIntoCare(plant.care || "", tips);
      await api(`/rest/v1/plants?id=eq.${encodeURIComponent(plant.id)}`, {
        method: "PATCH",
        headers: supabaseHeaders({ "Content-Type": "application/json", Prefer: "return=representation" }),
        body: JSON.stringify({ care: newCare, ai_tips: tips, updated_at: new Date().toISOString() }),
      });
      setStatus(`AI-tips lagt inn i Stell for ${plant.name}`);
      await load();
    } catch (err) {
      setError(`Kunne ikke hente AI-tips: ${err.message}`);
    } finally {
      setAiLoadingId(null);
    }
  }

  return (
    <div className={`relative min-h-screen overflow-hidden p-4 ${darkMode ? "bg-slate-950 text-slate-100" : "bg-[radial-gradient(circle_at_top_left,#dcfce7,transparent_35%),linear-gradient(to_bottom,#f0fdf4,#fff7ed)] text-stone-900"}`}>
      <GardenDecor />
      <div className="relative z-10 mx-auto max-w-6xl space-y-4">
        <header className={`relative overflow-hidden rounded-[2rem] border p-5 shadow-sm ${darkMode ? "border-slate-800 bg-slate-900" : "border-emerald-100 bg-white/90"}`}>
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-100/70 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-lime-100/70 blur-2xl" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800">🌿 Gry sin hage</div>
              <h1 className="text-4xl font-black tracking-tight">Min blomsterhage</h1>
              <p className="mt-1 max-w-xl text-stone-600">Et levende hagekart for planter, bilder, stell og små hageobservasjoner.</p>
              <div className="mt-3 inline-flex max-w-xl items-center gap-2 rounded-2xl bg-lime-50 px-4 py-2 text-sm font-semibold text-lime-900">
                <span className="text-xl">{seasonMood.icon}</span>
                <span>{seasonMood.label}: {seasonMood.text}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDarkMode((value) => !value)} className="rounded-2xl bg-slate-100 px-5 py-3 font-bold text-slate-800">{darkMode ? "Lys" : "Mørk"}</button>
              <button onClick={openNewPlant} className="rounded-2xl bg-gradient-to-r from-emerald-700 to-lime-700 px-5 py-3 font-bold text-white shadow-sm">+ Plant inn ny</button>
            </div>
          </div>
        </header>

        {status && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">{status}</div>}
        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-red-800">{error}</div>}

        <section className={`rounded-[2rem] border p-4 shadow-sm ${darkMode ? "border-slate-800 bg-slate-900" : "border-emerald-100 bg-white/90"}`}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Søk i hagen: plante, bed, stell …" className="w-full rounded-2xl border border-slate-200 p-3 text-base text-slate-900" />
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((item) => (
              <button key={item} onClick={() => setCategory(item)} className={`rounded-full px-4 py-2 text-sm font-bold transition ${category === item ? "bg-emerald-700 text-white shadow-sm" : "bg-emerald-50 text-emerald-900 hover:bg-emerald-100"}`}>
                {item === "Favoritter" ? "★ Favoritter" : item}
              </button>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPlants.map((plant) => {
            const images = normalizeImages(plant);
            return (
              <article key={plant.id} onClick={() => setDetailPlant(plant)} className={`relative cursor-pointer rounded-[2rem] border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${darkMode ? "border-slate-800 bg-slate-900" : "border-emerald-100 bg-white/95"}`}>
                {isBeeFriendly(plant) && <div className="absolute right-4 top-4 z-10 text-2xl animate-bounce">🐝</div>}
                <Gallery images={images} plantName={plant.name} onOpen={(startIndex) => setLightbox({ images, startIndex, plantName: plant.name })} />

                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-3 gap-2" onClick={(event) => event.stopPropagation()}>
                    <button onClick={() => openEditPlant(plant)} className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-800">Rediger</button>
                    <button onClick={() => deletePlant(plant)} className="rounded-2xl bg-red-600 px-3 py-2 text-sm font-bold text-white">Slett</button>
                    <button onClick={() => getAiTips(plant)} className="rounded-2xl bg-blue-600 px-3 py-2 text-sm font-bold text-white" disabled={aiLoadingId === plant.id}>{aiLoadingId === plant.id ? "Tenker …" : "AI-tips"}</button>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">🌱 {plant.category}</span>
                      <h2 className="mt-2 text-2xl font-black tracking-tight">{plant.name}</h2>
                      {plant.location && <p className="mt-1 text-sm text-slate-500">📍 {plant.location}</p>}
                    </div>
                    {plant.favorite && <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">★</span>}
                  </div>

                  {plant.care && <div><h3 className="text-sm font-bold text-emerald-800">🌿 Stell</h3><p className="line-clamp-4 whitespace-pre-wrap text-sm text-slate-600">{plant.care}</p></div>}
                  {plant.comment && <div><h3 className="text-sm font-bold text-amber-800">🪴 Kommentar</h3><p className="line-clamp-3 whitespace-pre-wrap text-sm text-slate-600">{plant.comment}</p></div>}
                  <p className="text-xs font-semibold text-emerald-700">Klikk kortet for oversikt</p>
                </div>
              </article>
            );
          })}
        </section>
      </div>

      {detailPlant && (
        <PlantDetailModal
          plant={detailPlant}
          onClose={() => setDetailPlant(null)}
          onEdit={() => openEditPlant(detailPlant)}
          onDelete={() => deletePlant(detailPlant)}
          onAiTips={() => getAiTips(detailPlant)}
          aiLoading={aiLoadingId === detailPlant.id}
        />
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 md:items-center md:justify-center md:p-6">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl md:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">{editingId ? "Rediger plante" : "Ny plante"}</h2>
              <button onClick={() => { setOpen(false); setEditingId(null); setForm(emptyPlant); setFiles([]); }} className="rounded-full bg-slate-100 px-3 py-2 font-bold text-slate-900">×</button>
            </div>
            <div className="space-y-4">
              <input placeholder="Navn" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="w-full rounded-2xl border border-slate-200 p-3 text-base text-slate-900" />
              <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="w-full rounded-2xl border border-slate-200 p-3 text-base text-slate-900">{formCategories.map((item) => <option key={item}>{item}</option>)}</select>
              <input placeholder="Plassering i hagen, f.eks. Bed 1, drivhus, veranda" value={form.location || ""} onChange={(event) => setForm({ ...form, location: event.target.value })} className="w-full rounded-2xl border border-slate-200 p-3 text-base text-slate-900" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input type="date" value={form.sow_date || ""} onChange={(event) => setForm({ ...form, sow_date: event.target.value })} className="w-full rounded-2xl border border-slate-200 p-3 text-base text-slate-900" />
                <input type="date" value={form.harvest_date || ""} onChange={(event) => setForm({ ...form, harvest_date: event.target.value })} className="w-full rounded-2xl border border-slate-200 p-3 text-base text-slate-900" />
              </div>
              <textarea placeholder="Avling / hagejournal" value={form.yield_notes || ""} onChange={(event) => setForm({ ...form, yield_notes: event.target.value })} className="w-full rounded-2xl border border-slate-200 p-3 text-base text-slate-900" rows={3} />
              <label className="block text-slate-900"><span className="mb-1 block text-sm font-bold">Ta bilder / velg flere bilder</span><input type="file" multiple accept="image/*" onChange={handleFiles} className="w-full rounded-2xl border border-slate-200 p-3 text-slate-900" /></label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{(form.images || []).map((image, index) => <div key={`${image}-${index}`} className="relative"><img src={image} alt="" className="aspect-square w-full rounded-2xl object-cover" /><button type="button" onClick={() => removeImage(index)} className="absolute right-1 top-1 rounded-full bg-red-600 px-2 py-1 text-xs font-bold text-white">×</button></div>)}</div>
              <textarea placeholder="Stell" value={form.care} onChange={(event) => setForm({ ...form, care: event.target.value })} className="w-full rounded-2xl border border-slate-200 p-3 text-base text-slate-900" rows={4} />
              <textarea placeholder="Kommentar" value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} className="w-full rounded-2xl border border-slate-200 p-3 text-base text-slate-900" rows={3} />
              <label className="flex items-center gap-2 rounded-2xl bg-amber-50 p-3 font-bold text-amber-900"><input type="checkbox" checked={Boolean(form.favorite)} onChange={(event) => setForm({ ...form, favorite: event.target.checked })} className="h-5 w-5" />Merk som favoritt</label>
              <button onClick={save} disabled={saving} className="w-full rounded-2xl bg-emerald-700 px-5 py-4 font-bold text-white disabled:opacity-60">{saving ? "Lagrer …" : editingId ? "Lagre endringer" : "Lagre"}</button>
            </div>
          </div>
        </div>
      )}

      {lightbox && <Lightbox images={lightbox.images} startIndex={lightbox.startIndex} plantName={lightbox.plantName} onClose={() => setLightbox(null)} />}
    </div>
  );
}
