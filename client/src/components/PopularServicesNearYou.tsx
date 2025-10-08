"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  LuTrendingUp,
  LuMapPin,
  LuStar,
  LuSparkles,
  LuWrench,
  LuZap,
  LuPalette,
  LuSprout,
  LuDroplets,
  LuPlug,
  LuWind,
  LuBuilding,
  LuHammer,
  LuLightbulb,
  LuBrush,
  LuTreePine,
  LuSprayCan,
  LuMonitor,
  LuSun,
  LuSettings,
  LuShield,
  LuHeart,
} from "react-icons/lu";
import { ServiceExplore, LocationSearchResult } from "@/lib/api";
import { fetchExploreServices } from "@/lib/api";

interface PopularServicesNearYouProps {
  selectedLocation?: LocationSearchResult | null;
  onServiceSelect?: (service: ServiceExplore) => void;
}

export default function PopularServicesNearYou({
  selectedLocation,
  onServiceSelect,
}: PopularServicesNearYouProps) {
  const router = useRouter();
  const [popularServices, setPopularServices] = useState<ServiceExplore[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock popular services data - in a real app, this would come from analytics
  const mockPopularServices = [
    {
      name: "House Cleaning",
      category: "Home Services",
      icon: LuBuilding,
      trending: true,
    },
    {
      name: "Plumbing Repair",
      category: "Home Services",
      icon: LuWrench,
      trending: true,
    },
    {
      name: "Electrical Work",
      category: "Home Services",
      icon: LuLightbulb,
      trending: false,
    },
    {
      name: "Painting",
      category: "Home Services",
      icon: LuBrush,
      trending: true,
    },
    {
      name: "Garden Maintenance",
      category: "Outdoor Services",
      icon: LuTreePine,
      trending: false,
    },
    {
      name: "Carpet Cleaning",
      category: "Home Services",
      icon: LuSprayCan,
      trending: true,
    },
    {
      name: "Appliance Repair",
      category: "Home Services",
      icon: LuMonitor,
      trending: false,
    },
    {
      name: "Window Cleaning",
      category: "Home Services",
      icon: LuSun,
      trending: false,
    },
  ];

  useEffect(() => {
    const fetchPopularServices = async () => {
      try {
        setLoading(true);
        // Fetch a limited set of services to show as popular
        const services = await fetchExploreServices({
          limit: 8,
          is_active: true,
        });

        // If we have services from API, use them, otherwise use mock data
        if (services && services.length > 0) {
          setPopularServices(services.slice(0, 8));
        } else {
          // Convert mock data to ServiceExplore format
          const mockServices: ServiceExplore[] = mockPopularServices.map(
            (service, index) => ({
              id: `mock-${index}`,
              category_id: "1",
              subcategory_id: "1",
              category_name: service.category,
              subcategory_name: "General",
              name: service.name,
              description: `Professional ${service.name.toLowerCase()} services`,
              requires_license: false,
              is_specialty: false,
              indoor_outdoor: "indoor",
              is_active: true,
              sort_order: index,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }),
          );
          setPopularServices(mockServices);
        }
      } catch (error) {
        console.error("Error fetching popular services:", error);
        // Fallback to mock data
        const mockServices: ServiceExplore[] = mockPopularServices.map(
          (service, index) => ({
            id: `mock-${index}`,
            category_id: "1",
            subcategory_id: "1",
            category_name: service.category,
            subcategory_name: "General",
            name: service.name,
            description: `Professional ${service.name.toLowerCase()} services`,
            requires_license: false,
            is_specialty: false,
            indoor_outdoor: "indoor",
            is_active: true,
            sort_order: index,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        );
        setPopularServices(mockServices);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularServices();
  }, []);

  const handleServiceClick = (service: ServiceExplore) => {
    if (onServiceSelect) {
      onServiceSelect(service);
    } else if (selectedLocation) {
      // Navigate directly to results if location is selected
      router.push(
        `/instant-results/service_pk=${service.id}&place_pk=${selectedLocation.id}&place_type=${selectedLocation.type}`,
      );
    } else {
      // Just populate the service in the search form
      // This would be handled by the parent component
    }
  };

  const getServiceIcon = (serviceName: string) => {
    const name = serviceName.toLowerCase();

    // Comprehensive icon mapping with keyword matching
    if (name.includes("clean") || name.includes("cleaning")) {
      if (name.includes("carpet") || name.includes("floor")) return LuSprayCan;
      if (name.includes("window")) return LuSun;
      return LuBuilding;
    }

    if (
      name.includes("plumb") ||
      name.includes("pipe") ||
      name.includes("water")
    ) {
      return LuWrench;
    }

    if (
      name.includes("electric") ||
      name.includes("electrical") ||
      name.includes("light") ||
      name.includes("power")
    ) {
      return LuLightbulb;
    }

    if (
      name.includes("paint") ||
      name.includes("painting") ||
      name.includes("color")
    ) {
      return LuBrush;
    }

    if (
      name.includes("garden") ||
      name.includes("landscape") ||
      name.includes("tree") ||
      name.includes("outdoor")
    ) {
      return LuTreePine;
    }

    if (
      name.includes("appliance") ||
      name.includes("repair") ||
      name.includes("fix")
    ) {
      return LuHammer;
    }

    if (name.includes("maintenance") || name.includes("service")) {
      return LuSettings;
    }

    if (name.includes("security") || name.includes("safety")) {
      return LuShield;
    }

    if (name.includes("health") || name.includes("care")) {
      return LuHeart;
    }

    // Fallback icons - cycle through different ones based on service name hash
    const fallbackIcons = [
      LuSparkles,
      LuHammer,
      LuSettings,
      LuShield,
      LuHeart,
      LuBuilding,
      LuWrench,
      LuLightbulb,
    ];
    const hash = serviceName.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
    return fallbackIcons[hash % fallbackIcons.length];
  };

  const isTrending = (serviceName: string) => {
    const trendingServices = [
      "House Cleaning",
      "Plumbing Repair",
      "Painting",
      "Carpet Cleaning",
    ];
    return trendingServices.includes(serviceName);
  };

  if (loading) {
    return (
      <div className="w-full ">
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
            <LuTrendingUp className="w-4 h-4 mr-2 text-gray-500" />
            Popular services near you
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mt-12">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          Popular services near{" "}
          <span className="text-primary ml-2">Budapest</span>
          {selectedLocation && (
            <span className="text-xs text-gray-500 ml-2">
              in {selectedLocation.name}
            </span>
          )}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {popularServices.map((service) => (
            <button
              key={service.id}
              onClick={() => handleServiceClick(service)}
              className="group relative p-3 py-8 bg-white border border-gray-200 rounded-lg hover:shadow-md hover:border-blue-300 transition-all duration-200 text-left"
            >
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-2">
                  <div className="w-8 h-8 flex items-center justify-center">
                    {(() => {
                      const IconComponent = getServiceIcon(service.name);
                      return <IconComponent className="w-6 h-6 text-primary" />;
                    })()}
                  </div>
                  {/* {isTrending(service.name) && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center">
                      <LuStar className="w-2 h-2 text-white fill-current" />
                    </div>
                  )} */}
                </div>
                <div className="w-full">
                  <p className="text-sm font-medium text-gray-900 truncate mb-1">
                    {service.name}
                  </p>
                  {/* <p className="text-xs text-gray-500 truncate">
                    {service.category_name}
                  </p> */}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
