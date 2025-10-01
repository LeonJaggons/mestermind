'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Question, QuestionSet, fetchQuestionSet, fetchQuestionSetsByService, createCustomerRequest, getCustomerRequest, updateCustomerRequest, deleteCustomerRequest, CustomerRequest } from '@/lib/api';

interface QuestionSetModalProps {
  serviceId: string;
  mesterId?: string;
  placeId?: string;
  open: boolean;
  onClose: () => void;
  context?: 'instant-results' | 'mester-profile';
}

export default function QuestionSetModal({ serviceId, mesterId, placeId, open, onClose, context = 'instant-results' }: QuestionSetModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionSet, setQuestionSet] = useState<QuestionSet | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [request, setRequest] = useState<CustomerRequest | null>(null);
  const [contactEmail, setContactEmail] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [postalCode, setPostalCode] = useState<string>('');
  const [messageToPro, setMessageToPro] = useState<string>('');

  const handleClose = async () => {
    // If this is from instant-results context and we have a request, delete it
    if (context === 'instant-results' && request) {
      try {
        await deleteCustomerRequest(request.id);
        // Also remove from localStorage
        if (typeof window !== 'undefined') {
          const storageKey = `mm:req:${serviceId}:${questionSet?.id || ''}:${placeId || ''}`;
          localStorage.removeItem(storageKey);
        }
      } catch (error) {
        console.error('Failed to delete request:', error);
        // Continue with close even if deletion fails
      }
    }
    onClose();
  };

  useEffect(() => {
    if (!open || !serviceId) return;
    let aborted = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setQuestionSet(null);
        setCurrentStep(0);
        setFormData({});

        const sets = await fetchQuestionSetsByService(serviceId);
        const published = sets.filter(s => s.status === 'published' && s.is_active !== false);
        if (published.length === 0) {
          setError('No published question set found for this service.');
          return;
        }
        const latest = published.reduce((acc, s) => (s.version > acc.version ? s : acc), published[0]);
        const full = await fetchQuestionSet(latest.id);
        if (aborted) return;
        setQuestionSet(full);

        // Resume or create request
        const storageKey = `mm:req:${serviceId}:${latest.id}:${placeId || ''}`;
        const existingId = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
        if (existingId) {
          try {
            const existing = await getCustomerRequest(existingId);
            if (existing.question_set_id === latest.id) {
              setRequest(existing);
              setFormData(existing.answers || {});
              setContactEmail(existing.contact_email || '');
              setContactPhone(existing.contact_phone || '');
              setPostalCode(existing.postal_code || '');
              setMessageToPro(existing.message_to_pro || '');
              setCurrentStep(existing.current_step || 0);
              return;
            }
          } catch { /* fall through to create */ }
        }
        const created = await createCustomerRequest({
          service_id: serviceId,
          question_set_id: latest.id,
          place_id: placeId,
          mester_id: mesterId,
          contact_email: contactEmail || undefined,
          contact_phone: contactPhone || undefined,
          postal_code: postalCode || undefined,
          message_to_pro: messageToPro || undefined,
          current_step: 0,
          answers: {},
        });
        setRequest(created);
        if (typeof window !== 'undefined') {
          localStorage.setItem(storageKey, created.id);
        }
      } catch (e: any) {
        if (!aborted) setError(e?.message || 'Failed to load question set');
      } finally {
        if (!aborted) setLoading(false);
      }
    };
    load();
    return () => {
      aborted = true;
    };
  }, [open, serviceId]);

  // Debounced autosave whenever answers change
  useEffect(() => {
    if (!request) return;
    const handle = setTimeout(() => {
      // Debug: inspect what we're saving
      // eslint-disable-next-line no-console
      console.log('[autosave] request', request.id, 'answers', formData);
      void updateCustomerRequest(request.id, { answers: formData });
    }, 500);
    return () => clearTimeout(handle);
  }, [request, formData]);

  const questions: Question[] = useMemo(() => {
    const base = questionSet?.questions || [];
    if (!questionSet) return base;
    const hasTimeline = base.some(q => q.key === 'timeline');
    if (hasTimeline) return base;
    return [
      ...base,
      {
        id: `synthetic-${questionSet.id}-timeline`,
        question_set_id: questionSet.id,
        key: 'timeline',
        label: "What's your timeline?",
        description: undefined,
        question_type: 'select',
        is_required: false,
        is_active: true,
        sort_order: 10000,
        options: {
          choices: [
            'Urgent — need a pro right away\nWithin 48 hours',
            'Ready to hire, but not in a hurry\nWithin 7 days',
            'Still researching\nNo timeline in mind',
          ],
        },
        min_value: undefined,
        max_value: undefined,
        min_length: undefined,
        max_length: undefined,
        conditional_rules: undefined,
        allowed_file_types: undefined,
        max_file_size: undefined,
        created_at: new Date().toISOString(),
        updated_at: undefined,
      },
    ];
  }, [questionSet]);
  const stepSize = 1;
  const baseTotalSteps = Math.max(1, Math.ceil(questions.length / stepSize));
  const contactStepIndex = baseTotalSteps;
  const totalSteps = baseTotalSteps + 1;
  const currentQuestions = currentStep < baseTotalSteps
    ? questions.slice(currentStep * stepSize, (currentStep + 1) * stepSize)
    : [];
  const progressPercent = Math.round(((currentStep + 1) / totalSteps) * 100);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-2xl p-4">
        <Card className="p-0">
          <CardHeader className="px-6">
            <CardTitle className="text-xl">{questionSet?.name || 'Loading form...'}</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {/* Progress bar */}
            {totalSteps > 1 && (
              <div className="mb-6">
                <div className="w-full h-2 bg-gray-200 rounded">
                  <div
                    className="h-full bg-primary rounded transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-gray-600">Step {currentStep + 1} of {totalSteps}</div>
              </div>
            )}
            {loading && (
              <div className="text-gray-600">Loading question set…</div>
            )}
            {!loading && error && (
              <div className="text-red-600">{error}</div>
            )}
            {!loading && !error && questionSet && (
              <div className="space-y-5">
                {currentQuestions.length > 0 && currentQuestions.map((q) => (
                  <div key={q.id} className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">
                      {q.label}
                      {q.is_required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {q.description && (
                      <p className="text-sm text-gray-600">{q.description}</p>
                    )}
                    {renderInput(q, formData[q.key], (val) => setFormData(prev => ({ ...prev, [q.key]: val })))}
                  </div>
                ))}
                {currentQuestions.length === 0 && currentStep === contactStepIndex && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Email</label>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          value={contactEmail}
                          onChange={(e) => setContactEmail((e.target as HTMLInputElement).value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Phone</label>
                        <Input
                          type="tel"
                          placeholder="+36 30 123 4567"
                          value={contactPhone}
                          onChange={(e) => setContactPhone((e.target as HTMLInputElement).value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">ZIP Code</label>
                        <Input
                          placeholder="1011"
                          value={postalCode}
                          onChange={(e) => setPostalCode((e.target as HTMLInputElement).value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-900">Message to the pro</label>
                      <textarea
                        className="w-full border rounded px-3 py-2 text-sm text-gray-800"
                        rows={3}
                        placeholder="Share any details that can help the pro quote accurately."
                        value={messageToPro}
                        onChange={(e) => setMessageToPro((e.target as HTMLTextAreaElement).value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="px-6">
            <div className="w-full flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  const prevStep = Math.max(0, currentStep - 1);
                  setCurrentStep(prevStep);
                  if (request) {
                    void updateCustomerRequest(request.id, { current_step: prevStep, answers: formData });
                  }
                }}
                disabled={currentStep === 0 || loading || !!error || !questionSet}
              >
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
                <Button
                  onClick={async () => {
                    if (currentStep < totalSteps - 1) {
                      const nextStep = Math.min(totalSteps - 1, currentStep + 1);
                      setCurrentStep(nextStep);
                  if (request) {
                    void updateCustomerRequest(request.id, {
                      current_step: nextStep,
                      mester_id: mesterId,
                      answers: formData,
                      contact_email: contactEmail || undefined,
                      contact_phone: contactPhone || undefined,
                      postal_code: postalCode || undefined,
                      message_to_pro: messageToPro || undefined,
                    });
                      }
                    } else {
                      // Ensure the latest answers are saved before submit
                      if (request) {
                        try {
                          // Debug: inspect final submit payload
                          // eslint-disable-next-line no-console
                          console.log('[submit] request', request.id, 'answers', formData);
                          await updateCustomerRequest(request.id, {
                            answers: formData,
                            mester_id: mesterId,
                            contact_email: contactEmail || undefined,
                            contact_phone: contactPhone || undefined,
                            postal_code: postalCode || undefined,
                            message_to_pro: messageToPro || undefined,
                            status: 'submitted',
                          });
                        } catch (e) {
                          // no-op fallback; UI can still proceed
                        }
                      }
                      // Signal submission to instant-results page
                      if (typeof window !== 'undefined') {
                        const key = `mm:submitted:${serviceId}:${placeId || ''}`;
                        try {
                          window.localStorage.setItem(key, '1');
                        } catch {}
                      }
                      onClose();
                    }
                  }}
                  disabled={loading || !!error || !questionSet}
                >
                  {currentStep < totalSteps - 1 ? 'Next' : 'Submit'}
                </Button>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

function renderInput(q: Question, value: any, onChange: (v: any) => void) {
  switch (q.question_type) {
    case 'text':
      return (
        <Input
          placeholder="Enter your answer…"
          value={value || ''}
          onChange={(e) => onChange((e.target as HTMLInputElement).value)}
          minLength={q.min_length}
          maxLength={q.max_length}
        />
      );
    case 'number':
      return (
        <Input
          type="number"
          placeholder="Enter a number…"
          value={value ?? ''}
          onChange={(e) => onChange((e.target as HTMLInputElement).value)}
          min={q.min_value}
          max={q.max_value}
        />
      );
    case 'boolean':
      return (
        <div className="question-option-container">
          <div className="question-option-item">
            <input
              type="radio"
              name={q.key}
              checked={value === true}
              onChange={() => onChange(true)}
              className="question-option-input"
              id={`${q.key}-yes`}
            />
            <label htmlFor={`${q.key}-yes`} className="question-option-label">
              Yes
            </label>
          </div>
          <div className="question-option-item">
            <input
              type="radio"
              name={q.key}
              checked={value === false}
              onChange={() => onChange(false)}
              className="question-option-input"
              id={`${q.key}-no`}
            />
            <label htmlFor={`${q.key}-no`} className="question-option-label">
              No
            </label>
          </div>
        </div>
      );
    case 'select':
      return (
        <div className="question-option-container">
          {q.options?.choices?.map((choice: any, idx: number) => {
            const choiceValue = typeof choice === 'string' ? choice : choice.value;
            const choiceLabel = typeof choice === 'string' ? choice : choice.label;
            const isLast = idx === (q.options?.choices?.length || 0) - 1;
            return (
              <div key={idx} className={`question-option-item ${isLast ? 'border-b-0' : ''}`}>
                <input
                  type="radio"
                  name={q.key}
                  value={choiceValue}
                  checked={value === choiceValue}
                  onChange={() => onChange(choiceValue)}
                  className="question-option-input"
                  id={`${q.key}-${idx}`}
                />
                <label htmlFor={`${q.key}-${idx}`} className="question-option-label">
                  {choiceLabel}
                </label>
              </div>
            );
          })}
        </div>
      );
    case 'multi_select':
      return (
        <div className="question-option-container">
          {q.options?.choices?.map((choice: any, idx: number) => {
            const choiceValue = typeof choice === 'string' ? choice : choice.value;
            const choiceLabel = typeof choice === 'string' ? choice : choice.label;
            const arr: string[] = Array.isArray(value) ? value : [];
            const checked = arr.includes(choiceValue);
            const isLast = idx === (q.options?.choices?.length || 0) - 1;
            return (
              <div key={idx} className={`question-option-item ${isLast ? 'border-b-0' : ''}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.currentTarget.checked
                      ? [...arr, choiceValue]
                      : arr.filter(v => v !== choiceValue);
                    onChange(next);
                  }}
                  className="question-option-checkbox"
                  id={`${q.key}-${idx}`}
                />
                <label htmlFor={`${q.key}-${idx}`} className="question-option-label">
                  {choiceLabel}
                </label>
              </div>
            );
          })}
        </div>
      );
    case 'date':
      return (
        <Input
          type="date"
          value={value || ''}
          onChange={(e) => onChange((e.target as HTMLInputElement).value)}
        />
      );
    case 'file':
      return (
        <input
          type="file"
          onChange={(e) => onChange((e.target as HTMLInputElement).files?.[0] || null)}
          accept={q.allowed_file_types?.join(',')}
        />
      );
    default:
      return <div className="text-gray-500 italic">Unsupported question type</div>;
  }
}


