import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { subscribeToAuthChanges } from "@/lib/auth";
import { getCustomerRequest, fetchQuestions, type CustomerRequest, type Question } from "@/lib/api";

export default function RequestDetailPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<CustomerRequest | null>(null);
  const [questions, setQuestions] = useState<Question[] | null>(null);

  useEffect(() => {
    const unsub = subscribeToAuthChanges(async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      setChecking(false);
    });
    return () => { if (unsub) unsub(); };
  }, [router]);

  useEffect(() => {
    if (checking) return;
    if (!id) return;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const req = await getCustomerRequest(id);
        setRequest(req);
        const qs = await fetchQuestions({ question_set_id: req.question_set_id, limit: 1000 });
        setQuestions(qs);
      } catch (e) {
        setError("Failed to load request");
      } finally {
        setLoading(false);
      }
    })();
  }, [checking, id]);

  const questionIdToLabel = useMemo(() => {
    const map = new Map<string, string>();
    (questions || []).forEach((q) => {
      map.set(q.id, q.label);
    });
    return map;
  }, [questions]);

  function renderAnswer(key: string, entry: any) {
    const value = entry && typeof entry === 'object' && 'value' in entry ? entry.value : entry;
    const qid = entry && typeof entry === 'object' && 'question_id' in entry ? String(entry.question_id) : undefined;
    const label = qid ? questionIdToLabel.get(qid) : undefined;
    return (
      <div className="py-3">
        <div className="text-sm text-gray-500">{label || key}</div>
        <div className="text-gray-900">{formatValue(value)}</div>
      </div>
    );
  }

  function formatValue(v: any): string {
    if (v === null || v === undefined) return "—";
    if (Array.isArray(v)) return v.join(", ");
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }

  if (checking) {
    return <main className="min-h-screen bg-white"><div className="max-w-5xl mx-auto p-6">Loading…</div></main>;
  }

  if (loading) {
    return <main className="min-h-screen bg-white"><div className="max-w-5xl mx-auto p-6">Loading request…</div></main>;
  }

  if (error || !request) {
    return <main className="min-h-screen bg-white"><div className="max-w-5xl mx-auto p-6 text-red-600">{error || "Not found"}</div></main>;
  }

  const answers = request.answers || {} as Record<string, any>;

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Request {request.id.slice(0, 8)}</h1>
          <Link href="/pro/leads" className="text-sm text-blue-600 hover:underline">Back to leads</Link>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="border border-gray-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Customer details</h2>
            <div className="text-sm text-gray-700 space-y-2">
              <div><span className="text-gray-500">Email:</span> {request.contact_email || '—'}</div>
              <div><span className="text-gray-500">Phone:</span> {request.contact_phone || '—'}</div>
              <div><span className="text-gray-500">Postal code:</span> {request.postal_code || '—'}</div>
              <div><span className="text-gray-500">Status:</span> {request.status}</div>
              <div><span className="text-gray-500">Created:</span> {new Date(request.created_at).toLocaleString()}</div>
            </div>
          </section>

          <section className="border border-gray-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Message</h2>
            <div className="text-gray-700 whitespace-pre-wrap text-sm">{request.message_to_pro || '—'}</div>
          </section>
        </div>

        <section className="mt-6 border border-gray-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Answers</h2>
          <div>
            {Object.keys(answers).length === 0 && <div className="text-gray-600">No answers provided.</div>}
            {Object.entries(answers).map(([k, entry]) => (
              <div key={k} className="border-t border-gray-100 first:border-t-0">
                {renderAnswer(k, entry)}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}


