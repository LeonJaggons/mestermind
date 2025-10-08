"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { LuChevronRight } from "react-icons/lu";
import {
  fetchExploreServices,
  ServiceExplore,
  searchLocations,
  type LocationSearchResult,
} from "@/lib/api";

interface ServicesDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  buttonRef?: React.RefObject<HTMLDivElement | null>;
}

export default function ServicesDropdown({
  isOpen,
  onClose,
  buttonRef,
}: ServicesDropdownProps) {
  const router = useRouter();
  const [exploreServices, setExploreServices] = useState<ServiceExplore[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoveredSubcategory, setHoveredSubcategory] = useState<string | null>(
    null,
  );
  const [dropdownPosition, setDropdownPosition] = useState({
    left: 0,
    width: 600,
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [budapestId, setBudapestId] = useState<string | null>(null);

  // Calculate dropdown position
  const calculatePosition = () => {
    if (!buttonRef || !buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const dropdownWidth = Math.min(600, viewportWidth - 32); // 32px for margins

    let left = buttonRect.left;

    // If dropdown would overflow right side, align it to the right edge of button
    if (left + dropdownWidth > viewportWidth - 16) {
      left = buttonRect.right - dropdownWidth;
    }

    // If dropdown would overflow left side, align it to left edge of viewport
    if (left < 16) {
      left = 16;
    }

    setDropdownPosition({ left, width: dropdownWidth });
  };

  // Fetch explore services on component mount
  useEffect(() => {
    const loadExploreServices = async () => {
      try {
        setLoading(true);
        const data = await fetchExploreServices();
        console.log("exploreServices", data);
        setExploreServices(data);
      } catch (error) {
        console.error("Failed to load explore services:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadExploreServices();
    }
  }, [isOpen]);

  // Ensure we have Budapest city id
  useEffect(() => {
    const fetchBudapest = async () => {
      try {
        const results: LocationSearchResult[] = await searchLocations(
          "Budapest",
          1,
        );
        if (results && results.length > 0) {
          setBudapestId(results[0].id);
        }
      } catch {
        // ignore; instant-results will fallback to Budapest center
      }
    };
    if (isOpen && !budapestId) {
      fetchBudapest();
    }
  }, [isOpen, budapestId]);

  // Group services by category and subcategory
  const groupedServices = exploreServices.reduce(
    (acc, service) => {
      const categoryKey = `${service.category_id}-${service.category_name}`;
      const subcategoryKey = `${service.subcategory_id}-${service.subcategory_name}`;

      if (!acc[categoryKey]) {
        acc[categoryKey] = {
          id: service.category_id,
          name: service.category_name,
          subcategories: {},
        };
      }

      if (!acc[categoryKey].subcategories[subcategoryKey]) {
        acc[categoryKey].subcategories[subcategoryKey] = {
          id: service.subcategory_id,
          name: service.subcategory_name,
          services: [],
        };
      }

      acc[categoryKey].subcategories[subcategoryKey].services.push(service);
      return acc;
    },
    {} as Record<
      string,
      {
        id: string;
        name: string;
        subcategories: Record<
          string,
          {
            id: string;
            name: string;
            services: ServiceExplore[];
          }
        >;
      }
    >,
  );

  // Get services for hovered subcategory
  const hoveredServices = hoveredSubcategory
    ? Object.values(groupedServices)
        .flatMap((cat) => Object.values(cat.subcategories))
        .find((sub) => sub.id === hoveredSubcategory)?.services || []
    : [];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Handle window resize and initial positioning
  useEffect(() => {
    if (isOpen) {
      calculatePosition();

      const handleResize = () => {
        calculatePosition();
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden"
      style={{
        top: "64px",
        borderRadius: "0px",
        left: `${dropdownPosition.left}px`,
        width: `${dropdownPosition.width}px`,
        height: "500px",
      }}
    >
      <div className="flex h-full">
        {/* Left Column - Categories and Subcategories */}
        <div className="flex-1 border-r border-gray-200 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading...</div>
          ) : (
            <div className="py-4">
              {Object.values(groupedServices).map((category, categoryIndex) => (
                <div key={category.id}>
                  {/* Category Header */}
                  <div className="px-6 py-3">
                    <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wide">
                      {category.name}
                    </h3>
                  </div>

                  {/* Subcategories */}
                  <div className="space-y-0">
                    {Object.values(category.subcategories).map(
                      (subcategory) => (
                        <div
                          key={subcategory.id}
                          className="px-6 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between group transition-colors duration-150"
                          onMouseEnter={() =>
                            setHoveredSubcategory(subcategory.id)
                          }
                        >
                          <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors duration-150">
                            {subcategory.name}
                          </span>
                          <LuChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors duration-150" />
                        </div>
                      ),
                    )}
                  </div>

                  {/* Separator line between categories */}
                  {categoryIndex <
                    Object.values(groupedServices).length - 1 && (
                    <div className="border-t border-gray-200 my-3"></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Services */}
        <div className="flex-1 overflow-y-auto">
          {hoveredSubcategory ? (
            <div className="p-6">
              {/* <h5 className="font-semibold text-gray-900 mb-4 text-sm sticky top-0 bg-white pb-2 border-b border-gray-100">
                {Object.values(groupedServices)
                  .flatMap(cat => Object.values(cat.subcategories))
                  .find(sub => sub.id === hoveredSubcategory)?.name}
              </h5> */}
              {hoveredServices.length > 0 ? (
                <div className="space-y-3">
                  {hoveredServices.map((service) => (
                    <div
                      key={service.id}
                      className="text-sm text-gray-700 hover:text-gray-900 cursor-pointer py-2 transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                      onClick={async () => {
                        try {
                          let cityId = budapestId;
                          if (!cityId) {
                            const results = await searchLocations(
                              "Budapest",
                              1,
                            );
                            cityId =
                              results && results[0] ? results[0].id : null;
                            if (cityId) setBudapestId(cityId);
                          }
                          // Use the proper URL format: /instant-results/service_pk=...&place_pk=...
                          let url = `/instant-results/service_pk=${service.id}`;
                          if (cityId) {
                            url += `&place_pk=${cityId}&place_type=city`;
                          }
                          router.push(url);
                        } finally {
                          onClose();
                        }
                      }}
                    >
                      {service.name}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  No services available
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 flex items-center justify-center h-full">
              <div className="text-sm text-gray-500 text-center">
                Hover over a subcategory to see available services
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
