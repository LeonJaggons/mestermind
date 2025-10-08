"use client";

import { Button } from "@/components/ui/button";
import LocationMap from "@/components/LocationMap";
import type { CustomerRequest, Service, Offer } from "@/lib/api";

interface Props {
  request?: CustomerRequest | null;
  service: Service | null;
  offer: Offer | null;
  mapLocation?: { lat: number | null; lon: number | null; name: string; city_name: string };
  onProposeTime: (message: string) => void;
}

function formatWeeklyAvailability(av: unknown): string {
  if (!av || typeof av !== 'object' || !('type' in av) || av.type !== "weekly") return "Not specified";
  const avObj = av as { type: string; days?: unknown[]; start?: string; end?: string };
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayNames = (avObj.days || [])
    .filter((d: unknown): d is number => Number.isInteger(d) && typeof d === 'number' && d >= 0 && d <= 6)
    .map((d: number) => labels[d]);
  if (dayNames.length === 0) return "Not specified";
  return `${dayNames.join(", ")} • ${avObj.start || ''}–${avObj.end || ''}`;
}

function getAvailability(request?: CustomerRequest | null): unknown | null {
  if (!request) return null;
  const requestWithAvailability = request as CustomerRequest & { availability?: unknown };
  const top = requestWithAvailability?.availability;
  if (top && typeof top === 'object' && top !== null && 'type' in top && (top as { type: string }).type === "weekly") return top;
  const requestWithAnswers = request as CustomerRequest & { answers?: Record<string, unknown> };
  const a = requestWithAnswers?.answers?.availability;
  if (!a) return null;
  if (a && typeof a === "object" && "value" in a) return (a as { value: unknown }).value;
  return a;
}

export default function RequestOfferSidebar({ request, service, offer, mapLocation, onProposeTime }: Props) {
  const availability = getAvailability(request);
  return (
    <aside className="space-y-6 w-[500px] flex flex-col items-center justify-start sticky top-0 h-screen overflow-y-auto border-l border-gray-200 bg-white">
      {!request ? (
        <div className="w-[500px] text-sm text-gray-600">Select a conversation to view details.</div>
      ) : (
        <>
      {/* Map section matching request details page */}
      <div className="w-[500px] border border-gray-200 min-h-64 overflow-hidden">
        <LocationMap
          postalCode={request?.postal_code || undefined}
          lat={mapLocation?.lat || undefined}
          lon={mapLocation?.lon || undefined}
          locationName={mapLocation?.name || request?.postal_code || undefined}
          className="h-64"
        />
        <div className="p-4 bg-transparent">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-medium text-gray-900">
                {mapLocation?.name || request.postal_code || "Location not specified"}
              </div>
              <div className="text-sm text-gray-500">
                {mapLocation?.city_name && mapLocation.city_name !== mapLocation.name ? `${mapLocation.city_name}, Hungary` : "Location"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {offer ? (
        <div className="w-[500px] space-y-6">
          {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Offer Sent</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Price:</span>
                <span className="text-2xl font-semibold text-gray-900">${offer.price} {offer.currency}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Status:</span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">{offer.status}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Sent:</span>
                <span className="text-gray-900">{new Date(offer.created_at).toLocaleDateString()}</span>
              </div>
              {offer.message && (
                <div className="pt-3 border-t border-blue-200">
                  <span className="text-gray-600 block mb-2">Message:</span>
                  <p className="text-gray-900 whitespace-pre-wrap">{offer.message}</p>
                </div>
              )}
            </div>
          </div> */}
          <div className="w-full   bg-white rounded-none">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Job Details</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-900">Job type</div>
                <div className="text-sm text-gray-600">{service?.name || "Service Request"}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-md">
                <div className="text-sm font-medium text-gray-900 mb-1">Availability</div>
                <div className="text-sm text-gray-700">{formatWeeklyAvailability(availability)}</div>
              </div>
              {request.message_to_pro && (
                <div className="mt-2 p-3 bg-gray-50 rounded-md">
                  <div className="text-sm font-medium text-gray-900 mb-2">Customer Message</div>
                  <div className="text-sm text-gray-700">{request.message_to_pro}</div>
                </div>
              )}
            </div>
          </div>
          <div className="p-4">
            <div className="text-sm font-medium text-gray-900 mb-1">Next step</div>
            <p className="text-xs text-gray-600 mb-2">Prompt the customer to pick a time. Use their stated availability.</p>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => {
                const av = availability as { type?: string; days?: unknown[]; start?: string } | null;
                const dayLabel = Array.isArray(av?.days) && av.days.length > 0 ? ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][av.days[0] as number] : "Mon";
                const text = av && av.type === "weekly"
                  ? `I can schedule within your availability (${formatWeeklyAvailability(av)}). Would ${av.start} on ${dayLabel} work for you?`
                  : `When would you like to schedule the job?`;
                onProposeTime(text);
              }}
            >
              Propose a time
            </Button>
          </div>
        </div>
      ) : (
        <div className="w-full text-sm text-gray-600">No offer sent yet. Open the request to send a quote.</div>
      )}
        </>
      )}
    </aside>
  );
}


