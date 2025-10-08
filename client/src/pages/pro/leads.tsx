import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { subscribeToAuthChanges } from "@/lib/auth";
import {
  fetchProStatus,
  listCustomerRequests,
  fetchServiceById,
  type CustomerRequest,
  type Service,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Tag,
  Calendar,
  Plug,
  MapPin,
  Clock,
  Phone,
  Wrench,
  DollarSign,
} from "lucide-react";

export default function ProLeadsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [mesterId, setMesterId] = useState<string | null>(null);
  const [assignedRequests, setAssignedRequests] = useState<CustomerRequest[]>(
    [],
  );
  const [matchingRequests, setMatchingRequests] = useState<CustomerRequest[]>(
    [],
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
    if (checking) return;
    setLoading(true);
    setError(null);
    async function load() {
      try {
        // Fetch requests explicitly assigned to this mester (only OPEN, not drafts)
        const assigned = mesterId
          ? await listCustomerRequests({ mester_id: mesterId, status: "OPEN" })
          : [];
        // Fetch union (assigned + service matches) then remove assigned to get only matches (only OPEN, not drafts)
        const union = mesterId
          ? await listCustomerRequests({
              mester_id: mesterId,
              match_mester_services: true,
              status: "OPEN",
            })
          : [];

        const assignedSet = new Set(assigned.map((r) => r.id));
        const dedupAssigned: CustomerRequest[] = [];
        for (const r of assigned) {
          if (!dedupAssigned.find((x) => x.id === r.id)) dedupAssigned.push(r);
        }

        const matchesOnly: CustomerRequest[] = [];
        for (const r of union) {
          if (assignedSet.has(r.id)) continue;
          if (!matchesOnly.find((x) => x.id === r.id)) matchesOnly.push(r);
        }

        setAssignedRequests(dedupAssigned);
        setMatchingRequests(matchesOnly);

        // Fetch service information for all unique service IDs
        const allRequests = [...dedupAssigned, ...matchesOnly];
        const uniqueServiceIds = [
          ...new Set(allRequests.map((r) => r.service_id)),
        ];

        const serviceMap = new Map<string, Service>();
        for (const serviceId of uniqueServiceIds) {
          try {
            const service = await fetchServiceById(serviceId);
            serviceMap.set(serviceId, service);
          } catch (e) {
            console.warn(`Failed to fetch service ${serviceId}:`, e);
          }
        }
        setServices(serviceMap);
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
      <div className="flex h-screen">
        {/* Left Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          {/* Navigation */}
          <div className="p-6">
            <nav className="space-y-2">
              <div className="flex items-center space-x-3 p-2 rounded-lg bg-blue-50">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-900">Leads</span>
              </div>
              <div
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push("/pro/offers")}
              >
                <Tag className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-600">
                  Offers
                </span>
              </div>
            </nav>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 mx-6"></div>

          {/* Action Items */}
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                <div className="text-sm">
                  <p className="text-gray-900">Review your availability and</p>
                  <button className="text-blue-600 hover:underline">
                    tell us when you&apos;re busy.
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start space-x-3">
                <Plug className="h-5 w-5 text-gray-500 mt-0.5" />
                <div className="text-sm">
                  <p className="text-gray-900">
                    Connect your content management tools or calendar to
                  </p>
                  <button className="text-blue-600 hover:underline">
                    Mestermind to streamline workflows.
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col items-center justify-start p-12">
          <div className="max-w-2xl w-full">
            {/* Welcome Message */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-semibold text-gray-900 mb-4">
                Welcome to Mestermind.
              </h1>
              <p className="text-lg text-gray-600">
                Leads that exactly match your preferences appear here.
              </p>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="text-center">
                <div className="text-gray-600 mb-8">Loading leads…</div>
              </div>
            )}

            {/* Error State */}
            {!loading && error && (
              <div className="text-center">
                <div className="text-red-600 mb-8">{error}</div>
              </div>
            )}

            {/* No Leads State */}
            {!loading &&
              !error &&
              assignedRequests.length === 0 &&
              matchingRequests.length === 0 && (
                <div className="text-center">
                  {/* Example Lead Card */}
                  <Card className="mb-8 text-left bg-white border border-gray-200 rounded-lg shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-500">
                            EX
                          </span>
                        </div>
                        <div>
                          <CardTitle className="text-sm text-gray-600">
                            (Example) A customer wants your availability.
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <div className="h-3 bg-gray-200 rounded w-32"></div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <div className="h-3 bg-gray-200 rounded w-28"></div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Call to Action */}
                  <p className="text-gray-600 mb-6">
                    Start getting leads by finishing account setup.
                  </p>

                  {/* Finish Setup Button */}
                  <Button
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-base font-medium"
                    onClick={() => router.push("/pro/onboarding")}
                  >
                    Finish setup
                  </Button>
                </div>
              )}

            {/* Real Leads */}
            {!loading &&
              !error &&
              (assignedRequests.length > 0 || matchingRequests.length > 0) && (
                <div className="space-y-4">
                  {assignedRequests.map((request) => (
                    <LeadCard
                      key={request.id}
                      request={request}
                      service={services.get(request.service_id)}
                      isAssigned={true}
                      onClick={() => router.push(`/pro/requests/${request.id}`)}
                    />
                  ))}
                  {matchingRequests.map((request) => (
                    <LeadCard
                      key={request.id}
                      request={request}
                      service={services.get(request.service_id)}
                      isAssigned={false}
                      onClick={() => router.push(`/pro/requests/${request.id}`)}
                    />
                  ))}
                </div>
              )}
          </div>
        </div>
      </div>
    </main>
  );
}

