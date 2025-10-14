/**
 * Professional Job Dashboard (CRM)
 * 
 * Comprehensive job management dashboard for service professionals
 * with stats, filtering, and quick actions
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getAuthToken } from '@/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface JobStats {
  total_jobs: number;
  active_jobs: number;
  completed_jobs: number;
  cancelled_jobs: number;
  average_rating: number | null;
  total_revenue: number;
  estimated_pipeline: number;
  jobs_by_status: {
    pending: number;
    in_progress: number;
    on_hold: number;
    completed: number;
    cancelled: number;
  };
}

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
  customer_user_id: string;
  customer_satisfaction_rating: number | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  mesterId: string;
}

export default function ProJobDashboard({ mesterId }: Props) {
  const router = useRouter();
  const [stats, setStats] = useState<JobStats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('active');

  useEffect(() => {
    fetchData();
  }, [mesterId]);

  useEffect(() => {
    fetchJobs();
  }, [mesterId, statusFilter]);

  const fetchData = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/jobs/mester/${mesterId}/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err: unknown) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getAuthToken();
      
      if (statusFilter === 'active') {
        // Fetch both pending and in_progress jobs
        const [pendingRes, inProgressRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/jobs/?mester_id=${mesterId}&status=pending`, {
            headers: { 'Authorization': `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/api/jobs/?mester_id=${mesterId}&status=in_progress`, {
            headers: { 'Authorization': `Bearer ${token}` },
          }),
        ]);
        
        const pending = await pendingRes.json();
        const inProgress = await inProgressRes.json();
        setJobs([...pending, ...inProgress]);
      } else if (statusFilter !== 'all') {
        const response = await fetch(
          `${API_BASE_URL}/api/jobs/?mester_id=${mesterId}&status=${statusFilter}`,
          {
            headers: { 'Authorization': `Bearer ${token}` },
          }
        );
        const data = await response.json();
        setJobs(data);
      } else {
        const response = await fetch(
          `${API_BASE_URL}/api/jobs/?mester_id=${mesterId}`,
          {
            headers: { 'Authorization': `Bearer ${token}` },
          }
        );
        const data = await response.json();
        setJobs(data);
      }
    } catch (err: unknown) {
      console.error('Error fetching jobs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const updateJobStatus = async (jobId: string, newStatus: string) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update job status');
      }
      
      fetchJobs();
      fetchData();
    } catch (err: unknown) {
      console.error('Error updating job status:', err);
      alert(err instanceof Error ? err.message : 'Failed to update job status');
    }
  };

  const formatCurrency = (amount: number, currency: string = 'HUF') => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Jobs</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_jobs}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">{stats.active_jobs} active</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-green-600">{stats.completed_jobs}</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            {stats.average_rating && (
              <p className="text-sm text-gray-500 mt-2">
                ⭐ {stats.average_rating.toFixed(1)} avg rating
              </p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.total_revenue)}
                </p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">From completed jobs</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pipeline</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.estimated_pipeline)}
                </p>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Estimated from active jobs</p>
          </div>
        </div>
      )}

      {/* Job Status Distribution */}
      {stats && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Jobs by Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(stats.jobs_by_status).map(([status, count]) => (
              <div key={status} className="text-center">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-600 capitalize">{status.replace('_', ' ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header with Filters */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Jobs</h2>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['active', 'all', 'pending', 'in_progress', 'completed', 'on_hold'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              statusFilter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status === 'active' ? 'Active Jobs' : status === 'all' ? 'All Jobs' : status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Jobs List */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 text-lg">No jobs found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3
                      onClick={() => router.push(`/pro/jobs/${job.id}`)}
                      className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer"
                    >
                      {job.title}
                    </h3>
                    <span className={getStatusBadgeClass(job.status)}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>

                  {job.description && (
                    <p className="text-gray-600 text-sm mb-3">{job.description}</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm">
                    {job.scheduled_start_date && (
                      <div>
                        <span className="text-gray-500">Start: </span>
                        <span className="text-gray-900 font-medium">
                          {formatDate(job.scheduled_start_date)}
                        </span>
                      </div>
                    )}
                    {(job.estimated_cost || job.final_cost) && (
                      <div>
                        <span className="text-gray-500">
                          {job.final_cost ? 'Revenue: ' : 'Estimated: '}
                        </span>
                        <span className="text-gray-900 font-semibold">
                          {formatCurrency(job.final_cost || job.estimated_cost || 0, job.currency)}
                        </span>
                      </div>
                    )}
                    {job.customer_satisfaction_rating && (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Rating:</span>
                        <span className="text-yellow-500">⭐</span>
                        <span className="font-medium">{job.customer_satisfaction_rating}/5</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="ml-4 flex gap-2">
                  {job.status === 'pending' && (
                    <button
                      onClick={() => updateJobStatus(job.id, 'in_progress')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      Start Job
                    </button>
                  )}
                  {job.status === 'in_progress' && (
                    <button
                      onClick={() => updateJobStatus(job.id, 'completed')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                    >
                      Mark Complete
                    </button>
                  )}
                  <button
                    onClick={() => router.push(`/pro/jobs/${job.id}`)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

