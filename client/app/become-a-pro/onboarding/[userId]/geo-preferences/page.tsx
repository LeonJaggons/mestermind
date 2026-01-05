"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_BASE_URL } from "@/lib/api/config";

interface City {
  id: number;
  name: string;
  state: string;
}

export default function GeoPreferencesPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const router = useRouter();
  const { userId } = use(params);
  const [distance, setDistance] = useState(50);
  const [selectedCities, setSelectedCities] = useState<City[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<City[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Search cities from API
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchCities = async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/cities/search?query=${encodeURIComponent(searchQuery)}`
        );
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data);
        }
      } catch (error) {
        console.error("Error searching cities:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchCities, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleAddCity = (city: City) => {
    if (!selectedCities.find((c) => c.id === city.id)) {
      setSelectedCities([...selectedCities, city]);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleRemoveCity = (cityId: number) => {
    setSelectedCities(selectedCities.filter((c) => c.id !== cityId));
  };

  const handleNext = async () => {
    // Save geo preferences and mark onboarding as completed
    try {
      const cityIds = selectedCities.map((city) => city.id);
      
      const response = await fetch(`${API_BASE_URL}/api/v1/pro-profiles/user/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service_distance: distance,
          service_cities: cityIds,
          onboarding_completed: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save geo preferences");
      }

      // Update user role to 'mester' when onboarding is completed
      try {
        // First get the user to find their ID
        const userResponse = await fetch(`${API_BASE_URL}/api/v1/users/firebase/${userId}`);
        if (userResponse.ok) {
          const userData = await userResponse.json();
          // Update user role to mester
          await fetch(`${API_BASE_URL}/api/v1/users/${userData.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: userData.email,
              role: "mester",
              firebase_uid: userData.firebase_uid,
            }),
          });
        }
      } catch (error) {
        console.error("Failed to update user role:", error);
        // Don't block onboarding completion if role update fails
      }

      // Onboarding complete - redirect to pro jobs page
      router.push("/pro/jobs");
    } catch (error) {
      console.error("Error saving geo preferences:", error);
      alert("Failed to save geo preferences. Please try again.");
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <>
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 h-1">
        <div className="bg-[hsl(var(--primary))] h-1" style={{ width: "87.5%" }}></div>
      </div>

      {/* Main Content */}
      <div className="bg-white flex-1 pb-24">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Choose where you work.</h1>
            <p className="text-gray-600">
              You'll auto-pay for leads in these areas when they match your preferences. You can fine-tune this later.
            </p>
          </div>

          {/* Distance Selector */}
          <div className="mb-8">
            <div className="mb-4">
              <p className="text-base font-semibold mb-2">Select by distance</p>
              <p className="text-sm text-gray-600">
                Set the max distance from your business you want to work.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-300 rounded-lg p-6">
              <p className="text-base mb-4">
                <strong>{distance} miles</strong> from business location
              </p>
              <div className="mt-2">
                <input
                  type="range"
                  min="1"
                  max="150"
                  value={distance}
                  onChange={(e) => setDistance(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${((distance - 1) / 149) * 100}%, #e5e7eb ${((distance - 1) / 149) * 100}%, #e5e7eb 100%)`,
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>1 mile</span>
                  <span>150 miles</span>
                </div>
              </div>
            </div>
          </div>

          {/* City Selection */}
          <div className="mb-8">
            <div className="mb-4">
              <p className="text-base font-semibold mb-2">Add specific cities</p>
              <p className="text-sm text-gray-600">
                Select cities where you want to receive leads.
              </p>
            </div>

            {/* City Search */}
            <div className="relative mb-4">
              <Input
                type="text"
                placeholder="Search for a city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12"
              />
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-lg">
                  {searchResults.map((city) => (
                    <button
                      key={city.id}
                      onClick={() => handleAddCity(city)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-200 last:border-b-0"
                    >
                      <p className="text-sm font-medium">{city.name}, {city.state}</p>
                    </button>
                  ))}
                </div>
              )}
              {isSearching && (
                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 px-4 py-3 shadow-lg">
                  <p className="text-sm text-gray-500">Searching...</p>
                </div>
              )}
            </div>

            {/* Selected Cities */}
            {selectedCities.length > 0 && (
              <div className="border border-gray-300 rounded-lg p-4">
                <p className="text-sm font-semibold mb-3">Selected cities:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedCities.map((city) => (
                    <div
                      key={city.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full"
                    >
                      <span className="text-sm">
                        {city.name}, {city.state}
                      </span>
                      <button
                        onClick={() => handleRemoveCity(city.id)}
                        className="text-gray-500 hover:text-gray-700"
                        aria-label={`Remove ${city.name}`}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="currentColor"
                        >
                          <path d="M14 1.41L12.59 0L7 5.59L1.41 0L0 1.41L5.59 7L0 12.59L1.41 14L7 8.41L12.59 14L14 12.59L8.41 7L14 1.41Z" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Non-discrimination policy */}
          <div className="text-center my-8 py-6 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">
              <p className="mb-2">We embrace our diverse community of pros and customers.</p>
              <p>
                Please{" "}
                <a
                  href="https://help.mestermind.com/non-discrimination"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[hsl(var(--primary))] hover:underline"
                >
                  review our non-discrimination policy.
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Action Bar */}
      <div className="w-full bg-white z-10 fixed left-0 bottom-0 border-t border-gray-300">
        <div className="flex flex-wrap justify-center max-w-[1200px] mx-auto py-2 px-3">
          <div className="w-full min-h-[60px]">
            <div className="flex justify-between items-center relative w-full px-3 py-2">
              <button
                className="px-8 py-3 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition-colors"
                onClick={handleBack}
              >
                Back
              </button>
              <button
                className="px-8 py-3 rounded-lg font-semibold text-white transition-colors"
                style={{
                  backgroundColor: "hsl(var(--primary))",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                onClick={handleNext}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
