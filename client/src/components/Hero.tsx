import { useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import LocationSearch from "./LocationSearch";
import { LocationSearchResult, Service } from "@/lib/api";
import ServiceSearch from "./ServiceSearch";

export default function Hero() {
  const router = useRouter();
  const [selectedLocation, setSelectedLocation] = useState<LocationSearchResult | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const handleSearch = () => {
    if (!selectedService || !selectedLocation) return;
    const serviceId = selectedService.id;
    const placeId = selectedLocation.id;
    const placeType = selectedLocation.type; // 'city' | 'district' | 'postal_code'
    router.push(`/instant-results/service_pk=${serviceId}&place_pk=${placeId}&place_type=${placeType}`);
  };

  return (
    <section className="w-full bg-white py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Main Logo */}
        <div className="mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-2xl">T</span>
          </div>
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 leading-tight">
          The easiest way to hire with confidence.
        </h1>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative flex items-center bg-white border border-gray-200 rounded-lg shadow-sm">
            <ServiceSearch
              onSelect={(svc) => setSelectedService(svc)}
              selectedService={selectedService}
              onClearSelected={() => setSelectedService(null)}
              className="flex-1"
            />
            <LocationSearch
              selectedLocation={selectedLocation}
              onLocationSelect={setSelectedLocation}
              placeholder="Enter location..."
              className="min-w-[200px]"
            />
            <Button 
              onClick={handleSearch}
              disabled={!selectedService || !selectedLocation}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-r-lg rounded-l-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Search className="w-5 h-5 mr-2" />
              Search
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
