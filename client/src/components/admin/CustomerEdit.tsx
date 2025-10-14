'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  ArrowLeft, 
  Save, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  AdminCustomer, 
  fetchAdminCustomer, 
  updateAdminCustomer 
} from '@/lib/api';

interface CustomerEditProps {
  customerId: string;
}

export default function CustomerEdit({ customerId }: CustomerEditProps) {
  const router = useRouter();
  const [customer, setCustomer] = useState<AdminCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    firebase_uid: '',
  });

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await fetchAdminCustomer(customerId);
      setCustomer(data);
      setFormData({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        firebase_uid: data.firebase_uid || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [customerId]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Prepare update payload (only include changed fields)
      const updatePayload: any = {};
      if (formData.first_name !== customer?.first_name) {
        updatePayload.first_name = formData.first_name;
      }
      if (formData.last_name !== customer?.last_name) {
        updatePayload.last_name = formData.last_name;
      }
      if (formData.email !== customer?.email) {
        updatePayload.email = formData.email;
      }
      if (formData.firebase_uid !== (customer?.firebase_uid || '')) {
        updatePayload.firebase_uid = formData.firebase_uid || null;
      }
      
      await updateAdminCustomer(customerId, updatePayload);
      
      // Redirect to customer detail page
      router.push(`/admin/customers/${customerId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/admin/customers/${customerId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading customer...</span>
      </div>
    );
  }

  if (error && !customer) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <div className="text-red-600 mb-2">Error loading customer</div>
        <div className="text-sm text-gray-500">{error}</div>
        <Button onClick={fetchCustomer} variant="outline" size="sm" className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Customer</h1>
            <p className="text-gray-600">
              {customer?.first_name} {customer?.last_name}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleCancel} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                placeholder="Enter first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                placeholder="Enter last name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter email address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="firebase_uid">Firebase UID</Label>
            <Input
              id="firebase_uid"
              value={formData.firebase_uid}
              onChange={(e) => handleInputChange('firebase_uid', e.target.value)}
              placeholder="Enter Firebase UID (optional)"
            />
            <p className="text-sm text-gray-500">
              Leave empty to unlink from Firebase authentication
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Read-only Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-500">Customer ID</Label>
              <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                {customer?.id}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Created At</Label>
              <p className="text-sm">
                {customer?.created_at ? new Date(customer.created_at).toLocaleString() : 'N/A'}
              </p>
            </div>
            {customer?.updated_at && (
              <div>
                <Label className="text-sm font-medium text-gray-500">Last Updated</Label>
                <p className="text-sm">
                  {new Date(customer.updated_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
