"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { LuClock, LuMapPin, LuWrench } from 'react-icons/lu';
import { LocationSearchResult, Service } from '@/lib/api';
import { saveRecentSearch } from '@/lib/recentSearches';

interface RecentSearch {
  id: string;
  service: Service;
  location: LocationSearchResult;
  timestamp: number;
}

interface RecentSearchesProps {
  onSearchSelect?: (service: Service, location: LocationSearchResult) => void;
}

export default function RecentSearches({
  onSearchSelect,
}: RecentSearchesProps) {
  const router = useRouter();
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  // Refresh recent searches from localStorage
  const refreshRecentSearches = () => {
    const savedSearches = localStorage.getItem("recentSearches");
    if (savedSearches) {
      try {
        const searches = JSON.parse(savedSearches);
        const sortedSearches = searches
          .sort((a: RecentSearch, b: RecentSearch) => b.timestamp - a.timestamp)
          .slice(0, 3);
        setRecentSearches(sortedSearches);
      } catch (error) {
        console.error("Error parsing recent searches:", error);
      }
    }
  };

  // Load recent searches from localStorage on component mount
  useEffect(() => {
    refreshRecentSearches();
  }, []);

  // Handle clicking on a recent search
  const handleSearchClick = (search: RecentSearch) => {
    if (onSearchSelect) {
      onSearchSelect(search.service, search.location);
    } else {
      // Navigate directly to results
      const serviceId = search.service.id;
      const placeId = search.location.id;
      const placeType = search.location.type;
      router.push(
        `/instant-results/service_pk=${serviceId}&place_pk=${placeId}&place_type=${placeType}`,
      );
    }
  };

  // Format location display
  const formatLocationDisplay = (location: LocationSearchResult) => {
    switch (location.type) {
      case "district":
        return `${location.name}, ${location.city_name}`;
      case "city":
        return `${location.name}, ${location.county_name}`;
      default:
        return location.name;
    }
  };

  // Format relative time
  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (recentSearches.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
          Pick up where you left off
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recentSearches.map((search) => (
            <button
              key={search.id}
              onClick={() => handleSearchClick(search)}
              className="group p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 text-left"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                    <LuWrench className="w-7 h-7 text-black" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {search.service.name}
                    </p>
                    <span className="text-xs text-gray-500 ml-2">
                      {formatRelativeTime(search.timestamp)}
                    </span>
                  </div>
                  <div className="flex items-center text-xs text-gray-600">
                    <span className="truncate">
                      {formatLocationDisplay(search.location)}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
