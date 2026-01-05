"use client"

import { useState, useEffect, useRef } from "react"
import { citiesApi, City } from "@/lib/api/cities"

interface CityAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function CityAutocomplete({
  value,
  onChange,
  placeholder = "City",
  className = "",
}: CityAutocompleteProps) {
  const [allCities, setAllCities] = useState<City[]>([])
  const [filteredCities, setFilteredCities] = useState<City[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch all cities on mount
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const cities = await citiesApi.getAll(0, 100)
        setAllCities(cities)
      } catch (error) {
        console.error("Failed to fetch cities:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCities()
  }, [])

  // Filter cities based on input value
  useEffect(() => {
    if (!value.trim()) {
      setFilteredCities([])
      return
    }

    const query = value.toLowerCase()
    const filtered = allCities.filter(
      (city) =>
        city.name.toLowerCase().includes(query) ||
        city.region.toLowerCase().includes(query)
    )
    
    setFilteredCities(filtered.slice(0, 8)) // Limit to 8 results
  }, [value, allCities])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            style={{ color: "hsl(var(--primary))" }}
            height="18"
            width="18"
            fill="currentColor"
            viewBox="0 0 18 18"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M3.002 7.25c0 3.248 4.342 7.756 5.23 8.825l.769.925.769-.926c.888-1.068 5.234-5.553 5.234-8.824C15.004 4.145 13 1 9.001 1c-3.999 0-6 3.145-6 6.25zm1.994 0C4.995 5.135 6.175 3 9 3s4.002 2.135 4.002 4.25c0 1.777-2.177 4.248-4.002 6.59C7.1 11.4 4.996 9.021 4.996 7.25zM8.909 5.5c-.827 0-1.5.673-1.5 1.5s.673 1.5 1.5 1.5 1.5-.673 1.5-1.5-.673-1.5-1.5-1.5z"></path>
          </svg>
        </div>
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          className={className}
        />
      </div>

      {isOpen && value.trim() && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-center text-sm text-gray-500">Loading cities...</div>
          ) : filteredCities.length === 0 ? (
            <div className="p-3 text-center text-sm text-gray-500">
              No cities found
            </div>
          ) : (
            <div>
              {filteredCities.map((city) => (
                <button
                  key={city.id}
                  onClick={() => {
                    onChange(city.name)
                    setIsOpen(false)
                  }}
                  className="w-full text-left px-4 py-2 transition-colors border-b border-gray-100 last:border-b-0"
                  style={{
                    ["--hover-bg" as string]: "hsl(var(--primary) / 0.1)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "hsl(var(--primary) / 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <div className="font-medium text-gray-900 text-sm">{city.name}</div>
                  <div className="text-xs text-gray-500">{city.region}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
