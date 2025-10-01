'use client';

import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Category, CategoryWithSubcategories, fetchAllCategoriesWithSubcategories } from '@/lib/api';

interface EditServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServiceUpdated: (service: any) => void;
  service: any; // The service to edit
}

interface ServiceFormData {
  name: string;
  description: string;
  category_id: string;
  subcategory_id: string;
  requires_license: boolean;
  is_specialty: boolean;
  indoor_outdoor: 'indoor' | 'outdoor' | 'both';
  is_active: boolean;
  sort_order: number;
}

export default function EditServiceModal({ isOpen, onClose, onServiceUpdated, service }: EditServiceModalProps) {
  const [categories, setCategories] = useState<CategoryWithSubcategories[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    description: '',
    category_id: '',
    subcategory_id: '',
    requires_license: false,
    is_specialty: false,
    indoor_outdoor: 'both',
    is_active: true,
    sort_order: 0
  });

  useEffect(() => {
    if (isOpen && service) {
      // Initialize form with service data
      setFormData({
        name: service.name || '',
        description: service.description || '',
        category_id: service.category_id || '',
        subcategory_id: service.subcategory_id || '',
        requires_license: service.requires_license || false,
        is_specialty: service.is_specialty || false,
        indoor_outdoor: service.indoor_outdoor || 'both',
        is_active: service.is_active !== undefined ? service.is_active : true,
        sort_order: service.sort_order || 0
      });
      
      fetchCategories();
    }
  }, [isOpen, service]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const categoriesWithSubcategories = await fetchAllCategoriesWithSubcategories();
      setCategories(categoriesWithSubcategories);
      console.log('Categories loaded for edit:', categoriesWithSubcategories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ServiceFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCategoryChange = (categoryId: string) => {
    console.log('Category changed to:', categoryId);
    const selectedCat = categories.find(cat => cat.id === categoryId);
    console.log('Selected category data:', selectedCat);
    console.log('Subcategories in selected category:', selectedCat?.subcategories);
    
    setFormData(prev => ({
      ...prev,
      category_id: categoryId,
      subcategory_id: '' // Reset subcategory when category changes
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.category_id || !formData.subcategory_id) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`http://localhost:8000/services/${service.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedService = await response.json();
        onServiceUpdated(updatedService);
        onClose();
      } else {
        const error = await response.json();
        alert(`Error updating service: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to update service:', error);
      alert('Failed to update service. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategory = categories.find(cat => cat.id === formData.category_id);
  const availableSubcategories = selectedCategory?.subcategories || [];
  
  console.log('Selected category:', selectedCategory);
  console.log('Available subcategories:', availableSubcategories);

  if (!isOpen || !service) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Edit Service</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Service Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter service name"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter service description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              {loading ? (
                <div className="text-gray-500">Loading categories...</div>
              ) : (
                <select
                  value={formData.category_id}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Subcategory Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subcategory *
              </label>
              <select
                value={formData.subcategory_id}
                onChange={(e) => handleInputChange('subcategory_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={!formData.category_id}
              >
                <option value="">Select a subcategory</option>
                {availableSubcategories.length > 0 ? (
                  availableSubcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No subcategories available</option>
                )}
              </select>
            </div>

            {/* Service Properties */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* License Required */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Required
                </label>
                <select
                  value={formData.requires_license.toString()}
                  onChange={(e) => handleInputChange('requires_license', e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>

              {/* Specialty Service */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specialty Service
                </label>
                <select
                  value={formData.is_specialty.toString()}
                  onChange={(e) => handleInputChange('is_specialty', e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>

              {/* Indoor/Outdoor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location Type
                </label>
                <select
                  value={formData.indoor_outdoor}
                  onChange={(e) => handleInputChange('indoor_outdoor', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="both">Both</option>
                  <option value="indoor">Indoor Only</option>
                  <option value="outdoor">Outdoor Only</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort Order
                </label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => handleInputChange('sort_order', parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.is_active.toString()}
                onChange={(e) => handleInputChange('is_active', e.target.value === 'true')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex items-center space-x-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Update Service</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
