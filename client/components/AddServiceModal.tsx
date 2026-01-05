"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { API_BASE_URL } from "@/lib/api/config";
import { useI18n } from "@/lib/contexts/I18nContext";

interface Category {
  id: number;
  name: string;
  services: Service[];
}

interface Service {
  id: number;
  name: string;
  category_id: number;
}

interface AddServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onServiceAdded: () => void;
  userId: string;
  existingServiceIds: number[];
}

export function AddServiceModal({ open, onOpenChange, onServiceAdded, userId, existingServiceIds }: AddServiceModalProps) {
  const { language } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedServices, setSelectedServices] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/categories/with-services?skip=0&limit=100&language=${language}`);
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchCategories();
    }
  }, [open]);

  const handleToggleService = (serviceId: number) => {
    setSelectedServices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Combine existing services with newly selected ones
      const allServiceIds = [...existingServiceIds, ...Array.from(selectedServices)];

      console.log('Sending service IDs:', allServiceIds);
      console.log('User ID:', userId);

      const response = await fetch(`${API_BASE_URL}/api/v1/pro-services/user/${userId}/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(allServiceIds),
      });

      if (response.ok) {
        onServiceAdded();
        onOpenChange(false);
        setSelectedServices(new Set());
      } else {
        const errorText = await response.text();
        console.error("Failed to add services. Status:", response.status);
        console.error("Error response:", errorText);
        alert("Failed to add services. Please try again.");
      }
    } catch (error) {
      console.error("Failed to add services:", error);
      alert("Failed to add services. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Filter out services that are already added, then apply category and search filters
  const availableCategories = categories
    .filter(category => selectedCategory === "all" || category.id.toString() === selectedCategory)
    .map(category => ({
      ...category,
      services: (category.services || [])
        .filter(service => !existingServiceIds.includes(service.id))
        .filter(service => 
          searchQuery === "" || 
          service.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }))
    .filter(category => category.services.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0 flex flex-col bg-white">
        <div className="px-6 py-4 border-b border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Add a service</DialogTitle>
          </DialogHeader>

          {/* Filters */}
          <div className="mt-4 space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id.toString()}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search services
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by service name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading services...</p>
            </div>
          ) : availableCategories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">All available services have been added.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {availableCategories.map((category) => (
                <div key={category.id}>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">
                    {category.name}
                  </h3>
                  <div className="space-y-2">
                    {category.services.map((service) => {
                      const isSelected = selectedServices.has(service.id);
                      return (
                        <label
                          key={service.id}
                          className="flex items-center py-3 px-3 hover:bg-gray-50 rounded cursor-pointer border-b border-gray-200"
                        >
                          <div
                            className="w-6 h-6 rounded border-2 flex items-center justify-center mr-3"
                            style={{
                              backgroundColor: isSelected ? "hsl(var(--primary))" : "#ffffff",
                              borderColor: isSelected ? "hsl(var(--primary))" : "#d3d4d5",
                              color: "#ffffff",
                            }}
                          >
                            {isSelected && (
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 18 18"
                                fill="currentColor"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <rect
                                  x="15.232"
                                  y="4.003"
                                  width="11.701"
                                  height="1.879"
                                  rx=".939"
                                  transform="rotate(123 15.232 4.003)"
                                ></rect>
                                <rect
                                  x="8.83"
                                  y="13.822"
                                  width="7.337"
                                  height="1.879"
                                  rx=".939"
                                  transform="rotate(-146 8.83 13.822)"
                                ></rect>
                                <path d="M8.072 13.306l1.03-1.586.787.512-1.03 1.586z"></path>
                              </svg>
                            )}
                          </div>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={isSelected}
                            onChange={() => handleToggleService(service.id)}
                          />
                          <span className="text-base">{service.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-6 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={selectedServices.size === 0 || saving}
            className="px-6 py-2 rounded-lg font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "hsl(var(--primary))",
            }}
          >
            {saving ? "Adding..." : `Add ${selectedServices.size} service${selectedServices.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
