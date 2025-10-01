'use client';

import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CreateSubcategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubcategoryCreated: (subcategory: any) => void;
  categoryId: string;
  categoryName: string;
}

interface SubcategoryFormData {
  name: string;
  description: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
}

export default function CreateSubcategoryModal({ 
  isOpen, 
  onClose, 
  onSubcategoryCreated, 
  categoryId, 
  categoryName 
}: CreateSubcategoryModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<SubcategoryFormData>({
    name: '',
    description: '',
    icon: '',
    is_active: true,
    sort_order: 0
  });

  const handleInputChange = (field: keyof SubcategoryFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Please enter a subcategory name');
      return;
    }

    try {
      setSubmitting(true);
      const requestData = {
        ...formData,
        category_id: categoryId
      };
      console.log('Creating subcategory with data:', requestData);
      
      const response = await fetch(`http://localhost:8000/categories/${categoryId}/subcategories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const newSubcategory = await response.json();
        onSubcategoryCreated(newSubcategory);
        onClose();
        // Reset form
        setFormData({
          name: '',
          description: '',
          icon: '',
          is_active: true,
          sort_order: 0
        });
      } else {
        const error = await response.json();
        console.error('Subcategory creation error:', error);
        alert(`Error creating subcategory: ${error.detail || error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create subcategory:', error);
      alert('Failed to create subcategory. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Create New Subcategory</h2>
              <p className="text-sm text-gray-600 mt-1">Under category: {categoryName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Subcategory Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subcategory Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter subcategory name"
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
                placeholder="Enter subcategory description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Icon */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Icon
              </label>
              <Input
                value={formData.icon}
                onChange={(e) => handleInputChange('icon', e.target.value)}
                placeholder="Enter icon name or URL"
              />
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
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Create Subcategory</span>
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
