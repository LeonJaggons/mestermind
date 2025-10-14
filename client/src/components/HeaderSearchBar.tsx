import { useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import LocationSearch from "./LocationSearch";
import ServiceSearch from "./ServiceSearch";
import { LocationSearchResult, Service } from "@/lib/api";
import { saveRecentSearch } from "@/lib/recentSearches";
import { Search } from "lucide-react";

export default function HeaderSearchBar() {
  const router = useRouter();
  const [selectedLocation, setSelectedLocation] = useState<LocationSearchResult | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const handleSearch = () => {
    if (!selectedService || !selectedLocation) return;

    // Save the search to recent searches
    saveRecentSearch(selectedService, selectedLocation);

    const serviceId = selectedService.id;
    const placeId = selectedLocation.id;
    const placeType = selectedLocation.type;
    router.push(
      `/instant-results/service_pk=${serviceId}&place_pk=${placeId}&place_type=${placeType}`,
    );
  };

  return (
    <div className="flex items-stretch bg-white border border-gray-200 rounded-lg overflow-hidden w-full shadow-sm h-10">
      <div className="flex-1 flex items-center">
        <ServiceSearch
          onSelect={(svc) => setSelectedService(svc)}
          selectedService={selectedService}
          onClearSelected={() => setSelectedService(null)}
          placeholder="What service do you need?"
          className="flex-1 border-0 h-full"
          compact={true}
        />
      </div>
      <div className="w-px bg-gray-200"></div>
      <div className="flex items-center min-w-[200px]">
        <LocationSearch
          selectedLocation={selectedLocation}
          onLocationSelect={setSelectedLocation}
          placeholder="Location..."
          className="w-full border-0 h-full"
          compact={true}
        />
      </div>
      <Button
        onClick={handleSearch}
        disabled={!selectedService || !selectedLocation}
        size="sm"
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-l-none disabled:opacity-50 h-full"
      >
        <Search className="h-4 w-4" />
      </Button>
    </div>
  );
}

