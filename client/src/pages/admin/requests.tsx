'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Calendar,
  User,
  MapPin,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { 
  CustomerRequest, 
  Service,
  fetchServiceById,
  listCustomerRequests,
  updateRequestStatus,
  deleteRequest
} from '@/lib/api';

interface RequestFilters {
  status: string;
  search: string;
  dateRange: string;
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [services, setServices] = useState<Map<string, Service>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<RequestFilters>({
    status: 'all',
    search: '',
    dateRange: 'all'
  });
  const [selectedRequest, setSelectedRequest] = useState<CustomerRequest | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [filters]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all requests (admin view)
      const requestsList = await listCustomerRequests({
        limit: 100,
        skip: 0
      });
      
      setRequests(requestsList);

      // Fetch services for each request
      const serviceMap = new Map<string, Service>();
      for (const request of requestsList) {
        if (!serviceMap.has(request.service_id)) {
          try {
            const service = await fetchServiceById(request.service_id);
            serviceMap.set(request.service_id, service);
          } catch (e) {
            console.warn(`Failed to fetch service ${request.service_id}:`, e);
          }
        }
      }
      setServices(serviceMap);
    } catch (e) {
      setError('Failed to load requests');
      console.error('Error fetching requests:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    // Status filter
    if (filters.status !== 'all' && request.status !== filters.status) {
      return false;
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const service = services.get(request.service_id);
      const serviceName = service?.name || '';
      const customerName = `${request.first_name || ''} ${request.last_name || ''}`.trim();
      const email = request.contact_email || '';
      
      if (!serviceName.toLowerCase().includes(searchLower) &&
          !customerName.toLowerCase().includes(searchLower) &&
          !email.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const requestDate = new Date(request.created_at);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (filters.dateRange) {
        case 'today':
          if (daysDiff > 0) return false;
          break;
        case 'week':
          if (daysDiff > 7) return false;
          break;
        case 'month':
          if (daysDiff > 30) return false;
          break;
      }
    }

    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'OPEN':
        return 'bg-blue-100 text-blue-800';
      case 'QUOTED':
        return 'bg-yellow-100 text-yellow-800';
      case 'SHORTLISTED':
        return 'bg-purple-100 text-purple-800';
      case 'ACCEPTED':
        return 'bg-green-100 text-green-800';
      case 'BOOKED':
        return 'bg-emerald-100 text-emerald-800';
      case 'EXPIRED':
        return 'bg-orange-100 text-orange-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return Clock;
      case 'OPEN':
        return AlertCircle;
      case 'QUOTED':
        return Clock;
      case 'SHORTLISTED':
        return AlertCircle;
      case 'ACCEPTED':
        return CheckCircle;
      case 'BOOKED':
        return CheckCircle;
      case 'EXPIRED':
        return XCircle;
      case 'CANCELLED':
        return XCircle;
      default:
        return Clock;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCustomerDisplayName = (request: CustomerRequest) => {
    if (request.first_name && request.last_name) {
      return `${request.first_name} ${request.last_name}`;
    }
    if (request.contact_email) {
      return request.contact_email.split('@')[0];
    }
    return 'Anonymous Customer';
  };

  const handleViewDetails = (request: CustomerRequest) => {
    setSelectedRequest(request);
    setShowDetails(true);
  };

  const handleUpdateStatus = async (newStatus: CustomerRequest['status']) => {
    if (!selectedRequest) return;
    
    try {
      setActionLoading(true);
      await updateRequestStatus(selectedRequest.id, newStatus);
      
      // Update the request in the local state
      setRequests(requests.map(req => 
        req.id === selectedRequest.id ? { ...req, status: newStatus } : req
      ));
      
      setShowStatusModal(false);
      setShowDetails(false);
      setSelectedRequest(null);
    } catch (e) {
      console.error('Error updating request status:', e);
      alert('Failed to update request status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!selectedRequest) return;
    
    try {
      setActionLoading(true);
      const result = await deleteRequest(selectedRequest.id);
      
      // Remove the request from the local state
      setRequests(requests.filter(req => req.id !== selectedRequest.id));
      
      // Show success message with deletion details
      const deletedItems = [];
      if (result.deleted_counts.offers > 0) {
        deletedItems.push(`${result.deleted_counts.offers} offer${result.deleted_counts.offers > 1 ? 's' : ''}`);
      }
      if (result.deleted_counts.message_threads > 0) {
        deletedItems.push(`${result.deleted_counts.message_threads} message thread${result.deleted_counts.message_threads > 1 ? 's' : ''}`);
      }
      if (result.deleted_counts.notifications > 0) {
        deletedItems.push(`${result.deleted_counts.notifications} notification${result.deleted_counts.notifications > 1 ? 's' : ''}`);
      }
      
      const message = deletedItems.length > 0 
        ? `Request deleted successfully. Also removed: ${deletedItems.join(', ')}.`
        : 'Request deleted successfully.';
      
      alert(message);
      
      setShowDeleteModal(false);
      setShowDetails(false);
      setSelectedRequest(null);
    } catch (e) {
      console.error('Error deleting request:', e);
      alert('Failed to delete request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenStatusModal = (request: CustomerRequest) => {
    setSelectedRequest(request);
    setShowStatusModal(true);
  };

  const handleOpenDeleteModal = (request: CustomerRequest) => {
    setSelectedRequest(request);
    setShowDeleteModal(true);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          <span className="ml-2 text-gray-500">Loading requests...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Request Management</h1>
            <p className="text-gray-600">Manage customer requests and their status</p>
          </div>
          <div className="text-sm text-gray-500">
            {filteredRequests.length} of {requests.length} requests
          </div>
        </div>

        {/* Filters */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search requests..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>

            {/* Status Filter */}
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="all">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="OPEN">Open</option>
              <option value="QUOTED">Quoted</option>
              <option value="SHORTLISTED">Shortlisted</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="BOOKED">Booked</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Date Range Filter */}
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>

            {/* Clear Filters */}
            <Button
              variant="outline"
              onClick={() => setFilters({ status: 'all', search: '', dateRange: 'all' })}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="p-6 border-red-200 bg-red-50">
            <div className="flex items-center text-red-800">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          </Card>
        )}

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-gray-500">
              {requests.length === 0 ? 'No requests found' : 'No requests match your filters'}
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => {
              const service = services.get(request.service_id);
              const StatusIcon = getStatusIcon(request.status);
              
              return (
                <Card key={request.id} className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {getCustomerDisplayName(request)}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {service?.name || 'Unknown Service'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        {request.contact_email && (
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4" />
                            <span>{request.contact_email}</span>
                          </div>
                        )}
                        {request.contact_phone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4" />
                            <span>{request.contact_phone}</span>
                          </div>
                        )}
                        {request.postal_code && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4" />
                            <span>{request.postal_code}</span>
                          </div>
                        )}
                      </div>

                      {request.message_to_pro && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-md">
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {request.message_to_pro}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="flex items-center space-x-2 mb-2">
                          <StatusIcon className="h-4 w-4 text-gray-400" />
                          <Badge className={getStatusColor(request.status)}>
                            {request.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(request.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(request)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenStatusModal(request)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDeleteModal(request)}
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Request Details Dialog */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Request Details</DialogTitle>
              <DialogDescription>
                Complete information about this customer request
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-6">
                {/* Customer Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Customer Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Name</label>
                      <p className="text-gray-900">
                        {selectedRequest.first_name && selectedRequest.last_name
                          ? `${selectedRequest.first_name} ${selectedRequest.last_name}`
                          : 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Email</label>
                      <p className="text-gray-900">{selectedRequest.contact_email || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Phone</label>
                      <p className="text-gray-900">{selectedRequest.contact_phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Postal Code</label>
                      <p className="text-gray-900">{selectedRequest.postal_code || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Service Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Service Information</h3>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-900">
                      {services.get(selectedRequest.service_id)?.name || 'Unknown Service'}
                    </p>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Status</h3>
                  <Badge className={getStatusColor(selectedRequest.status)}>
                    {selectedRequest.status}
                  </Badge>
                </div>

                {/* Message */}
                {selectedRequest.message_to_pro && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Message to Professional</h3>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">{selectedRequest.message_to_pro}</p>
                    </div>
                  </div>
                )}

                {/* Answers */}
                {selectedRequest.answers && Object.keys(selectedRequest.answers).length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Request Answers</h3>
                    <div className="space-y-3">
                      {Object.entries(selectedRequest.answers).map(([key, value]) => (
                        <div key={key} className="p-3 bg-gray-50 rounded-lg">
                          <label className="text-sm font-medium text-gray-600 capitalize">
                            {key.replace(/_/g, ' ')}
                          </label>
                          <p className="text-gray-900 mt-1">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Timestamps</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Created</label>
                      <p className="text-gray-900">{formatDate(selectedRequest.created_at)}</p>
                    </div>
                    {selectedRequest.updated_at && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Last Updated</label>
                        <p className="text-gray-900">{formatDate(selectedRequest.updated_at)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Status Update Dialog */}
        <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Update Request Status</DialogTitle>
              <DialogDescription>
                Change the status of this customer request
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Current Status</label>
                  <div className="mt-2">
                    <Badge className={getStatusColor(selectedRequest.status)}>
                      {selectedRequest.status}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 mb-2 block">New Status</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    defaultValue={selectedRequest.status}
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="OPEN">Open</option>
                    <option value="QUOTED">Quoted</option>
                    <option value="SHORTLISTED">Shortlisted</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="BOOKED">Booked</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowStatusModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const select = document.querySelector('select') as HTMLSelectElement;
                  const newStatus = select.value as CustomerRequest['status'];
                  handleUpdateStatus(newStatus);
                }}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Update Status'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Request</DialogTitle>
              <DialogDescription>
                This action cannot be undone. All associated data will be permanently deleted.
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center text-red-800">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span className="font-medium">Warning: Cascade Deletion</span>
                  </div>
                  <p className="text-red-700 mt-2">
                    The request and ALL associated data will be permanently deleted, including:
                  </p>
                  <ul className="text-red-700 mt-2 ml-4 list-disc">
                    <li>All offers sent for this request</li>
                    <li>All message threads and messages</li>
                    <li>All notifications related to this request</li>
                    <li>Request availability information</li>
                  </ul>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Request Details</label>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-900">
                      <strong>Customer:</strong> {getCustomerDisplayName(selectedRequest)}
                    </p>
                    <p className="text-gray-900">
                      <strong>Service:</strong> {services.get(selectedRequest.service_id)?.name || 'Unknown'}
                    </p>
                    <p className="text-gray-900">
                      <strong>Status:</strong> {selectedRequest.status}
                    </p>
                    <p className="text-gray-900">
                      <strong>Created:</strong> {formatDate(selectedRequest.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteRequest}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Delete Request'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
