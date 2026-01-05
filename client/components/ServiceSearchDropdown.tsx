"use client"

import { useState, useEffect, useRef } from "react"
import { categoriesApi, CategoryWithServices } from "@/lib/api/categories"
import { useI18n } from "@/lib/contexts/I18nContext"

interface Service {
  id: string
  name: string
  name_hu?: string  // Hungarian name for search
  slug: string
  categoryName: string
  categoryNameHu?: string  // Hungarian category name for search
  categorySlug: string
}

interface ServiceSearchDropdownProps {
  searchQuery: string
  isOpen: boolean
  onClose: () => void
  onSelectService: (categorySlug: string, serviceSlug: string, serviceName: string, serviceId: string) => void
}

// Calculate relevance score for a service
// Higher score = better match
function calculateRelevanceScore(service: Service, query: string): number {
  let score = 0
  const queryLower = query.toLowerCase()
  
  // Service name matches (higher priority)
  const serviceNameLower = service.name.toLowerCase()
  if (serviceNameLower === queryLower) {
    score += 1000 // Exact match in service name
  } else if (serviceNameLower.startsWith(queryLower)) {
    score += 500 // Starts with query in service name
  } else if (serviceNameLower.includes(queryLower)) {
    score += 200 // Contains query in service name
  }
  
  // Hungarian service name matches
  if (service.name_hu) {
    const serviceNameHuLower = service.name_hu.toLowerCase()
    if (serviceNameHuLower === queryLower) {
      score += 1000 // Exact match in Hungarian service name
    } else if (serviceNameHuLower.startsWith(queryLower)) {
      score += 500 // Starts with query in Hungarian service name
    } else if (serviceNameHuLower.includes(queryLower)) {
      score += 200 // Contains query in Hungarian service name
    }
  }
  
  // Category name matches (lower priority)
  const categoryNameLower = service.categoryName.toLowerCase()
  if (categoryNameLower === queryLower) {
    score += 100 // Exact match in category name
  } else if (categoryNameLower.startsWith(queryLower)) {
    score += 50 // Starts with query in category name
  } else if (categoryNameLower.includes(queryLower)) {
    score += 20 // Contains query in category name
  }
  
  // Hungarian category name matches
  if (service.categoryNameHu) {
    const categoryNameHuLower = service.categoryNameHu.toLowerCase()
    if (categoryNameHuLower === queryLower) {
      score += 100 // Exact match in Hungarian category name
    } else if (categoryNameHuLower.startsWith(queryLower)) {
      score += 50 // Starts with query in Hungarian category name
    } else if (categoryNameHuLower.includes(queryLower)) {
      score += 20 // Contains query in Hungarian category name
    }
  }
  
  return score
}

export function ServiceSearchDropdown({
  searchQuery,
  isOpen,
  onClose,
  onSelectService,
}: ServiceSearchDropdownProps) {
  const { language } = useI18n()
  const [allServices, setAllServices] = useState<Service[]>([])
  const [filteredServices, setFilteredServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch all services on mount
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const categories = await categoriesApi.getAllWithServices(0, 100, language)
        const services: Service[] = []
        
        categories.forEach((category) => {
          category.services.forEach((service) => {
            services.push({
              id: service.id,
              name: service.name,
              name_hu: service.name_hu,
              slug: service.slug,
              categoryName: category.name,
              categoryNameHu: category.name_hu,
              categorySlug: category.slug,
            })
          })
        })
        
        setAllServices(services)
      } catch (error) {
        console.error("Failed to fetch services:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchServices()
  }, [language])

  // Filter and sort services based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredServices([])
      return
    }

    const query = searchQuery.toLowerCase()
    
    // Filter services that match the query
    const filtered = allServices.filter(
      (service) => {
        // Search in English name
        const matchesEnglish = service.name.toLowerCase().includes(query) ||
          service.categoryName.toLowerCase().includes(query)
        
        // Search in Hungarian name if available
        const matchesHungarian = 
          (service.name_hu && service.name_hu.toLowerCase().includes(query)) ||
          (service.categoryNameHu && service.categoryNameHu.toLowerCase().includes(query))
        
        return matchesEnglish || matchesHungarian
      }
    )
    
    // Sort by relevance score (highest first)
    const sorted = filtered
      .map(service => ({
        service,
        score: calculateRelevanceScore(service, query)
      }))
      .sort((a, b) => b.score - a.score) // Sort descending by score
      .map(item => item.service)
    
    setFilteredServices(sorted.slice(0, 10)) // Limit to 10 results
  }, [searchQuery, allServices])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen || !searchQuery.trim()) {
    return null
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
    >
      {loading ? (
        <div className="p-4 text-center text-gray-500">Loading services...</div>
      ) : filteredServices.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          No services found matching "{searchQuery}"
        </div>
      ) : (
        <div className="py-2">
          {filteredServices.map((service) => (
            <button
              key={service.id}
              onClick={() => {
                onSelectService(service.categorySlug, service.slug, service.name, service.id)
                onClose()
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-gray-900">{service.name}</div>
              <div className="text-sm text-gray-500 mt-1">
                in {service.categoryName}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
