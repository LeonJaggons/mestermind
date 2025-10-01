import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { subscribeToAuthChanges } from "@/lib/auth";
import { fetchProStatus, listCustomerRequests, type CustomerRequest } from "@/lib/api";

export default function ProLeadsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [mesterId, setMesterId] = useState<string | null>(null);
  const [assignedRequests, setAssignedRequests] = useState<CustomerRequest[]>([]);
  const [matchingRequests, setMatchingRequests] = useState<CustomerRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToAuthChanges(async (user) => {
      try {
        if (!user?.email) {
          router.replace("/login");
          return;
        }
        const status = await fetchProStatus(user.email);
        if (!status.is_pro) {
          router.replace("/pro/onboarding");
          return;
        }
        setMesterId(status.mester_id || null);
      } catch (e) {
        setError("Failed to verify account");
      } finally {
        setChecking(false);
      }
    });
    return () => { if (unsub) unsub(); };
  }, [router]);

  useEffect(() => {
    if (checking) return;
    setLoading(true);
    setError(null);
    async function load() {
      try {
        // Fetch requests explicitly assigned to this mester
        const assigned = mesterId ? await listCustomerRequests({ mester_id: mesterId }) : [];
        // Fetch union (assigned + service matches) then remove assigned to get only matches
        const union = mesterId ? await listCustomerRequests({ mester_id: mesterId, match_mester_services: true }) : [];

        const assignedSet = new Set(assigned.map(r => r.id));
        const dedupAssigned: CustomerRequest[] = [];
        for (const r of assigned) {
          if (!dedupAssigned.find(x => x.id === r.id)) dedupAssigned.push(r);
        }

        const matchesOnly: CustomerRequest[] = [];
        for (const r of union) {
          if (assignedSet.has(r.id)) continue;
          if (!matchesOnly.find(x => x.id === r.id)) matchesOnly.push(r);
        }

        setAssignedRequests(dedupAssigned);
        setMatchingRequests(matchesOnly);
      } catch (e) {
        setError("Failed to load leads");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [checking, mesterId]);

  if (checking) {
    return (
      <main className="min-h-screen bg-white">
        <div className="max-w-5xl mx-auto p-6">Loading…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Leads</h1>
          <Link href="/pro/dashboard" className="text-sm text-blue-600 hover:underline">Back to dashboard</Link>
        </div>

        <div className="mt-6">
          {loading && <div className="text-gray-600">Loading leads…</div>}
          {!loading && error && <div className="text-red-600">{error}</div>}
          {!loading && !error && assignedRequests.length === 0 && matchingRequests.length === 0 && (
            <div className="text-gray-700">No leads yet. Check back soon.</div>
          )}

          {!loading && !error && (
            <div className="space-y-6">
              {assignedRequests.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Assigned to you</h2>
                  <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
                    {assignedRequests.map((r) => (
                      <li key={r.id} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/pro/requests/${r.id}`)}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-gray-900 font-medium">Request {r.id.slice(0, 8)}</div>
                            <div className="text-sm text-gray-600">Status: {r.status}</div>
                            {r.postal_code && (
                              <div className="text-sm text-gray-600">Postal code: {r.postal_code}</div>
                            )}
                            {r.message_to_pro && (
                              <div className="text-sm text-gray-700 mt-1 line-clamp-2">{r.message_to_pro}</div>
                            )}
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            <div>{new Date(r.created_at).toLocaleString()}</div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {matchingRequests.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Potential matches</h2>
                  <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
                    {matchingRequests.map((r) => (
                      <li key={r.id} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/pro/requests/${r.id}`)}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-gray-900 font-medium">Request {r.id.slice(0, 8)}</div>
                            <div className="text-sm text-gray-600">Status: {r.status}</div>
                            {r.postal_code && (
                              <div className="text-sm text-gray-600">Postal code: {r.postal_code}</div>
                            )}
                            {r.message_to_pro && (
                              <div className="text-sm text-gray-700 mt-1 line-clamp-2">{r.message_to_pro}</div>
                            )}
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            <div>{new Date(r.created_at).toLocaleString()}</div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}


