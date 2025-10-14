"use client";

import { useState, useEffect } from 'react';
import { searchLocations, LocationSearchResult } from '@/lib/api';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface LocationSearchProps {
  selectedLocation: LocationSearchResult | null;
  onLocationSelect: (location: LocationSearchResult | null) => void;
  placeholder?: string;
  className?: string;
  compact?: boolean;
}

export default function LocationSearch({
  selectedLocation,
  onLocationSelect,
  placeholder = "Enter location...",
  className = "",
  compact = false,
}: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize query with selected location
  useEffect(() => {
    if (selectedLocation) {
      setQuery(selectedLocation.name);
    }
  }, [selectedLocation]);

  // Handle search with debouncing
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);

    timeout = setTimeout(async () => {
      try {
        const searchResults = await searchLocations(query, 8);
        setResults(searchResults);
      } catch (err) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
    };
  }, [query]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setOpen(true);

    // Clear selection if user is typing something different
    if (selectedLocation && value !== selectedLocation.name) {
      onLocationSelect(null);
    }
  };

  const handleLocationSelect = (location: LocationSearchResult) => {
    setQuery(location.name);
    onLocationSelect(location);
    setOpen(false);
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative w-full sm:max-w-[180px]", className)}>
          <Input
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => {
              if (results.length > 0) setOpen(true);
            }}
            placeholder={placeholder}
            className={cn(
              "text-md text-gray-800 bg-transparent border-0 outline-none w-full min-w-[50px] focus-visible:ring-0",
              compact ? 'h-full py-2 px-3 text-sm' : 'min-h-16'
            )}
            style={{ fontSize: "16px" }}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList>
            {loading && (
              <CommandEmpty>Searching...</CommandEmpty>
            )}
            {!loading && results.length === 0 && query.length >= 2 && (
              <CommandEmpty>No locations found</CommandEmpty>
            )}
            {!loading && results.length > 0 && (
              <CommandGroup>
                {results.map((location) => (
                  <CommandItem
                    key={`${location.type}-${location.id}`}
                    value={`${location.type}-${location.id}`}
                    onSelect={() => handleLocationSelect(location)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="font-medium text-gray-900">
                          {formatLocationDisplay(location)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {getLocationTypeLabel(location.type)}
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
