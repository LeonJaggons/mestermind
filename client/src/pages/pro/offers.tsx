import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { subscribeToAuthChanges } from "@/lib/auth";
import {
  fetchProStatus,
  listOffers,
  getRequestById,
  fetchServiceById,
  type Offer,
  type CustomerRequest,
  type Service,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProLayout from "@/components/pro/ProLayout";
import {
  MapPin,
  Wrench,
  DollarSign,
} from "lucide-react";

export default function ProOffersPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [mesterId, setMesterId] = useState<string | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [requests, setRequests] = useState<Map<string, CustomerRequest>>(
    new Map(),
  );
  const [services, setServices] = useState<Map<string, Service>>(new Map());
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
    return () => {
      if (unsub) unsub();
    };
  }, [router]);

  useEffect(() => {
    if (checking || !mesterId) return;
    setLoading(true);
    setError(null);
    async function load() {
      try {
        // Fetch all offers for this mester
        const offersList = await listOffers({ mester_id: mesterId ?? undefined });
        setOffers(offersList);

        // Fetch request details for each offer
        const requestMap = new Map<string, CustomerRequest>();
        const serviceMap = new Map<string, Service>();

        for (const offer of offersList) {
          try {
            // Fetch the request
            const request = await getRequestById(offer.request_id);
            if (request) {
              requestMap.set(offer.request_id, request);

              // Fetch the service
              try {
                const service = await fetchServiceById(request.service_id);
                serviceMap.set(request.service_id, service);
              } catch (e) {
                console.warn(
                  `Failed to fetch service ${request.service_id}:`,
                  e,
                );
              }
            }
          } catch (e) {
            console.warn(`Failed to fetch request ${offer.request_id}:`, e);
          }
        }

        setRequests(requestMap);
        setServices(serviceMap);
      } catch (e) {
        setError("Failed to load offers");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [checking, mesterId]);

  if (checking) {
    return (
      <ProLayout>
        <div>Loading…</div>
      </ProLayout>
    );
  }

  return (
    <ProLayout>
      <div>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            Your Offers
          </h1>
          <p className="text-lg text-gray-600">
            Track all requests where you&apos;ve sent offers.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="text-gray-600">Loading offers…</div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="text-center py-12">
            <div className="text-red-600">{error}</div>
          </div>
        )}

        {/* No Offers State */}
        {!loading && !error && offers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-600 mb-4">
              You haven&apos;t sent any offers yet.
            </div>
            <p className="text-sm text-gray-500">
              When you send an offer to a customer request, it will appear
              here.
            </p>
          </div>
        )}

        {/* Offers List */}
        {!loading && !error && offers.length > 0 && (
          <div className="space-y-4">
            {offers.map((offer) => {
              const request = requests.get(offer.request_id);
              const service = request
                ? services.get(request.service_id)
                : undefined;
              return (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  request={request}
                  service={service}
                  onClick={() =>
                    router.push(`/pro/requests/${offer.request_id}`)
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </ProLayout>
  );
}

// OfferCard component for displaying individual offers
function OfferCard({
  offer,
  request,
  service,
  onClick,
}: {
  offer: Offer;
  request?: CustomerRequest;
  service?: Service;
  onClick: () => void;
}) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getServiceDisplayName = () => {
    if (service) {
      return service.name;
    }
    return "Service Request";
  };

  const getCustomerDisplayName = () => {
    if (request?.first_name && request?.last_name) {
      return request.first_name[0] + ". " + request.last_name[0] + ".";
    }
    if (request?.contact_email) {
      return request.contact_email.split("@")[0];
    }
    return "Customer";
  };

  const getCustomerInitial = () => {
    const name = getCustomerDisplayName();
    return name.charAt(0).toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "ACCEPTED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      case "EXPIRED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card
      className="text-left bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="px-6 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-blue-600">
                {getCustomerInitial()}
              </span>
            </div>
            <div className="flex-1">
              <CardTitle className="text-sm text-gray-900">
                {getCustomerDisplayName()} - {getServiceDisplayName()}
              </CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge className={`text-xs ${getStatusColor(offer.status)}`}>
                  {offer.status}
                </Badge>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <span className="text-lg font-semibold text-gray-900">
                ${offer.price}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Sent {formatDate(offer.created_at)}
            </div>
          </div>
        </div>
      </div>
      <CardContent className="space-y-3">
        {/* Service Information */}
        {service && (
          <div className="flex items-center space-x-3">
            <Wrench className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{service.name}</span>
          </div>
        )}

        {/* Location */}
        {request?.postal_code && (
          <div className="flex items-center space-x-3">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              Postal code: {request.postal_code}
            </span>
          </div>
        )}

        {/* Offer Message */}
        {offer.message && (
          <div className="mt-3 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-700 line-clamp-2">
              {offer.message}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