// LeadCard component for displaying individual leads
function LeadCard({
  request,
  service,
  isAssigned,
  onClick,
}: {
  request: CustomerRequest;
  service?: Service;
  isAssigned: boolean;
  onClick: () => void;
}) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getServiceDisplayName = () => {
    if (service) {
      return service.name;
    }
    return "Service Request";
  };

  const getCustomerDisplayName = () => {
    if (request.first_name && request.last_name) {
      return request.first_name[0] + ". " + request.last_name[0] + ".";
    }
    if (request.contact_email) {
      return request.contact_email.split("@")[0];
    }
    return "Customer";
  };

  const getCustomerInitial = () => {
    const name = getCustomerDisplayName();
    return name.charAt(0).toUpperCase();
  };

  return (
    <Card
      className="text-left bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer "
      onClick={onClick}
    >
      <div className="px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-blue-600">
                {getCustomerInitial()}
              </span>
            </div>
            <div className="flex-1">
              <CardTitle className="text-sm text-gray-900">
                {getCustomerDisplayName()} needs {getServiceDisplayName()}
              </CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                {isAssigned && (
                  <Badge variant="secondary" className="text-xs">
                    Assigned to you
                  </Badge>
                )}
                {service?.requires_license && (
                  <Badge
                    variant="outline"
                    className="text-xs text-orange-600 border-orange-200"
                  >
                    License Required
                  </Badge>
                )}
                {service?.is_specialty && (
                  <Badge
                    variant="outline"
                    className="text-xs text-purple-600 border-purple-200"
                  >
                    Specialty
                  </Badge>
                )}
              </div>
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
            {service.indoor_outdoor && service.indoor_outdoor !== "both" && (
              <Badge variant="outline" className="text-xs ml-2">
                {service.indoor_outdoor === "indoor" ? "Indoor" : "Outdoor"}
              </Badge>
            )}
          </div>
        )}

        {/* Location */}
        {request.postal_code && (
          <div className="flex items-center space-x-3">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              Postal code: {request.postal_code}
            </span>
          </div>
        )}

        {/* Contact Information */}
        {request.message_to_pro && (
          <div className="mt-3 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-700 line-clamp-2">
              {request.message_to_pro}
            </p>
          </div>
        )}

        {/* Question Answers Preview */}
        {/* {request.answers && Object.keys(request.answers).length > 0 && (
          <div className="mt-3 p-3 bg-blue-50 rounded-md">
            <p className="text-xs text-blue-700 font-medium mb-2">Customer provided additional details:</p>
            <div className="space-y-1">
              {Object.entries(request.answers).slice(0, 2).map(([key, entry]) => {
                const value = entry && typeof entry === 'object' && 'value' in entry ? entry.value : entry;
                return (
                  <div key={key} className="text-xs text-blue-600">
                    <span className="font-medium">{key}:</span> {String(value)}
                  </div>
                );
              })}
              {Object.keys(request.answers).length > 2 && (
                <div className="text-xs text-blue-500 italic">
                  +{Object.keys(request.answers).length - 2} more details...
                </div>
              )}
            </div>
          </div>
        )} */}
      </CardContent>
    </Card>
  );
}
