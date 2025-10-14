'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  ArrowLeft, 
  Edit, 
  Mail, 
  Phone, 
  Calendar, 
  User, 
  MessageSquare, 
  FileText,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  AdminCustomer, 
  fetchAdminCustomer, 
  fetchAdminCustomerRequests, 
  fetchAdminCustomerMessages 
} from '@/lib/api';

interface Request {
  id: string;
  service_id: string;
  status: string;
  first_name?: string;
  last_name?: string;
  contact_email?: string;
  contact_phone?: string;
  postal_code?: string;
  message_to_pro?: string;
  budget_estimate?: number;
  created_at: string;
  updated_at?: string;
}

interface MessageThread {
  id: string;
  request_id: string;
  mester_id: string;
  last_message_at?: string;
  last_message_preview?: string;
  created_at: string;
}

interface CustomerDetailProps {
  customerId: string;
}

export default function CustomerDetail({ customerId }: CustomerDetailProps) {
  const router = useRouter();
  const [customer, setCustomer] = useState<AdminCustomer | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [messages, setMessages] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await fetchAdminCustomer(customerId);
      setCustomer(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const data = await fetchAdminCustomerRequests(customerId);
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    }
  };

  const fetchMessages = async () => {
    try {
      const data = await fetchAdminCustomerMessages(customerId);
      setMessages(data.threads || []);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  useEffect(() => {
    fetchCustomer();
    fetchRequests();
    fetchMessages();
  }, [customerId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'quoted':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'booked':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleEdit = () => {
    router.push(`/admin/customers/${customerId}/edit`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading customer details...</span>
      </div>
    );
  }

  if (error || !customer) {
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
            onClick={() => router.push('/admin/customers')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {customer.first_name} {customer.last_name}
            </h1>
            <p className="text-gray-600">Customer Details</p>
          </div>
        </div>
        <Button onClick={handleEdit} variant="outline">
          <Edit className="h-4 w-4 mr-2" />
          Edit Customer
        </Button>
      </div>

      {/* Customer Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Personal Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Full Name</label>
              <p className="text-sm">{customer.first_name} {customer.last_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <p className="text-sm">{customer.email}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Firebase UID</label>
              {customer.firebase_uid ? (
                <Badge variant="outline" className="text-xs">
                  {customer.firebase_uid}
                </Badge>
              ) : (
                <p className="text-sm text-gray-400">Not linked</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Member Since</label>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <p className="text-sm">{formatDate(customer.created_at)}</p>
              </div>
            </div>
            {customer.updated_at && (
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <p className="text-sm">{formatDate(customer.updated_at)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Activity Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{requests.length}</div>
                <div className="text-sm text-gray-500">Total Requests</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {requests.filter(r => r.status === 'BOOKED').length}
                </div>
                <div className="text-sm text-gray-500">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {requests.filter(r => r.status === 'OPEN').length}
                </div>
                <div className="text-sm text-gray-500">Open</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{messages.length}</div>
                <div className="text-sm text-gray-500">Message Threads</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">
            <FileText className="h-4 w-4 mr-2" />
            Requests ({requests.length})
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="h-4 w-4 mr-2" />
            Messages ({messages.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Service Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <div className="text-gray-600 mb-2">No requests found</div>
                  <div className="text-sm text-gray-500">
                    This customer hasn't made any service requests yet
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Contact Info</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {request.id.substring(0, 8)}...
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(request.status)}>
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {request.contact_email && (
                              <div className="flex items-center space-x-1">
                                <Mail className="h-3 w-3 text-gray-400" />
                                <span className="text-xs">{request.contact_email}</span>
                              </div>
                            )}
                            {request.contact_phone && (
                              <div className="flex items-center space-x-1">
                                <Phone className="h-3 w-3 text-gray-400" />
                                <span className="text-xs">{request.contact_phone}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {request.budget_estimate ? (
                            <span className="text-sm">
                              {new Intl.NumberFormat('hu-HU').format(request.budget_estimate)} Ft
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">Not specified</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{formatDate(request.created_at)}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>Message Threads</CardTitle>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <div className="text-gray-600 mb-2">No messages found</div>
                  <div className="text-sm text-gray-500">
                    This customer hasn't sent any messages yet
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thread ID</TableHead>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Mester ID</TableHead>
                      <TableHead>Last Message</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.map((thread) => (
                      <TableRow key={thread.id}>
                        <TableCell>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {thread.id.substring(0, 8)}...
                          </code>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {thread.request_id.substring(0, 8)}...
                          </code>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {thread.mester_id.substring(0, 8)}...
                          </code>
                        </TableCell>
                        <TableCell>
                          {thread.last_message_preview ? (
                            <div className="max-w-xs truncate text-sm">
                              {thread.last_message_preview}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No messages</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{formatDate(thread.created_at)}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
