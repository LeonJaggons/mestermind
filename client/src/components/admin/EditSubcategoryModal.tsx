'use client';

import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EditSubcategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubcategoryUpdated: (subcategory: any) => void;
  subcategory: {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    is_active: boolean;
    sort_order: number;
    category_id: string;
  } | null;
  categoryName: string;
}

interface SubcategoryFormData {
  name: string;
  description: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
}

export default function EditSubcategoryModal({ 
  isOpen, 
  onClose, 
  onSubcategoryUpdated, 
  subcategory,
  categoryName 
}: EditSubcategoryModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<SubcategoryFormData>({
    name: '',
    description: '',
    icon: '',
    is_active: true,
    sort_order: 0
  });

  // Update form data when subcategory prop changes
  useEffect(() => {
    if (subcategory) {
      setFormData({
        name: subcategory.name,
        description: subcategory.description || '',
        icon: subcategory.icon || '',
        is_active: subcategory.is_active,
        sort_order: subcategory.sort_order
      });
    }
  }, [subcategory]);

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

    if (!subcategory) {
      alert('No subcategory selected for editing');
      return;
    }

    try {
      setSubmitting(true);
      console.log('Updating subcategory with data:', formData);
      
      const response = await fetch(`http://localhost:8000/categories/subcategories/${subcategory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedSubcategory = await response.json();
        onSubcategoryUpdated(updatedSubcategory);
        onClose();
      } else {
        const error = await response.json();
        console.error('Subcategory update error:', error);
        alert(`Error updating subcategory: ${error.detail || error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to update subcategory:', error);
      alert('Failed to update subcategory. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !subcategory) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Subcategory</DialogTitle>
          <DialogDescription>
            Update subcategory under: {categoryName}
          </DialogDescription>
        </DialogHeader>

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
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Update Subcategory</span>
                  </>
                )}
              </Button>
            </div>
          </form>
      </DialogContent>
    </Dialog>
  );
}
