import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { subscribeToAuthChanges } from "@/lib/auth";
import {
  getCustomerRequest,
  fetchQuestions,
  fetchServiceById,
  getCoordinatesByPostalCode,
  fetchProStatus,
  createOffer,
  listOffers,
  checkLeadAccess,
  listThreads,
  type CustomerRequest,
  type Question,
  type Service,
  type Offer,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  CheckCircle,
  MessageCircle,
  MapPin,
  DollarSign,
  Wrench,
  User,
  Lock,
  TrendingUp,
  Award,
  Users,
  ArrowLeft,
} from "lucide-react";
import LocationMap from "@/components/LocationMap";
import PaywallModal from "@/components/PaywallModal";
import SendOfferModal from "@/components/SendOfferModal";
import { AppointmentProposalModal } from "@/components/AppointmentProposalModal";
import ProLayout from "@/components/pro/ProLayout";

export default function RequestDetailPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<CustomerRequest | null>(null);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [mesterId, setMesterId] = useState<string | null>(null);
  const [existingOffer, setExistingOffer] = useState<Offer | null>(null);
  const [hasLeadAccess, setHasLeadAccess] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [locationData, setLocationData] = useState<{
    lat: number | null;
    lon: number | null;
    name: string;
    city_name: string;
  } | null>(null);

  useEffect(() => {
    const unsub = subscribeToAuthChanges(async (user) => {
      if (!user?.email) {
        router.replace("/login");
        return;
      }
      try {
        const status = await fetchProStatus(user.email);
        if (!status.is_pro || !status.mester_id) {
          router.replace("/pro/onboarding");
          return;
        }
        setMesterId(status.mester_id);
      } finally {
        setChecking(false);
      }
    });
    return () => {
      if (unsub) unsub();
    };
  }, [router]);

  useEffect(() => {
    if (checking || !id || !mesterId) return;
    
    setLoading(true);
    setError(null);
    
    (async () => {
      try {
        const req = await getCustomerRequest(id);
        setRequest(req);

        // Check lead access
        const hasAccess = await checkLeadAccess(id, mesterId);
        setHasLeadAccess(hasAccess);

        // Get thread ID if exists
        try {
          const threads = await listThreads({ mester_id: mesterId });
          const thread = threads.find(t => t.request_id === id);
          if (thread) setThreadId(thread.id);
        } catch (e) {
          console.warn("Failed to get thread:", e);
        }

        const qs = await fetchQuestions({
          question_set_id: req.question_set_id,
          limit: 1000,
        });
        setQuestions(qs);

        // Fetch service information
        try {
          const serviceData = await fetchServiceById(req.service_id);
          setService(serviceData);
        } catch (e) {
          console.warn("Failed to fetch service:", e);
        }

        // Fetch location coordinates
        if (req.postal_code) {
          try {
            const coords = await getCoordinatesByPostalCode(req.postal_code);
            setLocationData({
              lat: coords.lat,
              lon: coords.lon,
              name: coords.name,
              city_name: coords.city_name,
            });
          } catch (e) {
            console.warn("Failed to fetch coordinates:", e);
          }
        }

        // Check for existing offers
        try {
          const offers = await listOffers({
            request_id: id,
            mester_id: mesterId,
          });
          if (offers && offers.length > 0) {
            setExistingOffer(offers[0]);
          }
        } catch (e) {
          console.warn("Failed to check for existing offers:", e);
        }
      } catch (e) {
        setError("Failed to load request");
      } finally {
        setLoading(false);
      }
    })();
  }, [checking, id, mesterId]);

  const questionIdToLabel = useMemo(() => {
    const map = new Map<string, string>();
    (questions || []).forEach((q) => {
      map.set(q.id, q.label);
    });
    return map;
  }, [questions]);

  function renderAnswer(key: string, entry: unknown) {
    const value =
      entry && typeof entry === "object" && "value" in entry
        ? entry.value
        : entry;
    const qid =
      entry && typeof entry === "object" && "question_id" in entry
        ? String(entry.question_id)
        : undefined;
    const label = qid ? questionIdToLabel.get(qid) : undefined;

    const displayLabel =
      label ||
      key.split("_").join(" ").charAt(0).toUpperCase() +
        key.split("_").join(" ").slice(1);

    return (
      <div key={key} className="border-b border-gray-200 pb-3 last:border-0">
        <span className="text-sm font-medium text-gray-500 block mb-1">
          {displayLabel}
        </span>
        <span className="text-base text-gray-900">{formatValue(value)}</span>
      </div>
    );
  }

  function formatValue(v: unknown): string {
    if (v === null || v === undefined) return "—";
    if (Array.isArray(v)) {
      return v
        .map((item) => {
          const str = String(item).split("_").join(" ");
          return str.charAt(0).toUpperCase() + str.slice(1);
        })
        .join(", ");
    }
    if (typeof v === "object") return JSON.stringify(v);
    const str = String(v).split("_").join(" ");
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  if (checking || loading) {
    return (
      <ProLayout>
        <div className="text-center py-12">Loading...</div>
      </ProLayout>
    );
  }

  if (error || !request) {
    return (
      <ProLayout>
        <div className="text-center py-12 text-red-600">
          {error || "Request not found"}
        </div>
      </ProLayout>
    );
  }

  return (
    <ProLayout>
      <PaywallModal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={() => {
          setShowPaywall(false);
          // Reload page to reflect purchase
          window.location.reload();
        }}
        audience="mester"
        threadId={threadId || undefined}
        mesterId={mesterId || undefined}
        requestId={request.id}
      />

      {mesterId && request && (
        <SendOfferModal
          isOpen={showOfferModal}
          onClose={() => setShowOfferModal(false)}
          requestId={request.id}
          mesterId={mesterId}
          customerBudget={typeof request.budget_estimate === 'number' ? request.budget_estimate : undefined}
          serviceName={service?.name}
          onSuccess={() => {
            // Reload offers
            if (mesterId) {
              listOffers({
                request_id: request.id,
                mester_id: mesterId,
              }).then((offers) => {
                if (offers && offers.length > 0) {
                  setExistingOffer(offers[0]);
                }
              });
            }
          }}
        />
      )}

      {/* Appointment Proposal Modal */}
      {threadId && mesterId && (
        <AppointmentProposalModal
          isOpen={showAppointmentModal}
          onClose={() => setShowAppointmentModal(false)}
          threadId={threadId}
          mesterId={mesterId}
          onProposalCreated={() => {
            setShowAppointmentModal(false);
            // Optionally show success message or refresh data
          }}
        />
      )}

      <div>
        {/* Header with back button */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {service?.name || "Service Request"}
              </h1>
              <div className="flex items-center gap-3">
                <Badge variant={hasLeadAccess ? "default" : "secondary"}>
                  {hasLeadAccess ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Purchased
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3 mr-1" />
                      Not Purchased
                    </>
                  )}
                </Badge>
                {service?.requires_license && (
                  <Badge variant="outline" className="border-orange-500 text-orange-700">
                    License Required
                  </Badge>
                )}
              </div>
            </div>
            {!hasLeadAccess && (
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowPaywall(true)}
              >
                <Lock className="h-4 w-4 mr-2" />
                Purchase Lead
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Map */}
            <Card>
              <CardContent className="p-0">
                <LocationMap
                  postalCode={request.postal_code || undefined}
                  lat={locationData?.lat || undefined}
                  lon={locationData?.lon || undefined}
                  locationName={locationData?.name || request.postal_code || undefined}
                  className="h-64 rounded-t-lg"
                />
                <div className="p-4">
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <span className="font-medium">
                      {locationData?.name || request.postal_code || "Location not specified"}
                    </span>
                  </div>
                  {locationData?.city_name && (
                    <p className="text-sm text-gray-500 ml-7">
                      {locationData.city_name}, Hungary
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Job Details */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Job Details
                </h2>

                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="details">Full Details</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    {/* Service Type */}
                    <div className="flex items-start gap-3">
                      <Wrench className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Service Type</p>
                        <p className="text-base text-gray-900">{service?.name || "Service"}</p>
                      </div>
                    </div>

                    {/* Budget */}
                    {typeof request.budget_estimate === "number" &&
                      !isNaN(request.budget_estimate) && (
                        <div className="flex items-start gap-3">
                          <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-500">
                              Customer Budget
                            </p>
                            <p className="text-base font-semibold text-gray-900">
                              {new Intl.NumberFormat("hu-HU").format(
                                request.budget_estimate
                              )}{" "}
                              Ft
                            </p>
                          </div>
                        </div>
                      )}

                    {/* Customer Message */}
                    {request.message_to_pro && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-blue-900 mb-2">
                          Message from customer:
                        </p>
                        <p className="text-gray-700">{request.message_to_pro}</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="details" className="space-y-3">
                    {request.answers && Object.keys(request.answers).length > 0 ? (
                      Object.entries(request.answers)
                        .filter(([key]) => key !== "availability")
                        .map(([key, entry]) => renderAnswer(key, entry))
                    ) : (
                      <p className="text-gray-500 text-center py-4">
                        No additional details provided
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Existing Offer */}
            {existingOffer && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Offer Sent
                      </h3>
                      <p className="text-gray-700 mb-3">
                        You&apos;ve sent an offer of{" "}
                        <span className="font-bold">
                          {new Intl.NumberFormat("hu-HU").format(existingOffer.price)} Ft
                        </span>
                      </p>
                      <p className="text-sm text-gray-600">
                        Status: <span className="capitalize">{existingOffer.status.toLowerCase()}</span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-6">
            {/* Lead Quality Metrics */}
            {!hasLeadAccess && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Lead Insights
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-gray-700">Expected ROI</span>
                      </div>
                      <span className="text-sm font-semibold text-blue-600">3.5x</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-gray-700">Win Rate</span>
                      </div>
                      <span className="text-sm font-semibold text-green-600">65%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-purple-600" />
                        <span className="text-sm text-gray-700">Competition</span>
                      </div>
                      <span className="text-sm font-semibold text-purple-600">Low</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Card */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {hasLeadAccess ? "Next Steps" : "Get Started"}
                </h3>

                {hasLeadAccess ? (
                  <div className="space-y-3">
                    <Button
                      className="w-full"
                      onClick={() => router.push("/pro/messages" + (threadId ? `/${threadId}` : ""))}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Message Customer
                    </Button>
                    {!existingOffer && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowOfferModal(true)}
                      >
                        Send Quote
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowAppointmentModal(true)}
                      disabled={!threadId}
                      title={!threadId ? "Start a conversation first to propose an appointment" : ""}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Propose Appointment
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Purchase this lead to message the customer and send your quote.
                    </p>
                    <Button
                      size="lg"
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => setShowPaywall(true)}
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Purchase Lead
                    </Button>
                    <p className="text-xs text-gray-500 text-center">
                      Only pay if the customer responds
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Info (only if purchased) */}
            {hasLeadAccess && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Customer Info
                  </h3>
                  <div className="space-y-3">
                    {request.first_name && request.last_name && (
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {request.first_name} {request.last_name}
                          </p>
                          <p className="text-xs text-gray-500">Customer</p>
                        </div>
                      </div>
                    )}
                    {request.contact_email && (
                      <div className="text-sm text-gray-600">
                        <p className="font-medium mb-1">Email</p>
                        <p>{request.contact_email}</p>
                      </div>
                    )}
                    {request.contact_phone && (
                      <div className="text-sm text-gray-600">
                        <p className="font-medium mb-1">Phone</p>
                        <p>{request.contact_phone}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tips */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-blue-900 mb-3">
                  💡 Pro Tips
                </h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li>• Respond within 24 hours for best results</li>
                  <li>• Be specific about your availability</li>
                  <li>• Include examples of similar work</li>
                  <li>• Be competitive but fair with pricing</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProLayout>
  );
}
