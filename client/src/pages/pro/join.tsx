import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { searchServices, searchLocations, type Service, type LocationSearchResult } from '@/lib/api';

export default function JoinAsProPage() {
  const router = useRouter();
  const [svcQuery, setSvcQuery] = useState('');
  const [svcOptions, setSvcOptions] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const [cityQuery, setCityQuery] = useState('');
  const [cityOptions, setCityOptions] = useState<LocationSearchResult[]>([]);
  const [selectedCity, setSelectedCity] = useState<LocationSearchResult | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      if (svcQuery.trim().length >= 2) {
        void searchServices(svcQuery.trim()).then(setSvcOptions).catch(() => setSvcOptions([]));
      } else {
        setSvcOptions([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [svcQuery]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (cityQuery.trim().length >= 2) {
        void searchLocations(cityQuery.trim(), 8).then(setCityOptions).catch(() => setCityOptions([]));
      } else {
        setCityOptions([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [cityQuery]);

  function submit() {
    const params = new URLSearchParams();
    if (selectedService) params.set('service_id', selectedService.id);
    else if (svcQuery.trim()) params.set('service_query', svcQuery.trim());
    if (selectedCity) params.set('city_id', selectedCity.id);
    else if (cityQuery.trim()) params.set('city_name', cityQuery.trim());
    router.push(`/pro/onboarding?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-10 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Get jobs.</h1>
          <p className="text-gray-600 mb-6">Over thousands of leads on Mestermind.</p>
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">What service do you provide?</label>
            <div className="relative mb-4">
              <input
                value={svcQuery}
                onChange={(e) => { setSvcQuery(e.target.value); setSelectedService(null); }}
                placeholder="e.g. House cleaning"
                className="w-full border rounded px-3 py-2"
              />
              {svcOptions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow">
                  {svcOptions.slice(0, 8).map(opt => (
                    <button key={opt.id} className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setSelectedService(opt); setSvcQuery(opt.name); setSvcOptions([]); }}>
                      {opt.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative mb-4">
              <input
                value={cityQuery}
                onChange={(e) => { setCityQuery(e.target.value); setSelectedCity(null); }}
                placeholder="e.g. Budapest or 1011"
                className="w-full border rounded px-3 py-2"
              />
              {cityOptions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow max-h-64 overflow-auto">
                  {cityOptions.map(opt => (
                    <button key={opt.id} className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setSelectedCity(opt); setCityQuery(opt.city_name || opt.name); setCityOptions([]); }}>
                      {opt.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={submit} className="w-full bg-blue-600 text-white rounded px-4 py-2">Sign up for free</button>
          </div>
          <div className="text-sm text-gray-600 mt-4">Already have a draft? Continue where you left off on the next page.</div>
        </div>
        <div className="hidden md:block">
          <div className="w-full h-80 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}


