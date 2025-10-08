import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';
import { 
  FileText, 
  Settings, 
  TrendingUp,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Service, CategoryWithSubcategories } from '@/lib/api';

interface DashboardStats {
  totalServices: number;
  totalCategories: number;
  totalSubcategories: number;
  activeServices: number;
  inactiveServices: number;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalServices: 0,
    totalCategories: 0,
    totalSubcategories: 0,
    activeServices: 0,
    inactiveServices: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch services
        const servicesResponse = await fetch('http://localhost:8000/services/');
        const services = await servicesResponse.json();
        
        // Fetch categories
        const categoriesResponse = await fetch('http://localhost:8000/categories/');
        const categories = await categoriesResponse.json();
        
        // Calculate stats
        const totalServices = services.length;
        const activeServices = services.filter((s: Service) => s.is_active).length;
        const inactiveServices = totalServices - activeServices;
        
        // Calculate subcategories
        const totalSubcategories = categories.reduce((acc: number, cat: CategoryWithSubcategories) => 
          acc + (cat.subcategory_count || 0), 0);

        setStats({
          totalServices,
          totalCategories: categories.length,
          totalSubcategories,
          activeServices,
          inactiveServices,
          recentActivity: [
            {
              id: '1',
              type: 'service',
              description: 'New service "Plumbing Repair" added to Home Services',
              timestamp: '2 hours ago'
            },
            {
              id: '2',
              type: 'category',
              description: 'Category "Automotive" was updated',
              timestamp: '4 hours ago'
            },
            {
              id: '3',
              type: 'service',
              description: 'Service "House Cleaning" was deactivated',
              timestamp: '1 day ago'
            }
          ]
        });
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    {
      title: 'Total Services',
      value: stats.totalServices,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Active Services',
      value: stats.activeServices,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Categories',
      value: stats.totalCategories,
      icon: Settings,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Subcategories',
      value: stats.totalSubcategories,
      icon: Activity,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading dashboard...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of your Mestermind marketplace</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="p-6">
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              <Clock className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500">{activity.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                <div className="font-medium text-blue-900">Add New Service</div>
                <div className="text-sm text-blue-700">Create a new service offering</div>
              </button>
              <button className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                <div className="font-medium text-green-900">Manage Categories</div>
                <div className="text-sm text-green-700">Organize service categories</div>
              </button>
              <button className="w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                <div className="font-medium text-purple-900">View Analytics</div>
                <div className="text-sm text-purple-700">Check marketplace performance</div>
              </button>
            </div>
          </Card>
        </div>

        {/* Service Status Overview */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Service Status Overview</h3>
            <AlertCircle className="h-5 w-5 text-gray-400" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-green-800">Active Services</p>
                <p className="text-2xl font-bold text-green-900">{stats.activeServices}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-red-800">Inactive Services</p>
                <p className="text-2xl font-bold text-red-900">{stats.inactiveServices}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
