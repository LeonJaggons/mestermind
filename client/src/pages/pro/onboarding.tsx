import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  createOnboardingDraft,
  getOnboardingDraft,
  updateOnboardingDraft,
  finalizeOnboardingDraft,
  fetchCategories,
  fetchExploreServices,
  searchLocations,
  type OnboardingDraft,
  type OnboardingDraftCreate,
  type Service,
} from '@/lib/api';
import { storage, auth } from '@/firebase';
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';
import { subscribeToAuthChanges } from '@/lib/auth';
import { 
  cleanupOnboardingData, 
  setupOnboardingCleanupOnUnload,
  isInOnboardingFlow,
  getCurrentOnboardingDraftId 
} from '@/lib/onboardingCleanup';
import ProSignupDialog from '@/components/ProSignupDialog';

function useDraft() {
  const [draft, setDraft] = useState<OnboardingDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const lastId = typeof window !== 'undefined' ? localStorage.getItem('onboarding_draft_id') : null;
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    async function init() {
      try {
        setLoading(true);
        if (lastId) {
          const d = await getOnboardingDraft(lastId);
          setDraft(d);
        } else {
          const payload: OnboardingDraftCreate = { data: {} };
          if (params) {
            const service_id = params.get('service_id');
            const service_query = params.get('service_query');
            const city_id = params.get('city_id');
            const city_name = params.get('city_name');
            if (service_id) payload.data = { ...(payload.data || {}), services: [{ service_id }] };
            if (service_query) payload.data = { ...(payload.data || {}), service_query };
            if (city_id) payload.data = { ...(payload.data || {}), home_city_id: city_id };
            if (city_name) payload.data = { ...(payload.data || {}), city_name };
          }
          const d = await createOnboardingDraft(payload);
          localStorage.setItem('onboarding_draft_id', d.id);
          setDraft(d);
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to initialize draft';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, []);

  return { draft, setDraft, loading, error };
}

export default function ProOnboardingPage() {
  const router = useRouter();
  const { draft, setDraft, loading, error } = useDraft();
  const [userPresent, setUserPresent] = useState<boolean>(false);
  const [showSignup, setShowSignup] = useState<boolean>(false);

  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<number>(0);

  async function savePartial(partial: Record<string, unknown>) {
    if (!draft) return;
    try {
      setSaving(true);
      const next = await updateOnboardingDraft(draft.id, { data: partial });
      setDraft(next);
    } finally {
      setSaving(false);
    }
  }

  async function submitAll(partial: Record<string, unknown>) {
    if (!draft) return;
    let payload = { ...partial };
    // Ensure signed-in user's email is used when submitting profile
    const signedEmail = auth.currentUser?.email;
    if (signedEmail) {
      payload.email = signedEmail;
    }
    // If a data URL image exists, upload to Firebase Storage and use the download URL
    const dataUrl: string | undefined = (draft.data?.logo_url && typeof draft.data.logo_url === 'string' && draft.data.logo_url.startsWith('data:')) ? draft.data.logo_url : (draft.data?.logo && typeof draft.data.logo === 'object' && 'data_url' in draft.data.logo) ? (draft.data.logo as { data_url: string }).data_url : undefined;
    if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
      try {
        const filePath = `mesters/${draft.id}/logo`;
        const fileRef = storageRef(storage, filePath);
        const snap = await uploadString(fileRef, dataUrl, 'data_url');
        const url = await getDownloadURL(snap.ref);
        payload = { ...payload, logo_url: url };
      } catch (e) {
        // proceed without blocking finalize
      }
    }
    const next = await updateOnboardingDraft(draft.id, { data: payload });
    setDraft(next);
    const mester = await finalizeOnboardingDraft(next.id);
    localStorage.removeItem('onboarding_draft_id');
    router.replace(`/pro`);
  }

  // Move to business profile step without finalizing
  async function goToBusinessProfile(partial: Record<string, unknown>) {
    if (!draft) return;
    const next = await updateOnboardingDraft(draft.id, { data: partial, current_step: 1 });
    setDraft(next);
    setStep(1);
  }

  useEffect(() => {
    const unsub = subscribeToAuthChanges((u) => {
      setUserPresent(Boolean(u));
      
      // If user signs out while in onboarding, clean up
      if (!u && isInOnboardingFlow()) {
        const draftId = getCurrentOnboardingDraftId();
        if (draftId) {
          cleanupOnboardingData({ 
            draftId, 
            cleanupStorage: true 
          }).catch(error => {
            console.error('Error cleaning up onboarding on sign out:', error);
          });
        }
      }
    });
    return () => { if (unsub) unsub(); };
  }, []);

  // Set up cleanup on page unload
  useEffect(() => {
    const cleanup = setupOnboardingCleanupOnUnload();
    return cleanup;
  }, []);

  // Move to intro step without finalizing
  async function goToIntro(partial: Record<string, unknown>) {
    if (!draft) return;
    const next = await updateOnboardingDraft(draft.id, { data: partial, current_step: 2 });
    setDraft(next);
    setStep(2);
  }

  // Move to availability step without finalizing
  async function goToAvailability(partial: Record<string, unknown>) {
    if (!draft) return;
    const next = await updateOnboardingDraft(draft.id, { data: partial, current_step: 3 });
    setDraft(next);
    setStep(3);
  }

  // Move to preferences step without finalizing
  async function goToPreferences(partial: Record<string, unknown>) {
    if (!draft) return;
    const next = await updateOnboardingDraft(draft.id, { data: partial, current_step: 4 });
    setDraft(next);
    setStep(4);
  }

  // Move to coverage step without finalizing
  async function goToCoverage(partial: Record<string, unknown>) {
    if (!draft) return;
    const next = await updateOnboardingDraft(draft.id, { data: partial, current_step: 5 });
    setDraft(next);
    setStep(5);
  }

  // Move to budget step without finalizing
  async function goToBudget(partial: Record<string, unknown>) {
    if (!draft) return;
    const next = await updateOnboardingDraft(draft.id, { data: partial, current_step: 6 });
    setDraft(next);
    setStep(6);
  }

  // Form state
  const [businessName, setBusinessName] = useState<string>(typeof draft?.data?.business_name === 'string' ? draft.data.business_name : '');
  const [yearFounded, setYearFounded] = useState<string>(typeof draft?.data?.year_founded === 'string' ? draft.data.year_founded : '');
  const [numEmployees, setNumEmployees] = useState<string>(typeof draft?.data?.num_employees === 'string' ? draft.data.num_employees : '');
  const [streetName, setStreetName] = useState<string>(typeof draft?.data?.address === 'object' && draft.data.address && 'street' in draft.data.address && typeof draft.data.address.street === 'string' ? draft.data.address.street : '');
  const [unit, setUnit] = useState<string>(typeof draft?.data?.address === 'object' && draft.data.address && 'unit' in draft.data.address && typeof draft.data.address.unit === 'string' ? draft.data.address.unit : '');
  const [city, setCity] = useState<string>(typeof draft?.data?.address === 'object' && draft.data.address && 'city' in draft.data.address && typeof draft.data.address.city === 'string' ? draft.data.address.city : '');
  const [zip, setZip] = useState<string>(typeof draft?.data?.address === 'object' && draft.data.address && 'zip' in draft.data.address && typeof draft.data.address.zip === 'string' ? draft.data.address.zip : '');
  const [logoPreview, setLogoPreview] = useState<string>(typeof draft?.data?.logo_url === 'string' ? draft.data.logo_url : (typeof draft?.data?.logo === 'object' && draft.data.logo && 'data_url' in draft.data.logo) ? (draft.data.logo as { data_url: string }).data_url : '');
  const [cityQuery, setCityQuery] = useState<string>('');
  const [cityOptions, setCityOptions] = useState<Array<{ id: string; name: string }>>([]);

  const slugify = (value: string): string => {
    return (value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 160);
  };

  // Keep local form in sync when draft loads/changes
  useEffect(() => {
    setBusinessName(typeof draft?.data?.business_name === 'string' ? draft.data.business_name : '');
    setYearFounded(typeof draft?.data?.year_founded === 'string' ? draft.data.year_founded : '');
    setNumEmployees(typeof draft?.data?.num_employees === 'string' ? draft.data.num_employees : '');
    setStreetName(typeof draft?.data?.address === 'object' && draft.data.address && 'street' in draft.data.address && typeof draft.data.address.street === 'string' ? draft.data.address.street : '');
    setUnit(typeof draft?.data?.address === 'object' && draft.data.address && 'unit' in draft.data.address && typeof draft.data.address.unit === 'string' ? draft.data.address.unit : '');
    setCity(typeof draft?.data?.address === 'object' && draft.data.address && 'city' in draft.data.address && typeof draft.data.address.city === 'string' ? draft.data.address.city : '');
    setZip(typeof draft?.data?.address === 'object' && draft.data.address && 'zip' in draft.data.address && typeof draft.data.address.zip === 'string' ? draft.data.address.zip : '');
    setLogoPreview(typeof draft?.data?.logo_url === 'string' ? draft.data.logo_url : (typeof draft?.data?.logo === 'object' && draft.data.logo && 'data_url' in draft.data.logo) ? (draft.data.logo as { data_url: string }).data_url : '');
    setCityQuery(typeof draft?.data?.address === 'object' && draft.data.address && 'city' in draft.data.address && typeof draft.data.address.city === 'string' ? draft.data.address.city : '');
    setStep(typeof draft?.current_step === 'number' ? Math.min(Math.max(draft?.current_step || 0, 0), 6) : 0);
  }, [draft?.id]);

  // Debounced autosave as user types
  useEffect(() => {
    if (!draft) return;
    const t = setTimeout(() => {
      void savePartial({
        business_name: businessName,
        full_name: businessName || undefined,
        slug: businessName ? slugify(businessName) : undefined,
        year_founded: yearFounded,
        num_employees: numEmployees,
        address: { street: streetName, unit, city, zip },
      });
    }, 400);
    return () => clearTimeout(t);
  }, [businessName, yearFounded, numEmployees, streetName, unit, city, zip, draft?.id]);

  // Debounced city search
  useEffect(() => {
    const q = cityQuery?.trim();
    if (!q || q.length < 2) {
      setCityOptions([]);
      return;
    }
    const t = setTimeout(() => {
      void searchLocations(q, 8)
        .then(results => setCityOptions(results.filter(r => r.type === 'city').map(r => ({ id: r.id, name: r.name }))))
        .catch(() => setCityOptions([]));
    }, 300);
    return () => clearTimeout(t);
  }, [cityQuery]);

  if (loading) return <div className="p-6">Initializing…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!draft) return <div className="p-6">No draft</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 ">
      {step === 0 && (
        <>
          <ServicesSelectStep
            data={draft.data || {}}
            onSave={savePartial}
            onNext={async (payload) => {
              if (!userPresent) {
                setShowSignup(true);
                return;
              }
              await goToBusinessProfile(payload);
            }}
          />
          <ProSignupDialog
            open={showSignup}
            onClose={() => setShowSignup(false)}
            onSuccess={async () => {
              setShowSignup(false);
              await goToBusinessProfile({});
            }}
          />
        </>
      )}

      {step === 1 && (
        <>
          <h1 className="text-2xl font-semibold mb-2">Set up your business profile</h1>
          <p className="text-sm text-gray-600">Customers will see this info when choosing the right business for the job.</p>

          <div className="mt-6">
            <h2 className="text-sm font-medium text-gray-900">Upload a clear image that represents your brand</h2>
            <p className="text-sm text-gray-600">Customers prefer pros with a clear profile photo or logo.</p>

        <div className="mt-3">
          {logoPreview ? (
            <div className="flex items-center gap-4">
              <img src={logoPreview} alt="Logo preview" className="w-32 h-32 rounded object-cover border" />
              <button
                type="button"
                className="text-sm text-red-600"
                onClick={async () => {
                  setLogoPreview('');
                  await savePartial({ logo: null, logo_url: null });
                }}
              >Remove</button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-gray-400">
              <span className="text-sm text-gray-600">Click to upload or drag and drop</span>
              <span className="text-xs text-gray-500">PNG, JPG up to 5MB</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files && e.target.files[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) return; // 5MB limit
                  const reader = new FileReader();
                  reader.onload = async (ev) => {
                    const dataUrl = String(ev.target?.result || '');
                    setLogoPreview(dataUrl);
                    await savePartial({
                      logo: {
                        data_url: dataUrl,
                        file_name: file.name,
                        mime_type: file.type,
                        size: file.size,
                      },
                      logo_url: dataUrl,
                    });
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          )}
        </div>

            <div className="mt-4 text-xs text-blue-700">New pro tip</div>
            <div className="mt-2 text-sm text-gray-600">Here’s a few images Top Pros used:</div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div className="h-16 bg-gray-100 border rounded" />
              <div className="h-16 bg-gray-100 border rounded" />
              <div className="h-16 bg-gray-100 border rounded" />
            </div>
          </div>

          <form
            className="mt-8"
            onSubmit={async (e) => {
              e.preventDefault();
              await goToIntro({
                business_name: businessName,
                full_name: businessName || undefined,
                slug: businessName ? slugify(businessName) : undefined,
                year_founded: yearFounded,
                num_employees: numEmployees,
                address: {
                  street: streetName,
                  unit: unit,
                  city: city,
                  zip: zip,
                },
              });
            }}
          >
            <Field label="Business name">
              <input value={businessName} onChange={e => setBusinessName(e.target.value)} className="w-full border px-3 py-2 rounded" />
            </Field>
            <Field label="Year founded">
              <input value={yearFounded} onChange={e => setYearFounded(e.target.value)} placeholder="e.g. 2002" className="w-full border px-3 py-2 rounded" />
            </Field>
            <Field label="Number of employees">
              <input value={numEmployees} onChange={e => setNumEmployees(e.target.value)} placeholder="e.g. 1" className="w-full border px-3 py-2 rounded" />
            </Field>

            <h3 className="text-sm font-medium text-gray-900 mt-6">Main business location (optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <Field label="Street name">
                <input value={streetName} onChange={e => setStreetName(e.target.value)} className="w-full border px-3 py-2 rounded" />
              </Field>
              <Field label="Suite or unit">
                <input value={unit} onChange={e => setUnit(e.target.value)} className="w-full border px-3 py-2 rounded" />
              </Field>
              <Field label="City">
                <input
                  value={cityQuery}
                  onChange={e => setCityQuery(e.target.value)}
                  className="w-full border px-3 py-2 rounded"
                  placeholder="Search city or district"
                />
                {cityOptions.length > 0 && (
                  <div className="mt-2 border rounded max-h-56 overflow-auto divide-y">
                    {cityOptions.map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                        onClick={async () => {
                          setCity(opt.name);
                          setCityQuery(opt.name);
                          setCityOptions([]);
                          await savePartial({ address: { city: opt.name }, home_city_id: opt.id });
                        }}
                      >
                        {opt.name}
                      </button>
                    ))}
                  </div>
                )}
              </Field>
              <Field label="ZIP">
                <input value={zip} onChange={e => setZip(e.target.value)} className="w-full border px-3 py-2 rounded" />
              </Field>
            </div>

            <p className="text-xs text-gray-500 mt-6">By tapping “Next”, you confirm the above info is correct, you’re this business’s authorized representative and you understand you’re solely responsible for your profile’s contents.</p>

            <RowActions nextLabel="Next" onBack={async () => {
              if (!draft) return;
              const next = await updateOnboardingDraft(draft.id, { current_step: 0 });
              setDraft(next);
              setStep(0);
            }} onNext={async () => {
              await goToIntro({
                business_name: businessName,
                full_name: businessName || undefined,
                slug: businessName ? slugify(businessName) : undefined,
                year_founded: yearFounded,
                num_employees: numEmployees,
                address: { street: streetName, unit, city, zip },
              });
            }} />
          </form>
        </>
      )}

      {step === 2 && (
        <IntroStep
          data={draft.data || {}}
          onSave={savePartial}
          onBack={async () => {
            if (!draft) return;
            const next = await updateOnboardingDraft(draft.id, { current_step: 1 });
            setDraft(next);
            setStep(1);
          }}
          onSubmit={async (intro: string) => {
            await goToAvailability({ intro });
          }}
        />
      )}

      {step === 3 && (
        <AvailabilityStep
          data={draft.data || {}}
          onSave={savePartial}
          onBack={async () => {
            if (!draft) return;
            const next = await updateOnboardingDraft(draft.id, { current_step: 2 });
            setDraft(next);
            setStep(2);
          }}
          onSubmit={async (payload) => {
            await goToPreferences(payload);
          }}
        />
      )}

      {step === 4 && (
        <PreferencesStep
          data={draft.data || {}}
          onSave={savePartial}
          onBack={async () => {
            if (!draft) return;
            const next = await updateOnboardingDraft(draft.id, { current_step: 3 });
            setDraft(next);
            setStep(3);
          }}
          onSubmit={async (payload) => {
            await goToCoverage(payload);
          }}
        />
      )}

      {step === 5 && (
        <CoverageDistanceStep
          data={draft.data || {}}
          onSave={savePartial}
          onBack={async () => {
            if (!draft) return;
            const next = await updateOnboardingDraft(draft.id, { current_step: 4 });
            setDraft(next);
            setStep(4);
          }}
          onSubmit={async (payload) => {
            await goToBudget(payload);
          }}
        />
      )}

      {step === 6 && (
        <BudgetStep
          data={draft.data || {}}
          onSave={savePartial}
          onBack={async () => {
            if (!draft) return;
            const next = await updateOnboardingDraft(draft.id, { current_step: 5 });
            setDraft(next);
            setStep(5);
          }}
          onSubmit={async (payload) => {
            await submitAll(payload);
          }}
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      {children}
    </div>
  );
}

function RowActions({ onBack, onNext, nextLabel = 'Next' }: { onBack?: () => void; onNext?: () => void; nextLabel?: string }) {
  return (
    <div className="mt-6 flex items-center justify-between">
      <button disabled={!onBack} onClick={onBack} className={`px-4 py-2 rounded border ${onBack ? 'border-gray-300 text-gray-700' : 'border-gray-200 text-gray-400 cursor-not-allowed'}`}>Back</button>
      <button onClick={onNext} className="px-4 py-2 rounded bg-blue-600 text-white">{nextLabel}</button>
    </div>
  );
}

function ServicesSelectStep({ data, onSave, onNext }: { data: Record<string, unknown>; onSave: (p: Record<string, unknown>) => Promise<void>; onNext: (payload: Record<string, unknown>) => Promise<void> }) {
  const [svcOptions, setSvcOptions] = useState<Service[]>([]);
  const [services, setServices] = useState<Array<{ service_id: string; price: number | null; service_name?: string }>>(data.services as Array<{ service_id: string; price: number | null; service_name?: string }> || []);
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [categoryId, setCategoryId] = useState<string>((data.category_id as string) || '');
  const [loadingCats, setLoadingCats] = useState<boolean>(false);
  const [loadingSvcs, setLoadingSvcs] = useState<boolean>(false);
  const [svcFilter, setSvcFilter] = useState<string>('');

  // Hydrate service name cache from existing draft items
  useEffect(() => {
    const initialNames: Record<string, string> = {};
    (data.services as Array<{ service_id: string; price: number | null; service_name?: string }> || []).forEach((s: { service_id: string; price: number | null; service_name?: string }) => {
      if (s?.service_id && s?.service_name) initialNames[s.service_id] = s.service_name;
    });
    setServiceNames(initialNames);
    if (data.category_id) setCategoryId(data.category_id as string);
  }, [data.services]);

  // Load categories
  useEffect(() => {
    let alive = true;
    setLoadingCats(true);
    void fetchCategories()
      .then(list => { if (alive) setCategories(list.map(c => ({ id: c.id, name: c.name }))); })
      .finally(() => { if (alive) setLoadingCats(false); });
    return () => { alive = false; };
  }, []);

  // Load all services for selected category
  useEffect(() => {
    let alive = true;
    if (!categoryId) {
      setSvcOptions([]);
      return;
    }
    setLoadingSvcs(true);
    void fetchExploreServices({ category_id: categoryId })
      .then(list => { if (alive) setSvcOptions(list || []); })
      .finally(() => { if (alive) setLoadingSvcs(false); });
    return () => { alive = false; };
  }, [categoryId]);

  useEffect(() => {
    const t = setTimeout(() => { void onSave({ services, category_id: categoryId || null }); }, 300);
    return () => clearTimeout(t);
  }, [services, categoryId]);

  const toggleService = (svc: Service) => {
    setServices(prev => {
      const exists = prev.find((x: { service_id: string; price: number | null }) => x.service_id === svc.id);
      if (exists) return prev.filter((x: { service_id: string; price: number | null }) => x.service_id !== svc.id);
      return [...prev, { service_id: svc.id, service_name: svc.name, pricing_model: 'hourly', price: null, quote_only: false }];
    });
    setServiceNames(prev => ({ ...prev, [svc.id]: svc.name }));
  };

  const updateServicePrice = (id: string, price: number) => {
    setServices(prev => prev.map((x: { service_id: string; price: number | null }) => x.service_id === id ? { ...x, price: isNaN(price) ? null : price } : x));
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Select your services</h1>
      <p className="text-sm text-gray-600">Choose the services you want to perform under a specific category. You can adjust details later.</p>

      <div className="mt-6">
        <Field label="Category">
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="" disabled>{loadingCats ? 'Loading…' : 'Select a category'}</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Search services in this category">
          <input
            value={svcFilter}
            onChange={e => setSvcFilter(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            placeholder={categoryId ? 'Search services…' : 'Select a category first'}
            disabled={!categoryId}
          />
        </Field>
        <div className="mt-2 border rounded max-h-72 overflow-auto divide-y">
          {!categoryId && (
            <div className="px-3 py-2 text-sm text-gray-600">Select a category to see services.</div>
          )}
          {categoryId && loadingSvcs && (
            <div className="px-3 py-2 text-sm text-gray-600">Loading services…</div>
          )}
          {categoryId && !loadingSvcs && svcOptions.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-600">No services found for this category.</div>
          )}
          {categoryId && !loadingSvcs && svcOptions.length > 0 && (
            <div>
              {svcOptions
                .filter((svc: Service) => !svcFilter.trim() || svc.name.toLowerCase().includes(svcFilter.trim().toLowerCase()))
                .sort((a: Service, b: Service) => {
                  const aSel = services.some((x: { service_id: string; price: number | null }) => x.service_id === a.id);
                  const bSel = services.some((x: { service_id: string; price: number | null }) => x.service_id === b.id);
                  if (aSel !== bSel) return aSel ? -1 : 1; // selected to top
                  return a.name.localeCompare(b.name);
                })
                .map((svc: Service) => {
                const checked = services.some((x: { service_id: string; price: number | null }) => x.service_id === svc.id);
                return (
                  <label key={svc.id} className="flex items-center gap-2 text-sm px-3 py-2 hover:bg-gray-50">
                    <input type="checkbox" checked={checked} onChange={() => toggleService(svc)} />
                    <span>{svc.name}</span>
                  </label>
                );
                })}
            </div>
          )}
        </div>
        {services.length > 0 && (
          <div className="mt-2 text-xs text-gray-600">Selected: {services.length}</div>
        )}
      </div>

      {services.length > 0 && (
        <div className="mt-4 space-y-3">
          {services.map((sel: { service_id: string; price: number | null; service_name?: string }) => (
            <div key={sel.service_id} className="border rounded p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-gray-900">{serviceNames[sel.service_id] || sel.service_name || ''}</div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Price</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="w-28 border px-2 py-1 rounded"
                    value={sel.price ?? ''}
                    onChange={e => updateServicePrice(sel.service_id, parseFloat(e.target.value || ''))}
                  />
                  <span className="text-sm text-gray-500">HUF</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center justify-end">
        <button disabled={services.length === 0 || !categoryId} onClick={() => onNext({ services, category_id: categoryId })} className={`px-4 py-2 rounded ${(services.length === 0 || !categoryId) ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white'}`}>Next</button>
      </div>
    </div>
  );
}

function IntroStep({ data, onSave, onBack, onSubmit }: { data: Record<string, unknown>; onSave: (p: Record<string, unknown>) => Promise<void>; onBack: () => Promise<void> | void; onSubmit: (intro: string) => Promise<void> }) {
  const [intro, setIntro] = useState<string>((data.intro as string) || '');
  const min = 40;
  const tooShort = intro.trim().length > 0 && intro.trim().length < min;

  useEffect(() => {
    const t = setTimeout(() => { void onSave({ intro }); }, 400);
    return () => clearTimeout(t);
  }, [intro]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Why should customers hire you?</h1>
      <p className="text-sm text-gray-600">Explain what makes your business stand out and why you’ll do a great job.</p>

      <h2 className="text-sm font-medium text-gray-900 mt-6">Introduce your business.</h2>
      <div className="text-sm text-gray-600 mb-2">Minimum {min} characters</div>
      <textarea
        value={intro}
        onChange={e => setIntro(e.target.value)}
        rows={6}
        className={`w-full border px-3 py-2 rounded ${tooShort ? 'border-yellow-500' : ''}`}
        placeholder="Tell customers about your experience, passion, and what makes you different"
      />
      {tooShort && <div className="text-xs text-yellow-700 mt-1">Please write at least {min} characters.</div>}

      <div className="mt-6">
        <div className="text-xs font-medium text-gray-700">EXAMPLE INTRODUCTIONS</div>
        <div className="text-xs text-gray-600">You can mention:</div>
        <ul className="list-disc pl-5 text-xs text-gray-600 mt-1 space-y-1">
          <li>Years in business</li>
          <li>What you’re passionate about</li>
          <li>Special skills or equipment</li>
        </ul>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button onClick={onBack} className="px-4 py-2 rounded border border-gray-300 text-gray-700">Back</button>
        <button disabled={intro.trim().length < min} onClick={() => onSubmit(intro)} className={`px-4 py-2 rounded ${intro.trim().length < min ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white'}`}>Next</button>
      </div>
    </div>
  );
}

function AvailabilityStep({ data, onSave, onBack, onSubmit }: { data: Record<string, unknown>; onSave: (p: Record<string, unknown>) => Promise<void>; onBack: () => Promise<void> | void; onSubmit: (payload: Record<string, unknown>) => Promise<void> }) {
  type DayKey = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
  const businessHours: Record<DayKey, { open: string; close: string; enabled: boolean }> = {
    Sun: { open: '09:00', close: '17:00', enabled: true },
    Mon: { open: '09:00', close: '17:00', enabled: true },
    Tue: { open: '09:00', close: '17:00', enabled: true },
    Wed: { open: '09:00', close: '17:00', enabled: true },
    Thu: { open: '09:00', close: '17:00', enabled: true },
    Fri: { open: '09:00', close: '17:00', enabled: true },
    Sat: { open: '09:00', close: '17:00', enabled: true },
  };
  const anyHours: Record<DayKey, { open: string; close: string; enabled: boolean }> = {
    Sun: { open: '00:00', close: '23:59', enabled: true },
    Mon: { open: '00:00', close: '23:59', enabled: true },
    Tue: { open: '00:00', close: '23:59', enabled: true },
    Wed: { open: '00:00', close: '23:59', enabled: true },
    Thu: { open: '00:00', close: '23:59', enabled: true },
    Fri: { open: '00:00', close: '23:59', enabled: true },
    Sat: { open: '00:00', close: '23:59', enabled: true },
  };

  const initialFromSavedOrMode = (): Record<DayKey, { open: string; close: string; enabled: boolean }> => {
    const saved = data?.working_hours as Record<string, { open: string; close: string; enabled: boolean }> | undefined;
    if (saved && typeof saved === 'object') {
      return {
        Sun: saved.Sun || businessHours.Sun,
        Mon: saved.Mon || businessHours.Mon,
        Tue: saved.Tue || businessHours.Tue,
        Wed: saved.Wed || businessHours.Wed,
        Thu: saved.Thu || businessHours.Thu,
        Fri: saved.Fri || businessHours.Fri,
        Sat: saved.Sat || businessHours.Sat,
      } as Record<DayKey, { open: string; close: string; enabled: boolean }>;
    }
    const mode = (data?.availability_mode as 'business' | 'any') || 'business';
    return mode === 'business' ? businessHours : anyHours;
  };

  const [hours, setHours] = useState(initialFromSavedOrMode());
  const [mode, setMode] = useState<'business' | 'any'>((data?.availability_mode as 'business' | 'any') || 'business');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { void onSave({ working_hours: hours, availability_mode: mode }); }, 400);
    return () => clearTimeout(t);
  }, [hours, mode]);

  const days: DayKey[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const prettyTime = (t: string) => {
    if (t === '00:00') return '12:00 a.m.';
    if (t === '23:59') return 'midnight';
    const [hh, mm] = t.split(':').map(Number);
    const h12 = ((hh + 11) % 12) + 1;
    const suffix = hh < 12 ? 'a.m.' : 'p.m.';
    return `${h12}:${mm.toString().padStart(2, '0')} ${suffix}`;
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Set your availability</h1>
      <p className="text-sm text-gray-600">Customers will only request jobs to be done during the times you set. But you may still get messages from customers outside these times.</p>

      <div className="mt-6 flex items-center gap-2 text-sm">
        <button onClick={() => { setMode('business'); setHours(businessHours); }} className={`px-3 py-1 rounded border ${mode === 'business' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700'}`}>Use business hours</button>
        <button onClick={() => { setMode('any'); setHours(anyHours); }} className={`px-3 py-1 rounded border ${mode === 'any' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700'}`}>Use any open day or time</button>
      </div>

      <div className="mt-6 border rounded divide-y">
        {days.map((d) => (
          <div key={d} className="p-3 grid grid-cols-1 md:grid-cols-4 items-center gap-3">
            <div className="text-sm text-gray-700">{d}</div>
            {!editing ? (
              <div className="md:col-span-2 text-sm text-gray-700">
                {hours[d].enabled ? `${prettyTime(hours[d].open)} - ${prettyTime(hours[d].close)}` : 'Closed'}
              </div>
            ) : (
              <div className="md:col-span-2 flex items-center gap-2">
                <label className="text-sm flex items-center gap-2">
                  <input type="checkbox" checked={hours[d].enabled} onChange={e => setHours(prev => ({ ...prev, [d]: { ...prev[d], enabled: e.target.checked } }))} />
                  <span>Open</span>
                </label>
                <input type="time" value={hours[d].open} onChange={e => setHours(prev => ({ ...prev, [d]: { ...prev[d], open: e.target.value } }))} className="border px-2 py-1 rounded" />
                <span className="text-sm text-gray-500">-</span>
                <input type="time" value={hours[d].close} onChange={e => setHours(prev => ({ ...prev, [d]: { ...prev[d], close: e.target.value } }))} className="border px-2 py-1 rounded" />
              </div>
            )}
            {d === 'Sun' && (
              <div className="md:col-start-4 md:row-start-1 md:self-start">
                <button onClick={() => setEditing(v => !v)} className="text-sm text-blue-600">{editing ? 'Done' : 'Edit'}</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button onClick={onBack} className="px-4 py-2 rounded border border-gray-300 text-gray-700">Back</button>
        <button onClick={() => onSubmit({ working_hours: hours, availability_mode: mode })} className="px-4 py-2 rounded bg-blue-600 text-white">Next</button>
      </div>
    </div>
  );
}

function PreferencesStep({ data, onSave, onBack, onSubmit }: { data: Record<string, unknown>; onSave: (p: Record<string, unknown>) => Promise<void>; onBack: () => Promise<void> | void; onSubmit: (payload: Record<string, unknown>) => Promise<void> }) {
  const preferences = data?.preferences as Record<string, unknown> | undefined;
  const [propertyType, setPropertyType] = useState<'residential' | 'commercial'>((preferences?.property_type as 'residential' | 'commercial') || 'residential');
  const [jobSize, setJobSize] = useState<'smaller' | 'larger'>((preferences?.job_size as 'smaller' | 'larger') || 'smaller');
  const [frequency, setFrequency] = useState<'one_time' | 'ongoing'>((preferences?.frequency as 'one_time' | 'ongoing') || 'one_time');
  const [removeDebris, setRemoveDebris] = useState<boolean>(Boolean(preferences?.remove_debris));

  useEffect(() => {
    const t = setTimeout(() => {
      void onSave({ preferences: { property_type: propertyType, job_size: jobSize, frequency, remove_debris: removeDebris } });
    }, 300);
    return () => clearTimeout(t);
  }, [propertyType, jobSize, frequency, removeDebris]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Which jobs do you prefer?</h1>
      <p className="text-sm text-gray-600">You can adjust these for each service later.</p>

      <div className="mt-6">
        <h2 className="text-sm font-medium text-gray-900 mb-2">Property type</h2>
        <div className="flex gap-2 text-sm">
          <button onClick={() => setPropertyType('residential')} className={`px-3 py-1 rounded border ${propertyType === 'residential' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700'}`}>Residential</button>
          <button onClick={() => setPropertyType('commercial')} className={`px-3 py-1 rounded border ${propertyType === 'commercial' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700'}`}>Commercial</button>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-medium text-gray-900 mb-2">Job size</h2>
        <div className="flex gap-2 text-sm">
          <button onClick={() => setJobSize('smaller')} className={`px-3 py-1 rounded border ${jobSize === 'smaller' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700'}`}>Smaller</button>
          <button onClick={() => setJobSize('larger')} className={`px-3 py-1 rounded border ${jobSize === 'larger' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700'}`}>Larger</button>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-medium text-gray-900 mb-2">Frequency of work</h2>
        <div className="flex gap-2 text-sm">
          <button onClick={() => setFrequency('one_time')} className={`px-3 py-1 rounded border ${frequency === 'one_time' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700'}`}>One time projects</button>
          <button onClick={() => setFrequency('ongoing')} className={`px-3 py-1 rounded border ${frequency === 'ongoing' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700'}`}>Ongoing maintenance services</button>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-medium text-gray-900 mb-2">Work conditions</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={removeDebris} onChange={e => setRemoveDebris(e.target.checked)} />
          <span>Can remove debris if requested</span>
        </label>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button onClick={onBack} className="px-4 py-2 rounded border border-gray-300 text-gray-700">Back</button>
        <button onClick={() => onSubmit({ preferences: { property_type: propertyType, job_size: jobSize, frequency, remove_debris: removeDebris } })} className="px-4 py-2 rounded bg-blue-600 text-white">Next</button>
      </div>
    </div>
  );
}

function CoverageDistanceStep({ data, onSave, onBack, onSubmit }: { data: Record<string, unknown>; onSave: (p: Record<string, unknown>) => Promise<void>; onBack: () => Promise<void> | void; onSubmit: (payload: Record<string, unknown>) => Promise<void> }) {
  const initialRadius = (() => {
    const coverage = data?.coverage as Array<{ radius_miles: number }> | undefined;
    const raw = coverage?.[0]?.radius_miles ?? (data?.radius_miles as number) ?? 25;
    const num = Number(raw);
    return Number.isFinite(num) && num >= 1 ? num : 25;
  })();
  const [radius, setRadius] = useState<number>(initialRadius);

  useEffect(() => {
    const t = setTimeout(() => { void onSave({ coverage: [{ radius_miles: radius }] }); }, 300);
    return () => clearTimeout(t);
  }, [radius]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Choose where you work.</h1>
      <p className="text-sm text-gray-600">You’ll auto-pay for leads in these areas when they match your preferences. You can fine-tune this later.</p>

      <div className="mt-6 text-sm text-gray-700">{radius} miles from business location</div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-900 mb-2">Select by distance</label>
        <input
          type="range"
          min={1}
          max={200}
          value={radius}
          onChange={e => {
            const next = parseInt(e.target.value || '0', 10);
            setRadius(Number.isFinite(next) && next >= 1 ? next : 1);
          }}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1</span>
          <span>200</span>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button onClick={onBack} className="px-4 py-2 rounded border border-gray-300 text-gray-700">Back</button>
        <button
          disabled={!radius || radius < 1}
          onClick={() => onSubmit({ coverage: [{ radius_miles: radius }] })}
          className={`px-4 py-2 rounded ${!radius || radius < 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white'}`}
        >Next</button>
      </div>
    </div>
  );
}

function BudgetStep({ data, onSave, onBack, onSubmit }: { data: Record<string, unknown>; onSave: (p: Record<string, unknown>) => Promise<void>; onBack: () => Promise<void> | void; onSubmit: (payload: Record<string, unknown>) => Promise<void> }) {
  const servicesCount = Array.isArray(data?.services) ? data.services.length : (Number(data?.services_count) || 3);
  const [budgetMode, setBudgetMode] = useState<'unlimited' | 'limited'>(data?.budget_mode === 'limited' ? 'limited' : 'unlimited');
  const [weeklyBudget, setWeeklyBudget] = useState<number>(Number(data?.weekly_budget || 125));
  const spent = Number(data?.spent_this_week || 60);
  const pct = Math.max(0, Math.min(100, Math.round((spent / Math.max(weeklyBudget, 1)) * 100)));

  useEffect(() => {
    const t = setTimeout(() => { void onSave({ budget_mode: budgetMode, weekly_budget: budgetMode === 'limited' ? weeklyBudget : null }); }, 300);
    return () => clearTimeout(t);
  }, [budgetMode, weeklyBudget]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Set a weekly budget</h1>
      <p className="text-sm text-gray-600">Your budget is a max you’ll spend weekly. We send leads that match your preferences, until your budget runs out for the week.</p>

      <div className="mt-6 text-sm text-gray-700">{servicesCount} services</div>

      <div className="mt-8">
        <h2 className="text-sm font-medium text-gray-900">Choose how to budget your spending</h2>
        <p className="text-sm text-gray-600">Your budget helps determine how many leads you’ll get. Update your budget anytime.</p>

        <div className="mt-4 space-y-4">
          <div className={`border rounded p-4 ${budgetMode === 'unlimited' ? 'border-blue-600' : 'border-gray-200'}`}>
            <div className="text-xs text-blue-700 mb-1">Recommended</div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="radio" name="budget-mode" checked={budgetMode === 'unlimited'} onChange={() => setBudgetMode('unlimited')} className="mt-1" />
              <div>
                <div className="font-medium">Don&apos;t limit my budget</div>
                <div className="text-sm text-gray-600 mt-1">This allows you to get all the leads that fit your job preferences. You can always change this later.</div>
              </div>
            </label>
          </div>

          <div className={`border rounded p-4 ${budgetMode === 'limited' ? 'border-blue-600' : 'border-gray-200'}`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="radio" name="budget-mode" checked={budgetMode === 'limited'} onChange={() => setBudgetMode('limited')} className="mt-1" />
              <div>
                <div className="font-medium">Limit my budget</div>
                <div className="text-sm text-gray-600 mt-1">Set a limit on how much you&apos;ll spend per week.</div>
              </div>
            </label>

            {budgetMode === 'limited' && (
              <div className="mt-4">
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-semibold">$</span>
                  <input
                    type="number"
                    min={80}
                    step={5}
                    value={weeklyBudget}
                    onChange={e => setWeeklyBudget(parseInt(e.target.value || '0', 10))}
                    className="w-32 border px-3 py-2 rounded text-2xl font-semibold"
                  />
                  <span className="text-gray-600 mb-1">per week</span>
                </div>
                <div className="mt-3">
                  <input type="range" min={80} max={1000} step={5} value={weeklyBudget} onChange={e => setWeeklyBudget(parseInt(e.target.value || '0', 10))} className="w-full" />
                </div>


                <div className="text-xs text-gray-600 mt-4">
                  Tip: A ${weeklyBudget} budget will still help you establish your business quickly, but won&apos;t get you as many leads as possible. The minimum budget is $80.
                </div>
                <div className="text-xs text-blue-700 mt-1">You can change your budget anytime. Learn more about weekly budgets.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button onClick={onBack} className="px-4 py-2 rounded border border-gray-300 text-gray-700">Back</button>
        <button onClick={() => onSubmit({ budget_mode: budgetMode, weekly_budget: budgetMode === 'limited' ? weeklyBudget : null })} className="px-4 py-2 rounded bg-blue-600 text-white">Next</button>
      </div>
    </div>
  );
}
