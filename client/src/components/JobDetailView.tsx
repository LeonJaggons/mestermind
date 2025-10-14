/**
 * Job Detail View
 * 
 * Comprehensive job detail view with timeline, milestones, documents, and notes
 */

import React, { useState, useEffect } from 'react';
import { getAuthToken } from '@/lib/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface JobDetailProps {
  jobId: string;
  userType: 'customer' | 'mester';
}

interface Job {
  id: string;
  title: string;
  description: string;
  status: string;
  scheduled_start_date: string | null;
  scheduled_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  estimated_cost: number | null;
  final_cost: number | null;
  currency: string;
  location: string | null;
  location_address: string | null;
  customer_satisfaction_rating: number | null;
  customer_feedback: string | null;
  created_at: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  status: string;
  order_index: number;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  completion_percentage: number;
  completion_notes: string | null;
}

interface Document {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  document_type: string;
  category: string;
  title: string | null;
  description: string | null;
  uploaded_by_type: string;
  created_at: string;
}

interface Note {
  id: string;
  title: string | null;
  content: string;
  created_by_type: string;
  is_private: boolean;
  is_pinned: boolean;
  created_at: string;
}

interface StatusHistory {
  id: string;
  previous_status: string | null;
  new_status: string;
  changed_by_type: string;
  notes: string | null;
  reason: string | null;
  created_at: string;
}

