"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { LuChevronRight } from "react-icons/lu";
import { PopoverContent } from "@/components/ui/popover";
import {
  fetchExploreServices,
  searchLocations,
  type LocationSearchResult,
  type ServiceExplore,
} from "@/lib/api";

export default function ServicesPopover() {
  const router = useRouter();
  const [exploreServices, setExploreServices] = useState<ServiceExplore[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoveredSubcategory, setHoveredSubcategory] = useState<string | null>(
    null,
  );
  const [budapestId, setBudapestId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchExploreServices();
        if (active) setExploreServices(data);
      } catch {
        if (active) setExploreServices([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      if (budapestId) return;
      try {
        const results: LocationSearchResult[] = await searchLocations(
          "Budapest",
          1,
        );
        if (results && results.length > 0) setBudapestId(results[0].id);
      } catch {
        // ignore; instant-results will fallback
      }
    })();
  }, [budapestId]);

  const grouped = useMemo(() => {
    return exploreServices.reduce(
      (acc, service) => {
        const ckey = `${service.category_id}-${service.category_name}`;
        const skey = `${service.subcategory_id}-${service.subcategory_name}`;
        if (!acc[ckey]) {
          acc[ckey] = {
            id: service.category_id,
            name: service.category_name,
            subcategories: {},
          };
        }
        if (!acc[ckey].subcategories[skey]) {
          acc[ckey].subcategories[skey] = {
            id: service.subcategory_id,
            name: service.subcategory_name,
            services: [],
          };
        }
        acc[ckey].subcategories[skey].services.push(service);
        return acc;
      },
      {} as Record<
        string,
        {
          id: string;
          name: string;
          subcategories: Record<
            string,
            { id: string; name: string; services: ServiceExplore[] }
          >;
        }
      >,
    );
  }, [exploreServices]);

  const hoveredServices = useMemo(() => {
    if (!hoveredSubcategory) return [] as ServiceExplore[];
    return Object.values(grouped)
      .flatMap((cat) => Object.values(cat.subcategories))
      .find((sub) => sub.id === hoveredSubcategory)?.services || [];
  }, [grouped, hoveredSubcategory]);

  return (
    <PopoverContent className="w-[600px] h-[500px] p-0" align="start">
      <div className="flex h-full">
        <div className="flex-1 border-r border-gray-200 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading...</div>
          ) : (
            <div className="py-4">
              {Object.values(grouped).map((category, categoryIndex) => (
                <div key={category.id}>
                  <div className="px-6 py-3">
                    <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wide">
                      {category.name}
                    </h3>
                  </div>
                  <div className="space-y-0">
                    {Object.values(category.subcategories).map((subcategory) => (
                      <div
                        key={subcategory.id}
                        className="px-6 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between group transition-colors duration-150"
                        onMouseEnter={() => setHoveredSubcategory(subcategory.id)}
                      >
                        <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors duration-150">
                          {subcategory.name}
                        </span>
                        <LuChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors duration-150" />
                      </div>
                    ))}
                  </div>
                  {categoryIndex < Object.values(grouped).length - 1 && (
                    <div className="border-t border-gray-200 my-3"></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {hoveredSubcategory ? (
            <div className="p-6">
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
                            const results = await searchLocations("Budapest", 1);
                            cityId = results && results[0] ? results[0].id : null;
                            if (cityId) setBudapestId(cityId);
                          }
                          let url = `/instant-results/service_pk=${service.id}`;
                          if (cityId) {
                            url += `&place_pk=${cityId}&place_type=city`;
                          }
                          router.push(url);
                        } finally {
                          // Popover will close via outside click or navigation
                        }
                      }}
                    >
                      {service.name}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No services available</div>
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
    </PopoverContent>
  );
}


