import { useState, useEffect, useRef } from 'react';
import { LuMapPin, LuChevronDown } from 'react-icons/lu';
import { searchLocations, LocationSearchResult } from '@/lib/api';

interface LocationSearchProps {
  selectedLocation: LocationSearchResult | null;
  onLocationSelect: (location: LocationSearchResult | null) => void;
  placeholder?: string;
  className?: string;
}

export default function LocationSearch({
  selectedLocation,
  onLocationSelect,
  placeholder = "Enter location...",
  className = "",
}: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize query with selected location
  useEffect(() => {
    if (selectedLocation) {
      setQuery(selectedLocation.name);
    }
  }, [selectedLocation]);

  // Handle search with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const searchResults = await searchLocations(query, 8);
        setResults(searchResults);
        setIsOpen(true);
      } catch (err) {
        setError("Failed to search locations");
        setResults([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Clear selection if user is typing something different
    if (selectedLocation && value !== selectedLocation.name) {
      onLocationSelect(null);
    }
  };

  const handleLocationSelect = (location: LocationSearchResult) => {
    setQuery(location.name);
    onLocationSelect(location);
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    if (results.length > 0) {
      setIsOpen(true);
    }
  };

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

  const getLocationTypeLabel = (type: string) => {
    switch (type) {
      case "district":
        return "District";
      case "city":
        return "City";
      default:
        return type;
    }
  };

  return (
    <div className={`relative ${className} max-w-[180px]`}>
      <div className="relative">
        <div className="flex items-center px-4 border-l border-gray-200 h-full">
          <LuMapPin className="w-5 h-5 text-gray-400 mr-2" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder={placeholder}
            className="text-md text-gray-600 bg-transparent border-0 outline-none w-full min-w-[50px] h-full"
          />
          <LuChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
        >
          {isLoading && (
            <div className="px-4 py-3 text-gray-500 text-sm">Searching...</div>
          )}

          {error && (
            <div className="px-4 py-3 text-red-500 text-sm">{error}</div>
          )}

          {!isLoading &&
            !error &&
            results.length === 0 &&
            query.length >= 2 && (
              <div className="px-4 py-3 text-gray-500 text-sm">
                No locations found
              </div>
            )}

          {results.map((location) => (
            <button
              key={`${location.type}-${location.id}`}
              onClick={() => handleLocationSelect(location)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">
                    {formatLocationDisplay(location)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {getLocationTypeLabel(location.type)}
                  </div>
                </div>
                {/* no postal code chip */}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
