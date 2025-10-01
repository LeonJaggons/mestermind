import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import QuestionSetModal from "@/components/QuestionSetModal";
import MesterCard from "@/components/MesterCard";
import { searchPros, type SearchProsItem, fetchQuestionSetsByService, normalizeLocation, type GeoNormalizeResponse, checkRequestExists } from "@/lib/api";

export default function InstantResults() {
  const router = useRouter();
  const { params, service_pk, place_pk, place_type } = router.query as {
    params?: string;
    service_pk?: string;
    place_pk?: string;
    place_type?: 'city' | 'district' | 'postal_code';
  };

  // Support both formats:
  // 1) /instant-results/service_pk=...&place_pk=...
  // 2) /instant-results?service_pk=...&place_pk=...
  let serviceId = service_pk || "";
  let placeId = place_pk || "";
  let placeType = place_type || "" as any;

  if (!serviceId || !placeId) {
    const raw = typeof params === "string" ? params : Array.isArray(params) ? params[0] : "";
    if (raw) {
      const pairs = raw.split("&");
      for (const pair of pairs) {
        const [k, v] = pair.split("=");
        if (k === "service_pk") serviceId = v || "";
        if (k === "place_pk") placeId = v || "";
        if (k === "place_type") placeType = (v as any) || "";
      }
    }
  }

  const [open, setOpen] = useState(false);
  const [hasQuestionSet, setHasQuestionSet] = useState<boolean | null>(null);
  const [pros, setPros] = useState<SearchProsItem[] | null>(null);
  const [loadingPros, setLoadingPros] = useState(false);
  const [errorPros, setErrorPros] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [fallbackMsg, setFallbackMsg] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;
    if (!serviceId) {
      setHasQuestionSet(null);
      setOpen(false);
      return;
    }
    const check = async () => {
      try {
        const sets = await fetchQuestionSetsByService(serviceId);
        const published = sets.filter(s => s.status === 'published' && s.is_active !== false);
        if (!aborted) {
          const exists = published.length > 0;
          setHasQuestionSet(exists);
          // If a submission flag exists, do not auto-open the modal again
          const submittedKey = `mm:submitted:${serviceId}:${placeId || ''}`;
          const alreadySubmitted = typeof window !== 'undefined' ? window.localStorage.getItem(submittedKey) === '1' : false;
          let shouldOpen = exists && !alreadySubmitted;
          // Additional server-side dedupe: if a request already exists, don't open
          if (shouldOpen && published.length > 0) {
            try {
              const latest = published.reduce((acc, s) => (s.version > acc.version ? s : acc), published[0]);
              const existsResp = await checkRequestExists({ service_id: serviceId, question_set_id: latest.id, place_id: placeId });
              if (existsResp.exists) {
                shouldOpen = false;
              }
            } catch {
              // ignore API failure; fallback to local logic
            }
          }
          setOpen(shouldOpen);
        }
      } catch {
        if (!aborted) {
          setHasQuestionSet(false);
          setOpen(false);
        }
      }
    };
    check();
    return () => { aborted = true; };
  }, [serviceId]);

  // Resolve coordinates from placeId (city/district/postal) using backend normalize API; fallback to Budapest
  useEffect(() => {
    let aborted = false;
    const resolve = async () => {
      try {
        if (placeId) {
          const res: GeoNormalizeResponse = await normalizeLocation(placeType ? { place_id: placeId, type: placeType } : { place_id: placeId });
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
          ? 'No location provided; using Budapest center as fallback.'
          : 'Could not normalize the selected location; using Budapest center as fallback.';
        setFallbackMsg(reason);
      }
    };
    resolve();
    return () => { aborted = true; };
  }, [placeId]);

  // Background fetch pros regardless of question set/modal state
  useEffect(() => {
    if (!serviceId || !coords) return;
    let aborted = false;
    const loadPros = async () => {
      try {
        setLoadingPros(true);
        setErrorPros(null);
        const resp = await searchPros({ service_id: serviceId, lat: coords.lat, lon: coords.lon, radius_km: 25, limit: 20 });
        if (!aborted) setPros(resp.items);
      } catch (e: any) {
        if (!aborted) setErrorPros(e?.message || 'Failed to load pros');
      } finally {
        if (!aborted) setLoadingPros(false);
      }
    };
    loadPros();
    return () => { aborted = true; };
  }, [serviceId, coords]);

  // Fetch pros after the form is submitted: listen for storage flag set by modal
  useEffect(() => {
    if (!serviceId) return;
    const handler = async () => {
      const key = `mm:submitted:${serviceId}:${placeId || ''}`;
      const val = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      if (val === '1') {
        try {
          setLoadingPros(true);
          setErrorPros(null);
          const lat = 47.4979; // fallback Budapest center; replace with normalized place when wired
          const lon = 19.0402;
          const resp = await searchPros({ service_id: serviceId, lat, lon, radius_km: 25, limit: 20 });
          setPros(resp.items);
        } catch (e: any) {
          setErrorPros(e?.message || 'Failed to load pros');
          } finally {
            setLoadingPros(false);
            // Keep the submitted flag to avoid reopening the modal on future visits
          }
      }
    };
    handler();
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('mm:submitted:')) handler();
    };
    if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
    };
  }, [serviceId, placeId]);

  return (
    <>
      <Head>
        <title>Instant Results</title>
      </Head>
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Available Service Providers</h1>
            <p className="text-gray-600">Find trusted professionals in your area</p>
          </div>

          {fallbackMsg && (
            <div className="mb-6 max-w-2xl mx-auto rounded-lg border border-amber-300 bg-amber-50 text-amber-900 px-4 py-3">
              <p className="text-sm">{fallbackMsg}</p>
            </div>
          )}

          {/* Loading State */}
          {loadingPros && (
            <div className="text-center py-12">
              <div className="text-gray-600 text-lg">Loading service providers...</div>
            </div>
          )}

          {/* Error State */}
          {!loadingPros && errorPros && (
            <div className="text-center py-12">
              <div className="text-red-600 text-lg">{errorPros}</div>
            </div>
          )}

          {/* Results */}
          {!loadingPros && !errorPros && pros && (
            <div className="space-y-6">
              {pros.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-600 text-lg">No service providers found in your area</div>
                  <p className="text-gray-500 mt-2">Try expanding your search radius or check back later</p>
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
                    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat)) * Math.cos(toRad(mLat)) * Math.sin(dLon / 2) ** 2;
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
                    bio: item.mester.bio ?? "Professional service provider with years of experience. Committed to delivering high-quality work and excellent customer service.",
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
                    />
                  );
                })
              )}
            </div>
          )}
        </div>
      </main>
      {hasQuestionSet && (
        <QuestionSetModal
          serviceId={serviceId}
          placeId={placeId}
          open={open}
          onClose={() => setOpen(false)}
          context="instant-results"
        />
      )}
    </>
  );
}