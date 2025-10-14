import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { subscribeToAuthChanges } from "@/lib/auth";
import {
  fetchProStatus,
  listCustomerRequests,
  fetchServiceById,
  checkLeadAccess,
  type CustomerRequest,
  type Service,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProLayout from "@/components/pro/ProLayout";
import {
  MapPin,
  Clock,
  Wrench,
  DollarSign,
  Users,
  Star,
  TrendingUp,
  Lock,
  CheckCircle2,
} from "lucide-react";

export default function ProLeadsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [mesterId, setMesterId] = useState<string | null>(null);
  const [allLeads, setAllLeads] = useState<CustomerRequest[]>([]);
  const [purchasedLeads, setPurchasedLeads] = useState<Set<string>>(new Set());
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
        // Fetch all leads (both matched and purchased)
        const leads = await listCustomerRequests({
          mester_id: mesterId!,
          match_mester_services: true,
          status: "OPEN",
        });

        setAllLeads(leads);

        // Check which leads have been purchased
        const purchased = new Set<string>();
        await Promise.all(
          leads.map(async (lead) => {
            try {
              const hasAccess = await checkLeadAccess(lead.id, mesterId!);
              if (hasAccess) {
                purchased.add(lead.id);
              }
            } catch (e) {
              console.warn(`Failed to check access for lead ${lead.id}:`, e);
            }
          })
        );
        setPurchasedLeads(purchased);

        // Fetch service information
        const uniqueServiceIds = [...new Set(leads.map((r) => r.service_id))];
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

  const availableLeads = allLeads.filter(lead => !purchasedLeads.has(lead.id));
  const activeLeads = allLeads.filter(lead => purchasedLeads.has(lead.id));

  if (checking) {
    return (
      <ProLayout>
        <div className="text-center py-12">Loading...</div>
      </ProLayout>
    );
  }

  return (
    <ProLayout>
      <div>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Leads</h1>
          <p className="text-gray-600">
            Discover new opportunities and manage your active leads
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Available Leads</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {availableLeads.length}
                  </p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Leads</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {activeLeads.length}
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Response Rate</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">85%</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Star className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="available" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="available">
              Available ({availableLeads.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Active ({activeLeads.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-4">
            {loading && (
              <div className="text-center py-12 text-gray-600">
                Loading leads...
              </div>
            )}

            {!loading && error && (
              <div className="text-center py-12 text-red-600">{error}</div>
            )}

            {!loading && !error && availableLeads.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No available leads
                  </h3>
                  <p className="text-gray-600 mb-6">
                    New leads matching your services will appear here
                  </p>
                  <Button onClick={() => router.push("/pro/onboarding")}>
                    Update your services
                  </Button>
                </CardContent>
              </Card>
            )}

            {!loading &&
              !error &&
              availableLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  service={services.get(lead.service_id)}
                  isPurchased={false}
                  onClick={() => router.push(`/pro/requests/${lead.id}`)}
                />
              ))}
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            {!loading && !error && activeLeads.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No active leads
                  </h3>
                  <p className="text-gray-600">
                    Purchased leads will appear here
                  </p>
                </CardContent>
              </Card>
            )}

            {!loading &&
              !error &&
              activeLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  service={services.get(lead.service_id)}
                  isPurchased={true}
                  onClick={() => router.push(`/pro/requests/${lead.id}`)}
                />
              ))}
          </TabsContent>
        </Tabs>
      </div>
    </ProLayout>
  );
}

// Lead Card Component
function LeadCard({
  lead,
  service,
  isPurchased,
  onClick,
}: {
  lead: CustomerRequest;
  service?: Service;
  isPurchased: boolean;
  onClick: () => void;
}) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const getCustomerInitial = () => {
    if (lead.first_name) return lead.first_name[0].toUpperCase();
    if (lead.contact_email) return lead.contact_email[0].toUpperCase();
    return "C";
  };

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
              {getCustomerInitial()}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg mb-2">
                {service?.name || "Service Request"}
              </CardTitle>
              <div className="flex flex-wrap gap-2 mb-3">
                {isPurchased ? (
                  <Badge className="bg-green-600 text-white">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Purchased
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-blue-500 text-blue-700">
                    <Lock className="h-3 w-3 mr-1" />
                    Available
                  </Badge>
                )}
                {service?.requires_license && (
                  <Badge variant="outline" className="border-orange-500 text-orange-700">
                    License Required
                  </Badge>
                )}
                <Badge variant="secondary" className="text-gray-600">
                  {formatDate(lead.created_at)}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Location */}
          {lead.postal_code && (
            <div className="flex items-center gap-2 text-gray-700">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="text-sm">
                {lead.postal_code}
              </span>
            </div>
          )}

          {/* Budget */}
          {typeof lead.budget_estimate === "number" && !isNaN(lead.budget_estimate) && (
            <div className="flex items-center gap-2 text-gray-700">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium">
                {new Intl.NumberFormat("hu-HU").format(lead.budget_estimate)} Ft
              </span>
            </div>
          )}

          {/* Service type */}
          {service && (
            <div className="flex items-center gap-2 text-gray-700">
              <Wrench className="h-4 w-4 text-gray-400" />
              <span className="text-sm">
                {service.indoor_outdoor === "indoor"
                  ? "Indoor work"
                  : service.indoor_outdoor === "outdoor"
                  ? "Outdoor work"
                  : "Indoor/Outdoor"}
              </span>
            </div>
          )}

          {/* Urgency */}
          <div className="flex items-center gap-2 text-gray-700">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-sm">Needs soon</span>
          </div>
        </div>

        {/* Customer Message Preview */}
        {lead.message_to_pro && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-700 line-clamp-2">
              "{lead.message_to_pro}"
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex gap-3">
          {isPurchased ? (
            <>
              <Button
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `/pro/requests/${lead.id}`;
                }}
              >
                View Details
              </Button>
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `/pro/messages`;
                }}
              >
                Message Customer
              </Button>
            </>
          ) : (
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `/pro/requests/${lead.id}`;
              }}
            >
              View & Purchase Lead
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
