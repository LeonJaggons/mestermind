import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import CreateServiceModal from '@/components/admin/CreateServiceModal';
import EditServiceModal from '@/components/admin/EditServiceModal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Filter,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { Service, ServiceExplore } from '@/lib/api';

export default function AdminServices() {
  const [services, setServices] = useState<ServiceExplore[]>([]);
  const [filteredServices, setFilteredServices] = useState<ServiceExplore[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceExplore | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  
  // Page size options
  const pageSizeOptions = [10, 25, 50, 100];

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const skip = (currentPage - 1) * itemsPerPage;
        const limit = itemsPerPage;
        
        // Build query parameters
        const params = new URLSearchParams({
          skip: skip.toString(),
          limit: limit.toString(),
        });
        
        if (statusFilter !== 'all') {
          params.append('is_active', statusFilter === 'active' ? 'true' : 'false');
        }
        
        if (searchTerm) {
          params.append('search', searchTerm);
        }
        
        const response = await fetch(`http://localhost:8000/services/explore?${params}`);
        const data = await response.json();
        
        setServices(data);
        setFilteredServices(data);
        
        // For now, we'll estimate total items based on current data
        // In a real implementation, you'd get this from the API response headers or a separate count endpoint
        setTotalItems(data.length === itemsPerPage ? currentPage * itemsPerPage + 1 : currentPage * itemsPerPage);
      } catch (error) {
        console.error('Failed to fetch services:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [currentPage, itemsPerPage, statusFilter, searchTerm]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Reset to first page when page size changes
  const handlePageSizeChange = (newPageSize: number) => {
    setItemsPerPage(newPageSize);
    setCurrentPage(1);
  };

  const handleToggleStatus = async (serviceId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`http://localhost:8000/services/${serviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !currentStatus
        }),
      });

      if (response.ok) {
        setServices(services.map(service => 
          service.id === serviceId 
            ? { ...service, is_active: !currentStatus }
            : service
        ));
      }
    } catch (error) {
      console.error('Failed to update service status:', error);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (confirm('Are you sure you want to delete this service?')) {
      try {
        const response = await fetch(`http://localhost:8000/services/${serviceId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setServices(services.filter(service => service.id !== serviceId));
        }
      } catch (error) {
        console.error('Failed to delete service:', error);
      }
    }
  };

  const handleServiceCreated = async (newService: any) => {
    // Refresh the services list to include the new service
    setCurrentPage(1); // Reset to first page
    // The useEffect will automatically refetch with the new page
  };

  const handleEditService = (service: ServiceExplore) => {
    setEditingService(service);
    setShowEditModal(true);
  };

  const handleServiceUpdated = async (updatedService: any) => {
    // Refresh the services list to reflect the updated service
    // The useEffect will automatically refetch with current filters
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading services...</div>
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
            <h1 className="text-2xl font-bold text-gray-900">Services Management</h1>
            <p className="text-gray-600">Manage all services in your marketplace</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add Service</span>
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search services, categories, or subcategories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Services Table */}
        <Card className="overflow-hidden">
          <div className="px-6 pb-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Services ({totalItems > 0 ? totalItems : filteredServices.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subcategory
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    License Required
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{service.name}</div>
                        {service.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {service.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{service.category_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{service.subcategory_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        service.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {service.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {service.requires_license ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="ml-2 text-sm text-gray-900">
                          {service.requires_license ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleStatus(service.id, service.is_active)}
                          className={`p-1 rounded ${
                            service.is_active 
                              ? 'text-red-600 hover:text-red-900' 
                              : 'text-green-600 hover:text-green-900'
                          }`}
                          title={service.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {service.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleEditService(service)}
                          className="p-1 text-gray-600 hover:text-gray-900"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteService(service.id)}
                          className="p-1 text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredServices.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500">No services found</div>
            </div>
          )}
        </Card>

        {/* Pagination */}
        {totalItems > 0 && (
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
              {/* Results Info and Page Size Selector */}
              <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{' '}
                  <span className="font-medium">{totalItems}</span> services
                </div>
                
                {/* Page Size Selector */}
                <div className="flex items-center space-x-2">
                  <label htmlFor="page-size" className="text-sm text-gray-700">
                    Show:
                  </label>
                  <select
                    id="page-size"
                    value={itemsPerPage}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {pageSizeOptions.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-gray-700">per page</span>
                </div>
              </div>
              
              {/* Pagination Controls */}
              {totalItems > itemsPerPage && (
                <div className="flex items-center space-x-1">
                {/* First Page */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                  title="First page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                
                {/* Previous Page */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                  title="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {/* Page Numbers */}
                <div className="flex items-center space-x-1 mx-2">
                  {(() => {
                    const totalPages = Math.ceil(totalItems / itemsPerPage);
                    const pages = [];
                    
                    // Always show first page
                    if (totalPages > 0) {
                      pages.push(1);
                    }
                    
                    // Show pages around current page
                    const start = Math.max(2, currentPage - 1);
                    const end = Math.min(totalPages - 1, currentPage + 1);
                    
                    // Add ellipsis if there's a gap
                    if (start > 2) {
                      pages.push('...');
                    }
                    
                    // Add middle pages
                    for (let i = start; i <= end; i++) {
                      if (i !== 1 && i !== totalPages) {
                        pages.push(i);
                      }
                    }
                    
                    // Add ellipsis if there's a gap
                    if (end < totalPages - 1) {
                      pages.push('...');
                    }
                    
                    // Always show last page (if more than 1 page)
                    if (totalPages > 1) {
                      pages.push(totalPages);
                    }
                    
                    return pages.map((page, index) => {
                      if (page === '...') {
                        return (
                          <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                            ...
                          </span>
                        );
                      }
                      
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page as number)}
                          className="h-8 w-8 p-0"
                        >
                          {page}
                        </Button>
                      );
                    });
                  })()}
                </div>
                
                {/* Next Page */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalItems / itemsPerPage), prev + 1))}
                  disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)}
                  className="h-8 w-8 p-0"
                  title="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                {/* Last Page */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.ceil(totalItems / itemsPerPage))}
                  disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)}
                  className="h-8 w-8 p-0"
                  title="Last page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Create Service Modal */}
        <CreateServiceModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onServiceCreated={handleServiceCreated}
        />

        {/* Edit Service Modal */}
        <EditServiceModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingService(null);
          }}
          onServiceUpdated={handleServiceUpdated}
          service={editingService}
        />
      </div>
    </AdminLayout>
  );
}
