import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import MesterCard from "@/components/MesterCard";
import BestMatchCard from "@/components/BestMatchCard";
import SearchLoadingScreen from "@/components/SearchLoadingScreen";
import {
  searchPros,
  type SearchProsItem,
  fetchQuestionSetsByService,
  normalizeLocation,
  type GeoNormalizeResponse,
  fetchBestMatches,
  type BestMatch,
} from "@/lib/api";

export default function InstantResults() {
  const router = useRouter();
  const { params, service_pk, place_pk, place_type } = router.query as {
    params?: string;
    service_pk?: string;
    place_pk?: string;
    place_type?: "city" | "district" | "postal_code";
  };

  // Support both formats:
  // 1) /instant-results/service_pk=...&place_pk=...
  // 2) /instant-results?service_pk=...&place_pk=...
  let serviceId = service_pk || "";
  let placeId = place_pk || "";
  let placeType = place_type || "";

  if (!serviceId || !placeId) {
    const raw =
      typeof params === "string"
        ? params
        : Array.isArray(params)
          ? params[0]
          : "";
    if (raw) {
      const pairs = raw.split("&");
      for (const pair of pairs) {
        const [k, v] = pair.split("=");
        if (k === "service_pk") serviceId = v || "";
        if (k === "place_pk") placeId = v || "";
        if (k === "place_type") placeType = (v as string) || "";
      }
    }
  }

  console.log("[InstantResults] Parsed serviceId:", serviceId);
  console.log("[InstantResults] Parsed placeId:", placeId);
  console.log("[InstantResults] Router query:", router.query);

  const [hasQuestionSet, setHasQuestionSet] = useState<boolean | null>(null);
  const [pros, setPros] = useState<SearchProsItem[] | null>(null);
  const [loadingPros, setLoadingPros] = useState(false);
  const [errorPros, setErrorPros] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(
    null,
  );
  const [fallbackMsg, setFallbackMsg] = useState<string | null>(null);
  const [bestMatches, setBestMatches] = useState<BestMatch[] | null>(null);
  const [loadingBestMatches, setLoadingBestMatches] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);

  // Show loading screen for at least 2 seconds on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoadingScreen(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let aborted = false;
    if (!serviceId) {
      setHasQuestionSet(null);
      return;
    }
    const check = async () => {
      try {
        const sets = await fetchQuestionSetsByService(serviceId);
        const published = sets.filter(
          (s) => s.status === "published" && s.is_active !== false,
        );
        if (!aborted) {
          const exists = published.length > 0;
          setHasQuestionSet(exists);
        }
      } catch {
        if (!aborted) {
          setHasQuestionSet(false);
        }
      }
    };
    check();
    return () => {
      aborted = true;
    };
  }, [serviceId]);

  // Resolve coordinates from placeId (city/district/postal) using backend normalize API; fallback to Budapest
  useEffect(() => {
    let aborted = false;
    const resolve = async () => {
      try {
        if (placeId) {
          const res: GeoNormalizeResponse = await normalizeLocation(
            placeType
              ? { place_id: placeId, type: placeType as "city" | "district" }
              : { place_id: placeId },
          );
          if (!aborted && res.lat != null && res.lon != null) {
            setCoords({ lat: res.lat, lon: res.lon });
            setFallbackMsg(null);
            return;
          }
        }
      } catch {
        // ignore and fallback
      }
      if (!aborted) {
        setCoords({ lat: 47.4979, lon: 19.0402 });
        const reason = !placeId
          ? "No location provided; using Budapest center as fallback."
          : "Could not normalize the selected location; using Budapest center as fallback.";
        setFallbackMsg(reason);
      }
    };
    resolve();
    return () => {
      aborted = true;
    };
  }, [placeId]);

  // Background fetch pros regardless of question set/modal state
  useEffect(() => {
    if (!serviceId || !coords) return;
    let aborted = false;
    const loadPros = async () => {
      try {
        setLoadingPros(true);
        setErrorPros(null);
        const resp = await searchPros({
          service_id: serviceId,
          lat: coords.lat,
          lon: coords.lon,
          radius_km: 25,
          limit: 20,
        });
        if (!aborted) setPros(resp.items);
      } catch (e: unknown) {
        if (!aborted) setErrorPros((e as Error)?.message || "Failed to load pros");
      } finally {
        if (!aborted) setLoadingPros(false);
      }
    };
    loadPros();
    return () => {
      aborted = true;
    };
  }, [serviceId, coords]);

  // Fetch best matches
  useEffect(() => {
    if (!serviceId) return;
    let aborted = false;
    const loadBestMatches = async () => {
      try {
        setLoadingBestMatches(true);
        const matches = await fetchBestMatches(serviceId, 3);
        if (!aborted) setBestMatches(matches);
      } catch (e: unknown) {
        console.error("Failed to load best matches:", e);
        if (!aborted) setBestMatches(null);
      } finally {
        if (!aborted) setLoadingBestMatches(false);
      }
    };
    loadBestMatches();
    return () => {
      aborted = true;
    };
  }, [serviceId]);

  // Fetch pros after the form is submitted: listen for storage flag set by modal
  useEffect(() => {
    if (!serviceId) return;
    const handler = async () => {
      const key = `mm:submitted:${serviceId}:${placeId || ""}`;
      const val =
        typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      if (val === "1") {
        try {
          setLoadingPros(true);
          setErrorPros(null);
          const lat = 47.4979; // fallback Budapest center; replace with normalized place when wired
          const lon = 19.0402;
          const resp = await searchPros({
            service_id: serviceId,
            lat,
            lon,
            radius_km: 25,
            limit: 20,
          });
          setPros(resp.items);
        } catch (e: unknown) {
          setErrorPros((e as Error)?.message || "Failed to load pros");
        } finally {
          setLoadingPros(false);
          // Keep the submitted flag to avoid reopening the modal on future visits
        }
      }
    };
    handler();
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith("mm:submitted:")) handler();
    };
    if (typeof window !== "undefined")
      window.addEventListener("storage", onStorage);
    return () => {
      if (typeof window !== "undefined")
        window.removeEventListener("storage", onStorage);
    };
  }, [serviceId, placeId]);

  return (
    <>
      {showLoadingScreen && <SearchLoadingScreen />}
      <Head>
        <title>Instant Results</title>
      </Head>
      <main className="min-h-screen py-4 sm:py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {fallbackMsg && (
            <div className="mb-6 max-w-2xl mx-auto rounded-lg border border-amber-300 bg-amber-50 text-amber-900 px-4 py-3">
              <p className="text-sm">{fallbackMsg}</p>
            </div>
          )}

          {/* Best Matches Section */}
          {!loadingBestMatches && bestMatches && bestMatches.length > 0 && (
            <div className="mb-12">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">
                Get pricing from the 3 best matches
              </h2>

              {/* Banner */}
              <div className="bg-yellow-100 border border-yellow-200 rounded-lg px-4 py-3 mb-6 flex items-center">
                <svg
                  className="w-5 h-5 text-yellow-600 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-gray-800 font-medium">
                  Rated 4.5+ and responds fast
                </span>
              </div>

              {/* Best Matches Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {bestMatches.map((match) => {
                  const getCategoryLabel = (category: string) => {
                    switch (category) {
                      case "frequently_hired":
                        return "Most experienced";
                      case "responds_quickly":
                        return "Verified pro";
                      case "highly_rated":
                        return "Highly rated";
                      default:
                        return "Top pro";
                    }
                  };

                  return (
                    <BestMatchCard
                      key={match.id}
                      category={getCategoryLabel(match.category)}
                      name={match.full_name}
                      rating={match.rating_avg || 0}
                      reviewCount={match.review_count}
                      hasTopProBadge={match.is_top_pro}
                      yearsExperience={match.years_experience}
                      isVerified={match.is_verified}
                      onViewProfile={() => {
                        router.push(
                          `/mester/${match.slug}?service_pk=${serviceId}`,
                        );
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Loading State */}
          {loadingPros && (
            <div className="text-center py-12">
              <div className="text-gray-600 text-lg">
                Loading service providers...
              </div>
            </div>
          )}

          {/* Error State */}
          {!loadingPros && errorPros && (
            <div className="text-center py-12">
              <div className="text-red-600 text-lg">{errorPros}</div>
            </div>
          )}

          {/* Results */}
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">
            All Mesters
          </h2>
          {!loadingPros && !errorPros && pros && (
            <div className="space-y-6">
              {pros.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-600 text-lg">
                    No service providers found in your area
                  </div>
                  <p className="text-gray-500 mt-2">
                    Try expanding your search radius or check back later
                  </p>
                </div>
              ) : (
                pros.map((item) => {
                  const lat = coords?.lat ?? 47.4979;
                  const lon = coords?.lon ?? 19.0402;
                  const mLat = item.mester.lat ?? null;
                  const mLon = item.mester.lon ?? null;
                  let distanceLabel: string | null = null;
                  if (mLat !== null && mLon !== null) {
                    const toRad = (v: number) => (v * Math.PI) / 180;
                    const R = 6371; // km
                    const dLat = toRad(mLat - lat);
                    const dLon = toRad(mLon - lon);
                    const a =
                      Math.sin(dLat / 2) ** 2 +
                      Math.cos(toRad(lat)) *
                        Math.cos(toRad(mLat)) *
                        Math.sin(dLon / 2) ** 2;
                    const c = 2 * Math.asin(Math.sqrt(a));
                    const km = R * c;
                    distanceLabel = `${km.toFixed(1)} km away`;
                  }

                  // Mock data for demonstration - replace with real data when available
                  const mockMester = {
                    ...item.mester,
                    rating_avg: item.mester.rating_avg ?? undefined,
                    review_count: item.mester.review_count ?? undefined,
                    lat: item.mester.lat ?? undefined,
                    lon: item.mester.lon ?? undefined,
                    bio:
                      item.mester.bio ??
                      "Professional service provider with years of experience. Committed to delivering high-quality work and excellent customer service.",
                    logo_url: item.mester.logo_url ?? undefined,
                    availability_status: "Available this week",
                    response_time: "a day",
                    hire_count: Math.floor(Math.random() * 20) + 5,
                    starting_price: Math.floor(Math.random() * 200) + 50,
                  };

                  return (
                    <MesterCard
                      key={item.mester.id}
                      mester={mockMester}
                      distance={distanceLabel || undefined}
                      services={item.services}
                      serviceId={serviceId}
                    />
                  );
                })
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
