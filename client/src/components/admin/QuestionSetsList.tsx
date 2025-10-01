'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Edit, 
  Eye, 
  Trash2, 
  Upload, 
  Download,
  Search,
  Filter,
  MoreVertical,
  Calendar,
  FileText,
  Users,
  CheckCircle,
  Clock
} from 'lucide-react';
import { 
  QuestionSet, 
  Service,
  fetchQuestionSets, 
  fetchAllServices,
  deleteQuestionSet,
  publishQuestionSet,
  unpublishQuestionSet
} from '@/lib/api';

interface QuestionSetsListProps {
  onEdit: (questionSet: QuestionSet) => void;
  onPreview: (questionSet: QuestionSet) => void;
  onCreate: () => void;
}

export default function QuestionSetsList({ onEdit, onPreview, onCreate }: QuestionSetsListProps) {
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [questionSetsData, servicesData] = await Promise.all([
        fetchQuestionSets(),
        fetchAllServices()
      ]);
      setQuestionSets(questionSetsData);
      setServices(servicesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (questionSetId: string) => {
    if (window.confirm('Are you sure you want to delete this question set?')) {
      try {
        await deleteQuestionSet(questionSetId);
        setQuestionSets(questionSets.filter(qs => qs.id !== questionSetId));
      } catch (error) {
        console.error('Error deleting question set:', error);
        alert('Failed to delete question set');
      }
    }
  };

  const handlePublish = async (questionSetId: string) => {
    try {
      await publishQuestionSet(questionSetId);
      setQuestionSets(questionSets.map(qs => 
        qs.id === questionSetId ? { ...qs, status: 'published' } : qs
      ));
    } catch (error) {
      console.error('Error publishing question set:', error);
      alert('Failed to publish question set');
    }
  };

  const handleUnpublish = async (questionSetId: string) => {
    try {
      await unpublishQuestionSet(questionSetId);
      setQuestionSets(questionSets.map(qs => 
        qs.id === questionSetId ? { ...qs, status: 'draft' } : qs
      ));
    } catch (error) {
      console.error('Error unpublishing question set:', error);
      alert('Failed to unpublish question set');
    }
  };

  const getServiceName = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service?.name || 'Unknown Service';
  };

  const filteredQuestionSets = questionSets.filter(qs => {
    const matchesSearch = qs.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         qs.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || qs.status === statusFilter;
    const matchesService = serviceFilter === 'all' || qs.service_id === serviceFilter;
    
    return matchesSearch && matchesStatus && matchesService;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading question sets...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Question Sets</h1>
          <p className="text-gray-600">Manage question sets for your services</p>
        </div>
        <Button onClick={onCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Question Set
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search question sets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'draft' | 'published')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>

          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Services</option>
            {services.map(service => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Question Sets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredQuestionSets.map((questionSet) => (
          <Card key={questionSet.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {questionSet.name}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  {getServiceName(questionSet.service_id)}
                </p>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={questionSet.status === 'published' ? 'default' : 'secondary'}
                    className={questionSet.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                  >
                    {questionSet.status === 'published' ? (
                      <><CheckCircle className="h-3 w-3 mr-1" /> Published</>
                    ) : (
                      <><Clock className="h-3 w-3 mr-1" /> Draft</>
                    )}
                  </Badge>
                  <Badge variant="outline">
                    v{questionSet.version}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPreview(questionSet)}
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(questionSet)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(questionSet.id)}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {questionSet.description && (
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {questionSet.description}
              </p>
            )}

            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {questionSet.question_count || 0} questions
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(questionSet.created_at).toLocaleDateString()}
              </div>
            </div>

            <div className="flex gap-2">
              {questionSet.status === 'draft' ? (
                <Button
                  size="sm"
                  onClick={() => handlePublish(questionSet.id)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Publish
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUnpublish(questionSet.id)}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Unpublish
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(questionSet)}
                className="flex-1"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredQuestionSets.length === 0 && (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No question sets found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || statusFilter !== 'all' || serviceFilter !== 'all'
              ? 'Try adjusting your filters to see more results.'
              : 'Get started by creating your first question set.'}
          </p>
          {(!searchTerm && statusFilter === 'all' && serviceFilter === 'all') && (
            <Button onClick={onCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Question Set
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}

