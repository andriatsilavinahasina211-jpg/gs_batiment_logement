"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { C } from "./shared/constants";
import { dashboardApi, type BienLocalite } from "./dashboard-api";

type Coords = { lat: number; lng: number };
type CacheEntry = Coords | null;
type BienPoint = BienLocalite & Coords;

// Zone du projet : Fianarantsoa
const FIANAR_CENTER: [number, number] = [-21.4536, 47.0857];
const FIANAR_BOUNDS: L.LatLngBoundsExpression = [
  [-21.52, 47.03],
  [-21.39, 47.15],
];
const VIEWBOX = "47.03,-21.39,47.15,-21.52";

const CACHE_KEY = "siglbahm-geocode-fianar-v5";

const VERT = "#16a34a";
const JAUNE = "#eab308";

function isLibre(statut?: string) {
  return (statut || "").toUpperCase() === "LIBRE";
}

function arrowIcon(color: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
      <path d="M14 37 L3 19 A13 13 0 1 1 25 19 Z"
            fill="${color}" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="14" cy="13" r="4.5" fill="#ffffff" fill-opacity="0.9"/>
    </svg>`;

  return L.divIcon({
    html: svg,
    className: "siglbahm-arrow",
    iconSize: [28, 38],
    iconAnchor: [14, 37],
    popupAnchor: [0, -34],
  });
}

const ICON_VERT = arrowIcon(VERT);
const ICON_JAUNE = arrowIcon(JAUNE);

function readCache(): Record<string, CacheEntry> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, CacheEntry>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let lastGeocodeRequest = 0;

async function nominatim(q: string): Promise<Coords | null> {
  const wait = 1100 - (Date.now() - lastGeocodeRequest);
  if (wait > 0) await sleep(wait);

  const url =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=mg" +
    `&viewbox=${VIEWBOX}&bounded=1&q=` +
    encodeURIComponent(q);

  try {
    lastGeocodeRequest = Date.now();
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;

    const data: unknown = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const first = data[0] as { lat?: string; lon?: string };
      const lat = Number(first.lat);
      const lng = Number(first.lon);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  } catch {
    // ignore
  }

  return null;
}

async function geocode(
  localite: string,
  adresse?: string
): Promise<CacheEntry> {
  const queries = adresse
    ? [
        `${adresse}, ${localite}, Fianarantsoa, Madagascar`,
        `${adresse}, Fianarantsoa, Madagascar`,
        `${localite}, Fianarantsoa, Madagascar`,
      ]
    : [`${localite}, Fianarantsoa, Madagascar`];

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    if (!q) continue;
    const coords = await nominatim(q);
    if (coords) return coords;
  }

  return null;
}

function spread(index: number, base: Coords): Coords {
  if (index === 0) return base;

  const angle = index * 2.4;
  const distance = 0.0012 * Math.sqrt(index);

  return {
    lat: base.lat + distance * Math.sin(angle),
    lng: base.lng + distance * Math.cos(angle),
  };
}

type Target = { id: string; lat: number; lng: number; nonce: number };

function FlyToTarget({
  target,
  openPopup,
}: {
  target: Target | null;
  openPopup: (id: string) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;

    map.flyTo([target.lat, target.lng], 17, { duration: 0.8 });

    const timer = setTimeout(() => openPopup(target.id), 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, map]);

  return null;
}

function FitMapToPoints({ points }: { points: BienPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      const point = points[0];
      if (point) map.setView([point.lat, point.lng], 16);
      return;
    }

    const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng]));
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 16 });
  }, [map, points]);

  return null;
}

export default function BiensMap() {
  const [points, setPoints] = useState<BienPoint[]>([]);
  const [notFound, setNotFound] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<Target | null>(null);

  const markerRefs = useRef<Record<string, L.Marker>>({});

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const biens = await dashboardApi.getBiensMap();
        if (!mounted) return;

        const groupes = new Map<string, BienLocalite[]>();
        for (const bien of biens) {
          const localite = (bien.localite || "").trim();
          const adresse = (bien.adresse || "").trim();
          if (!localite && !adresse) continue;

          const key = `${adresse}|${localite}`.toLowerCase();
          groupes.set(key, [...(groupes.get(key) ?? []), bien]);
        }

        const cache = readCache();
        const missing: string[] = [];
        const nouveauxPoints: BienPoint[] = [];
        const keys = Array.from(groupes.keys());

        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          if (key === undefined) continue;

          const groupe = groupes.get(key);
          const premierBien = groupe?.[0];
          if (!groupe || !premierBien) continue;

          const localite = (premierBien.localite || "Fianarantsoa").trim();

          let coords: CacheEntry | undefined = cache[key];

          if (coords === undefined) {
            setProgress(
              `Localisation de ${localite} (${i + 1}/${keys.length})...`
            );
            coords = await geocode(localite, premierBien.adresse);
            cache[key] = coords;
            writeCache(cache);
          }

          if (!mounted) return;

          if (coords) {
            const base = coords;
            const nouveaux = groupe.map((bien, index) => ({
              ...bien,
              ...spread(index, base),
            }));
            nouveauxPoints.push(...nouveaux);
          } else {
            missing.push(
              premierBien.adresse
                ? `${premierBien.nomDuBien} (${premierBien.adresse}, ${localite})`
                : `${premierBien.nomDuBien} (${localite})`
            );
          }
        }

        if (mounted) {
          setPoints(nouveauxPoints);
          setNotFound(missing);
        }
      } catch (err) {
        console.error("Erreur carte :", err);
        if (mounted) {
          setError(
            err instanceof Error
              ? `Impossible de charger la carte des biens : ${err.message}`
              : "Impossible de charger la carte des biens."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setProgress("");
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const resultats = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return points.filter((p) =>
      [p.nomDuBien, p.numeroBien, p.localite, p.adresse]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [points, query]);

  const searching = query.trim() !== "";
  const visibles = searching ? resultats : points;

  const nbVerts = visibles.filter((p) => isLibre(p.statut)).length;
  const nbJaunes = visibles.length - nbVerts;

  function selectBien(p: BienPoint) {
    setTarget({ id: p.numeroBien, lat: p.lat, lng: p.lng, nonce: Date.now() });
  }

  function openPopup(id: string) {
    markerRefs.current[id]?.openPopup();
  }

  return (
    <div>
      <div style={{ position: "relative", marginBottom: 12 }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un bien (nom, n° inventaire, localité, adresse)..."
          style={{
            width: "100%",
            padding: "10px 12px",
            fontSize: 13,
            color: C.text,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        {searching && (
          <div
            style={{
              marginTop: 6,
              maxHeight: 190,
              overflowY: "auto",
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
            }}
          >
            {resultats.length === 0 ? (
              <p style={{ fontSize: 12, color: C.muted, padding: 10, margin: 0 }}>
                Aucun bien trouvé.
              </p>
            ) : (
              resultats.slice(0, 20).map((p) => (
                <button
                  key={p.numeroBien}
                  type="button"
                  onClick={() => selectBien(p)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 12px",
                    background: "transparent",
                    border: "none",
                    borderBottom: `1px solid ${C.border}`,
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 99,
                      flexShrink: 0,
                      background: isLibre(p.statut) ? VERT : JAUNE,
                    }}
                  />
                  <span style={{ flex: 1 }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 700,
                        color: C.text,
                      }}
                    >
                      {p.nomDuBien}
                    </span>
                    <span
                      style={{ display: "block", fontSize: 11, color: C.muted }}
                    >
                      N° {p.numeroBien} · {p.localite || "—"}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 10,
          fontSize: 12,
          color: C.text,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              background: VERT,
              display: "inline-block",
            }}
          />
          Biens libres ({nbVerts})
        </span>

        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              background: JAUNE,
              display: "inline-block",
            }}
          />
          Autres statuts ({nbJaunes})
        </span>
      </div>

      <div
        style={{
          height: 460,
          borderRadius: 10,
          overflow: "hidden",
          border: `1px solid ${C.border}`,
        }}
      >
        <MapContainer
          center={FIANAR_CENTER}
          zoom={14}
          minZoom={12}
          maxBounds={FIANAR_BOUNDS}
          maxBoundsViscosity={1}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitMapToPoints points={visibles} />
          <FlyToTarget target={target} openPopup={openPopup} />

          {visibles.map((p) => (
            <Marker
              key={p.numeroBien}
              position={[p.lat, p.lng]}
              icon={isLibre(p.statut) ? ICON_VERT : ICON_JAUNE}
              ref={(marker) => {
                if (marker) markerRefs.current[p.numeroBien] = marker;
              }}
            >
              <Popup>
                <strong>{p.nomDuBien}</strong>
                <br />
                <span style={{ fontSize: 11 }}>N° {p.numeroBien}</span>
                <br />
                <span style={{ fontSize: 11 }}>
                  Localité : {p.localite || "—"}
                </span>
                {p.adresse && (
                  <>
                    <br />
                    <span style={{ fontSize: 11 }}>Adresse : {p.adresse}</span>
                  </>
                )}
                <br />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: isLibre(p.statut) ? "#15803d" : "#a16207",
                  }}
                >
                  Statut : {p.statut || "—"}
                </span>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {loading && progress && (
        <p style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>{progress}</p>
      )}

      {!loading && !error && points.length === 0 && notFound.length === 0 && (
        <p style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
          Aucun bien avec une localité ou une adresse à afficher.
        </p>
      )}

      {error && (
        <p style={{ fontSize: 12, color: "#b91c1c", marginTop: 8 }}>{error}</p>
      )}

      {notFound.length > 0 && (
        <p style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
          Localisations non trouvées ({notFound.length}) :{" "}
          {notFound.slice(0, 5).join(", ")}
          {notFound.length > 5 ? `, et ${notFound.length - 5} autre(s)` : ""}.
        </p>
      )}

      <style>{`
        .siglbahm-arrow { background: transparent; border: none; }
      `}</style>
    </div>
  );
}