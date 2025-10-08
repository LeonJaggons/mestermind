import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { listMesters, type ListMestersItem, type ListMestersResponse, fetchMesterById, type MesterDetailResponse, addMesterService, updateMesterService, deleteMesterService, fetchAllServices, type Service } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function AdminMestersPage() {
  const [query, setQuery] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [items, setItems] = useState<ListMestersItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MesterDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const s = await fetchAllServices();
        if (!aborted) setServices(s);
      } catch {}
    })();
    return () => { aborted = true; };
  }, []);

  const isActiveValue = useMemo(() => {
    if (filterActive === "active") return true;
    if (filterActive === "inactive") return false;
    return undefined;
  }, [filterActive]);

  async function load(reset = true) {
    try {
      setLoading(true);
      setError(null);
      const resp: ListMestersResponse = await listMesters({ q: query || undefined, is_active: isActiveValue, limit: 25, cursor: reset ? undefined : cursor || undefined });
      setCursor(resp.next_cursor || null);
      setItems(prev => reset ? resp.items : [...prev, ...resp.items]);
    } catch (e: unknown) {
      setError((e as Error)?.message || "Failed to load mesters");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, isActiveValue]);

  useEffect(() => {
    let aborted = false;
    if (!selectedId) { setDetail(null); return; }
    (async () => {
      try {
        setDetailLoading(true);
        const d = await fetchMesterById(selectedId);
        if (!aborted) setDetail(d);
      } catch (e: unknown) {
        if (!aborted) setError((e as Error)?.message || "Failed to load mester");
      } finally {
        if (!aborted) setDetailLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [selectedId]);

  return (
    <AdminLayout>
      <div className=" space-y-6">
      <div>
            <h1 className="text-2xl font-bold text-gray-900">Mesters Management</h1>
            <p className="text-gray-600">Manage your service providers</p>
          </div>
        <div className="flex items-center gap-3">
          <Input placeholder="Search mesters..." value={query} onChange={e => setQuery(e.target.value)} />
          <select className="border rounded px-3 py-2" value={filterActive} onChange={e => setFilterActive(e.target.value as "all" | "active" | "inactive")}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <Button onClick={() => void load(true)} disabled={loading}>Search</Button>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-5 space-y-3 max-h-[75vh] overflow-auto">
            {items.map(m => (
              <Card key={m.id} className={`p-4 cursor-pointer ${selectedId === m.id ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setSelectedId(m.id)}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{m.full_name}</div>
                    <div className="text-sm text-gray-500">{m.email || '—'} • {m.phone || '—'}</div>
                  </div>
                  <div className="text-sm">
                    <span className={`px-2 py-1 rounded ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{m.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </Card>
            ))}
            <div className="pt-2">
              <Button variant="secondary" onClick={() => void load(false)} disabled={!cursor || loading}>{cursor ? 'Load more' : 'No more'}</Button>
            </div>
          </div>

          <div className="col-span-7">
            {!selectedId && (
              <Card className="p-8 text-center text-gray-500">Select a mester to view details</Card>
            )}
            {selectedId && detailLoading && (
              <Card className="p-8 text-center">Loading…</Card>
            )}
            {selectedId && detail && (
              <MesterDetailPanel
                detail={detail}
                services={services}
                onRefresh={() => void (async () => setDetail(await fetchMesterById(selectedId)) )()}
              />
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function MesterDetailPanel({ detail, services, onRefresh }: { detail: MesterDetailResponse; services: Service[]; onRefresh: () => Promise<void> | void }) {
  const [adding, setAdding] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const svcMap = useMemo(() => new Map(services.map(s => [s.id, s])), [services]);

  async function handleAddService() {
    try {
      setAdding(true);
      await addMesterService(detail.mester.id, {
        service_id: selectedServiceId,
        price_hour_min: minPrice ? Number(minPrice) : undefined,
        price_hour_max: maxPrice ? Number(maxPrice) : undefined,
        pricing_notes: notes || undefined,
        is_active: true,
      });
      setSelectedServiceId("");
      setMinPrice("");
      setMaxPrice("");
      setNotes("");
      await onRefresh();
    } catch (e) {
      // no-op surfacing via UI toast could be added later
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-semibold">{detail.mester.full_name}</div>
            <div className="text-sm text-gray-500">{detail.mester.email || '—'} • {detail.mester.phone || '—'}</div>
          </div>
          <div className="space-x-2">
            <span className={`px-2 py-1 rounded ${detail.mester.is_verified ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{detail.mester.is_verified ? 'Verified' : 'Unverified'}</span>
            <span className={`px-2 py-1 rounded ${detail.mester.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{detail.mester.is_active ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
        {detail.mester.bio && <p className="mt-3 text-gray-700 whitespace-pre-line">{detail.mester.bio}</p>}
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-lg font-medium">Services</div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Add service</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add service to mester</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <select className="w-full border rounded px-3 py-2" value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)}>
                  <option value="">Select a service…</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <Input type="number" placeholder="Min hourly price" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
                  <Input type="number" placeholder="Max hourly price" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
                </div>
                <Input placeholder="Pricing notes" value={notes} onChange={e => setNotes(e.target.value)} />
                <div className="flex justify-end">
                  <Button onClick={() => void handleAddService()} disabled={adding || !selectedServiceId}>Add</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          {detail.services.length === 0 && (
            <div className="text-sm text-gray-500">No services yet.</div>
          )}
          {detail.services.map(link => (
            <div key={link.id} className="flex items-center justify-between border rounded px-4 py-3">
              <div>
                <div className="font-medium">{svcMap.get(link.service_id)?.name || link.service_id}</div>
                <div className="text-sm text-gray-500">
                  {link.price_hour_min ? `${link.price_hour_min} Ft` : '—'} - {link.price_hour_max ? `${link.price_hour_max} Ft` : '—'}
                  {link.pricing_notes ? ` • ${link.pricing_notes}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={async () => {
                  const newActive = !link.is_active;
                  await updateMesterService(link.id, { is_active: newActive });
                  await onRefresh();
                }}>{link.is_active ? 'Deactivate' : 'Activate'}</Button>
                <Button variant="destructive" onClick={async () => { await deleteMesterService(link.id); await onRefresh(); }}>Remove</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}



