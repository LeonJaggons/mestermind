import { useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import LocationSearch from "./LocationSearch";
import { LocationSearchResult, Service, ServiceExplore } from "@/lib/api";
import ServiceSearch from "./ServiceSearch";
import RecentSearches from "./RecentSearches";
import PopularServicesNearYou from "./PopularServicesNearYou";
import { saveRecentSearch } from "@/lib/recentSearches";

export default function Hero() {
  const router = useRouter();
  const [selectedLocation, setSelectedLocation] =
    useState<LocationSearchResult | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const handleSearch = () => {
    if (!selectedService || !selectedLocation) return;

    // Save the search to recent searches
    saveRecentSearch(selectedService, selectedLocation);

    const serviceId = selectedService.id;
    const placeId = selectedLocation.id;
    const placeType = selectedLocation.type; // 'city' | 'district' | 'postal_code'
    router.push(
      `/instant-results/service_pk=${serviceId}&place_pk=${placeId}&place_type=${placeType}`,
    );
  };

  const handlePopularServiceSelect = (service: ServiceExplore) => {
    // Convert ServiceExplore to Service format
    const serviceObj: Service = {
      id: service.id,
      category_id: service.category_id,
      subcategory_id: service.subcategory_id,
      name: service.name,
      description: service.description,
      requires_license: service.requires_license,
      is_specialty: service.is_specialty,
      indoor_outdoor: service.indoor_outdoor,
      is_active: service.is_active,
      sort_order: service.sort_order,
      created_at: service.created_at,
      updated_at: service.updated_at,
    };
    setSelectedService(serviceObj);
  };

  return (
    <>
      <section className="w-full bg-white" style={{ height: "calc(100vh)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center h-full flex flex-col">
          {/* Content Section - Positioned in the middle */}
          <div className="flex flex-col items-center flex-1 justify-center">
            {/* Main Heading */}
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
              The easiest way to hire with confidence.
            </h1>

            {/* Search Bar */}
            <div className="max-w-6xl mx-auto mb-6">
              <div className="relative flex items-center bg-white border border-gray-200 rounded-lg shadow-sm h-16">
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
                />
                <Button
                  id="search-button"
                  onClick={handleSearch}
                  disabled={!selectedService || !selectedLocation}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 disabled:opacity-50 disabled:cursor-not-allowed h-full "
                >
                  Search
                </Button>
              </div>
            </div>
            <div className="text-sm text-gray-500 font-medium mb-12">
              Trusted by over 4.5M customers with 98% satisfaction rate.
            </div>

            {/* Recent Searches */}
            <div className="mb-12">
              <RecentSearches />
            </div>
          </div>

          {/* Hero Image - Positioned at the bottom */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative">
              <img
                src="/img/2560.webp"
                alt="Professional service providers at work"
                className="w-full h-auto object-cover "
              />
            </div>
          </div>
        </div>
        {/* Full-width divider below the hero image */}
        <div className="w-full border-b border-gray-200" />
      </section>

      {/* Popular Services Near You - Separate Section */}
      <section className="w-full bg-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <PopularServicesNearYou
            selectedLocation={selectedLocation}
            onServiceSelect={handlePopularServiceSelect}
          />
        </div>
      </section>
    </>
  );
}
