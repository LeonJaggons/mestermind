/**
 * Customer Job Dashboard
 * 
 * Displays all jobs for a customer with status tracking and filtering
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getAuthToken } from '@/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Job {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  scheduled_start_date: string | null;
  scheduled_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  estimated_cost: number | null;
  final_cost: number | null;
  currency: string;
  mester_id: string;
  customer_satisfaction_rating: number | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  customerId: string;
}

export default function CustomerJobDashboard({ customerId }: Props) {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchJobs();
  }, [customerId, statusFilter]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        customer_user_id: customerId,
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/jobs/?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const data = await response.json();
      setJobs(data);
    } catch (err: unknown) {
      console.error('Error fetching jobs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const baseClass = 'px-3 py-1 rounded-full text-xs font-medium';
    switch (status) {
      case 'pending':
        return `${baseClass} bg-yellow-100 text-yellow-800`;
      case 'in_progress':
        return `${baseClass} bg-blue-100 text-blue-800`;
      case 'on_hold':
        return `${baseClass} bg-orange-100 text-orange-800`;
      case 'completed':
        return `${baseClass} bg-green-100 text-green-800`;
      case 'cancelled':
        return `${baseClass} bg-gray-100 text-gray-800`;
      default:
        return baseClass;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCost = (cost: number | null, currency: string) => {
    if (cost === null) return 'Not set';
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: currency || 'HUF',
    }).format(cost);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchJobs}
          className="mt-2 text-red-600 hover:text-red-700 font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">My Jobs</h2>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'pending', 'in_progress', 'completed'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              statusFilter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'All Jobs' : status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 text-lg">No jobs found</p>
          <p className="text-gray-500 mt-2">
            {statusFilter !== 'all'
              ? 'Try changing the filter'
              : 'Your jobs will appear here'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              onClick={() => router.push(`/jobs/${job.id}`)}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-gray-900 flex-1 mr-2">
                  {job.title}
                </h3>
                <span className={getStatusBadgeClass(job.status)}>
                  {job.status.replace('_', ' ')}
                </span>
              </div>

              {/* Description */}
              {job.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {job.description}
                </p>
              )}

              {/* Timeline */}
              <div className="space-y-2 mb-4">
                {job.scheduled_start_date && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Start:</span>
                    <span className="text-gray-900 font-medium">
                      {formatDate(job.scheduled_start_date)}
                    </span>
                  </div>
                )}
                {job.actual_start_date && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Started:</span>
                    <span className="text-gray-900 font-medium">
                      {formatDate(job.actual_start_date)}
                    </span>
                  </div>
                )}
              </div>

              {/* Cost */}
              {(job.estimated_cost || job.final_cost) && (
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      {job.final_cost ? 'Final Cost:' : 'Estimated:'}
                    </span>
                    <span className="text-gray-900 font-semibold">
                      {formatCost(job.final_cost || job.estimated_cost, job.currency)}
                    </span>
                  </div>
                </div>
              )}

              {/* Rating (if completed) */}
              {job.status === 'completed' && (
                <div className="border-t border-gray-100 pt-4 mt-4">
                  {job.customer_satisfaction_rating ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Your rating:</span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`w-4 h-4 ${
                              star <= job.customer_satisfaction_rating!
                                ? 'text-yellow-400'
                                : 'text-gray-300'
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/jobs/${job.id}?tab=feedback`);
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Rate this job →
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