export default function JobDetailView({ jobId, userType }: JobDetailProps) {
  const [job, setJob] = useState<Job | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // New note form
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNotePrivate, setNewNotePrivate] = useState(false);

  // Feedback form
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    fetchJobDetails();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      
      const [jobRes, milestonesRes, documentsRes, notesRes, historyRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/jobs/${jobId}`, { headers }),
        fetch(`${API_BASE_URL}/api/jobs/${jobId}/milestones`, { headers }),
        fetch(`${API_BASE_URL}/api/jobs/${jobId}/documents`, { headers }),
        fetch(`${API_BASE_URL}/api/jobs/${jobId}/notes`, { headers }),
        fetch(`${API_BASE_URL}/api/jobs/${jobId}/history`, { headers }),
      ]);

      setJob(await jobRes.json());
      setMilestones(await milestonesRes.json());
      setDocuments(await documentsRes.json());
      setNotes(await notesRes.json());
      setStatusHistory(await historyRes.json());
    } catch (err: unknown) {
      console.error('Error fetching job details:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateJobStatus = async (newStatus: string) => {
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
      
      if (!response.ok) throw new Error('Failed to update status');
      fetchJobDetails();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const addNote = async () => {
    if (!newNoteContent.trim()) return;

    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/jobs/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_id: jobId,
          content: newNoteContent,
          title: newNoteTitle || null,
          is_private: newNotePrivate && userType === 'mester',
        }),
      });
      
      if (!response.ok) throw new Error('Failed to add note');
      
      setNewNoteContent('');
      setNewNoteTitle('');
      setNewNotePrivate(false);
      fetchJobDetails();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to add note');
    }
  };

  const submitFeedback = async () => {
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          feedback: feedback || null,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to submit feedback');
      
      fetchJobDetails();
      setRating(0);
      setFeedback('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to submit feedback');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number | null, currency: string = 'HUF') => {
    if (amount === null) return 'Not set';
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      on_hold: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getMilestoneStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'text-gray-400',
      in_progress: 'text-blue-600',
      completed: 'text-green-600',
      skipped: 'text-gray-300',
    };
    return colors[status] || 'text-gray-400';
  };

  if (loading || !job) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
            {job.description && (
              <p className="text-gray-600 mt-2">{job.description}</p>
            )}
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(job.status)}`}>
            {job.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div>
            <p className="text-sm text-gray-500">Scheduled Start</p>
            <p className="font-medium text-gray-900">{formatDate(job.scheduled_start_date)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Actual Start</p>
            <p className="font-medium text-gray-900">{formatDate(job.actual_start_date)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">
              {job.final_cost ? 'Final Cost' : 'Estimated Cost'}
            </p>
            <p className="font-medium text-gray-900">
              {formatCurrency(job.final_cost || job.estimated_cost, job.currency)}
            </p>
          </div>
        </div>

        {/* Quick Actions for Mester */}
        {userType === 'mester' && (
          <div className="flex gap-2 mt-6 pt-6 border-t">
            {job.status === 'pending' && (
              <button
                onClick={() => updateJobStatus('in_progress')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Start Job
              </button>
            )}
            {job.status === 'in_progress' && (
              <>
                <button
                  onClick={() => updateJobStatus('on_hold')}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Put On Hold
                </button>
                <button
                  onClick={() => updateJobStatus('completed')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Mark Complete
                </button>
              </>
            )}
            {job.status === 'on_hold' && (
              <button
                onClick={() => updateJobStatus('in_progress')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Resume Job
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="milestones">Milestones ({milestones.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Progress Overview */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Progress</h3>
            {milestones.length > 0 ? (
              <>
                <div className="space-y-3">
                  {milestones.slice(0, 3).map((milestone) => (
                    <div key={milestone.id} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${getMilestoneStatusColor(milestone.status)}`} />
                      <span className="flex-1">{milestone.title}</span>
                      <span className="text-sm text-gray-500">{milestone.completion_percentage}%</span>
                    </div>
                  ))}
                </div>
                {milestones.length > 3 && (
                  <button
                    onClick={() => setActiveTab('milestones')}
                    className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View all {milestones.length} milestones →
                  </button>
                )}
              </>
            ) : (
              <p className="text-gray-500">No milestones added yet</p>
            )}
          </div>

          {/* Customer Feedback (if available) */}
          {job.customer_satisfaction_rating && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Customer Feedback</h3>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-5 h-5 ${
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
                <span className="font-medium">{job.customer_satisfaction_rating}/5</span>
              </div>
              {job.customer_feedback && (
                <p className="text-gray-700">{job.customer_feedback}</p>
              )}
            </div>
          )}

          {/* Feedback Form (for customers on completed jobs) */}
          {userType === 'customer' && job.status === 'completed' && !job.customer_satisfaction_rating && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Rate This Job</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rating
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="focus:outline-none"
                      >
                        <svg
                          className={`w-8 h-8 ${
                            star <= rating ? 'text-yellow-400' : 'text-gray-300'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Feedback (Optional)
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg p-3"
                    placeholder="Share your experience..."
                  />
                </div>
                <button
                  onClick={submitFeedback}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Submit Feedback
                </button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Milestones</h3>
            {milestones.length === 0 ? (
              <p className="text-gray-500">No milestones added yet</p>
            ) : (
              <div className="space-y-4">
                {milestones.map((milestone, index) => (
                  <div key={milestone.id} className="border-l-4 border-blue-600 pl-4 py-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-3 h-3 rounded-full ${getMilestoneStatusColor(milestone.status)}`} />
                          <h4 className="font-medium text-gray-900">{milestone.title}</h4>
                          <span className="text-sm text-gray-500">({milestone.completion_percentage}%)</span>
                        </div>
                        {milestone.description && (
                          <p className="text-gray-600 text-sm mt-1">{milestone.description}</p>
                        )}
                        <div className="flex gap-4 mt-2 text-sm text-gray-500">
                          {milestone.scheduled_start && (
                            <span>Scheduled: {formatDate(milestone.scheduled_start)}</span>
                          )}
                          {milestone.actual_start && (
                            <span>Started: {formatDate(milestone.actual_start)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Documents & Photos</h3>
            {documents.length === 0 ? (
              <p className="text-gray-500">No documents uploaded yet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs text-gray-500 uppercase">{doc.category}</span>
                      <span className="text-xs text-gray-500">{doc.document_type}</span>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">
                      {doc.title || doc.file_name}
                    </h4>
                    {doc.description && (
                      <p className="text-sm text-gray-600 mb-2">{doc.description}</p>
                    )}
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View →
                    </a>
                    <p className="text-xs text-gray-400 mt-2">
                      Uploaded by {doc.uploaded_by_type} on {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <div className="space-y-4">
            {/* Add Note Form */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Add Note</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  placeholder="Title (optional)"
                  className="w-full border border-gray-300 rounded-lg p-2"
                />
                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  rows={3}
                  placeholder="Note content..."
                  className="w-full border border-gray-300 rounded-lg p-2"
                />
                {userType === 'mester' && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newNotePrivate}
                      onChange={(e) => setNewNotePrivate(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-600">Private note (CRM only)</span>
                  </label>
                )}
                <button
                  onClick={addNote}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Note
                </button>
              </div>
            </div>

            {/* Notes List */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">All Notes</h3>
              {notes.length === 0 ? (
                <p className="text-gray-500">No notes yet</p>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div key={note.id} className={`p-4 rounded-lg ${note.is_pinned ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {note.title && (
                            <h4 className="font-medium text-gray-900">{note.title}</h4>
                          )}
                          {note.is_private && (
                            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">Private</span>
                          )}
                          {note.is_pinned && (
                            <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">Pinned</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {note.created_by_type} • {new Date(note.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-700">{note.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Status History</h3>
            {statusHistory.length === 0 ? (
              <p className="text-gray-500">No history available</p>
            ) : (
              <div className="space-y-3">
                {statusHistory.map((history) => (
                  <div key={history.id} className="flex gap-4 pb-3 border-b border-gray-100 last:border-0">
                    <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {history.previous_status ? `${history.previous_status} → ` : ''}
                          {history.new_status}
                        </span>
                        <span className="text-sm text-gray-500">
                          by {history.changed_by_type}
                        </span>
                      </div>
                      {(history.notes || history.reason) && (
                        <p className="text-sm text-gray-600">
                          {history.notes || history.reason}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(history.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

