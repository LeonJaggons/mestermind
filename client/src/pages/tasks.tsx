import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Header from "@/components/Header";
import {
  getMyRequests,
  fetchServiceById,
  listOffers,
  acceptOffer,
  rejectOffer,
  type CustomerRequest,
  type Service,
  type Offer,
} from "@/lib/api";
import { subscribeToAuthChanges } from "@/lib/auth";
import SendMessageModal from "@/components/SendMessageModal";
import {
  LuClock,
  LuCheck,
  LuX,
  LuCalendar,
  LuDollarSign,
  LuMessageSquare,
} from "react-icons/lu";
import { LucideAlertCircle } from "lucide-react";

interface RequestWithService extends CustomerRequest {
  service?: Service;
}

interface RequestWithOffers extends RequestWithService {
  offers?: Offer[];
}

export default function TasksPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<RequestWithOffers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [processingOffer, setProcessingOffer] = useState<string | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [modalContext, setModalContext] = useState<{
    requestId: string;
    mesterId: string;
    serviceName: string;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchRequests = async () => {
      try {
        setLoading(true);
        const data = await getMyRequests();

        // Fetch service details and offers for each request
        const requestsWithServicesAndOffers = await Promise.all(
          data.map(async (request) => {
            try {
              const service = await fetchServiceById(request.service_id);
              const offers = await listOffers({ request_id: request.id });
              return { ...request, service, offers };
            } catch {
              return request;
            }
          }),
        );

        setRequests(requestsWithServicesAndOffers);
      } catch (err) {
        console.error("Error fetching requests:", err);
        setError("Failed to load your requests");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "OPEN":
        return <LuClock className="w-5 h-5 text-blue-500" />;
      case "ACCEPTED":
      case "BOOKED":
        return <LuCheck className="w-5 h-5 text-green-500" />;
      case "CANCELLED":
      case "EXPIRED":
        return <LuX className="w-5 h-5 text-red-500" />;
      default:
        return <LuClock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-blue-100 text-blue-800";
      case "QUOTED":
        return "bg-purple-100 text-purple-800";
      case "SHORTLISTED":
        return "bg-yellow-100 text-yellow-800";
      case "ACCEPTED":
        return "bg-green-100 text-green-800";
      case "BOOKED":
        return "bg-green-100 text-green-800";
      case "EXPIRED":
        return "bg-gray-100 text-gray-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleAcceptOffer = async (offerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProcessingOffer(offerId);
    try {
      const current = requests
        .flatMap((r) => (r.offers || []).map((o) => ({ r, o })))
        .find(({ o }) => o.id === offerId);

      await acceptOffer(offerId);
      // Refresh requests to update UI
      const data = await getMyRequests();
      const requestsWithServicesAndOffers = await Promise.all(
        data.map(async (request) => {
          try {
            const service = await fetchServiceById(request.service_id);
            const offers = await listOffers({ request_id: request.id });
            return { ...request, service, offers } as any;
          } catch {
            return request as any;
          }
        }),
      );
      setRequests(requestsWithServicesAndOffers);

      if (current?.r && current.o) {
        const req = requestsWithServicesAndOffers.find(
          (x: any) => x.id === current.r.id,
        );
        const mesterId = current.o.mester_id;
        const serviceName = req?.service?.name || "Service";
        setModalContext({ requestId: current.r.id, mesterId, serviceName });
        setShowMessageModal(true);
      }
    } catch (err) {
      console.error("Error accepting offer:", err);
      alert("Failed to accept offer. Please try again.");
    } finally {
      setProcessingOffer(null);
    }
  };

  const handleRejectOffer = async (offerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProcessingOffer(offerId);
    try {
      await rejectOffer(offerId);
      // Refresh requests to update UI
      const data = await getMyRequests();
      const requestsWithServicesAndOffers = await Promise.all(
        data.map(async (request) => {
          try {
            const service = await fetchServiceById(request.service_id);
            const offers = await listOffers({ request_id: request.id });
            return { ...request, service, offers };
          } catch {
            return request;
          }
        }),
      );
      setRequests(requestsWithServicesAndOffers);
    } catch (err) {
      console.error("Error rejecting offer:", err);
      alert("Failed to reject offer. Please try again.");
    } finally {
      setProcessingOffer(null);
    }
  };

  const filteredRequests = requests.filter((request) => {
    if (activeTab === "active") {
      return !["CANCELLED", "EXPIRED", "BOOKED"].includes(request.status);
    } else {
      return ["CANCELLED", "EXPIRED", "BOOKED"].includes(request.status);
    }
  });

  if (!user) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <p className="text-gray-600">
              Please sign in to view your requests
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
            <p className="mt-2 text-gray-600">
              View and manage your service requests and offers
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("active")}
                className={`${
                  activeTab === "active"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Active (
                {
                  requests.filter(
                    (r) =>
                      !["CANCELLED", "EXPIRED", "BOOKED"].includes(r.status),
                  ).length
                }
                )
              </button>
              <button
                onClick={() => setActiveTab("completed")}
                className={`${
                  activeTab === "completed"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Completed (
                {
                  requests.filter((r) =>
                    ["CANCELLED", "EXPIRED", "BOOKED"].includes(r.status),
                  ).length
                }
                )
              </button>
            </nav>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <p className="text-gray-500 text-lg">
                You haven't made any requests yet
              </p>
              <p className="text-gray-400 mt-2">
                Start by searching for a service you need
              </p>
              <button
                onClick={() => router.push("/")}
                className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors"
              >
                Browse Services
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredRequests.map((request) => {
                const pendingOffers =
                  request.offers?.filter((o) => o.status === "PENDING") || [];
                const acceptedOffers =
                  request.offers?.filter((o) => o.status === "ACCEPTED") || [];
                const hasOffers = (request.offers?.length || 0) > 0;

                return (
                  <div
                    key={request.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                  >
                    {/* Request Header */}
                    <div
                      className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => router.push(`/requests/${request.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getStatusIcon(request.status)}
                            <h3 className="text-xl font-semibold text-gray-900">
                              {request.service?.name || "Service Request"}
                            </h3>
                          </div>

                          {request.message_to_pro && (
                            <p className="text-gray-600 mt-2 line-clamp-2">
                              {request.message_to_pro}
                            </p>
                          )}

                          <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <LuCalendar className="w-4 h-4" />
                              <span>{formatDate(request.created_at)}</span>
                            </div>
                            {request.postal_code && (
                              <div className="flex items-center gap-1">
                                <span>📍</span>
                                <span>{request.postal_code}</span>
                              </div>
                            )}
                            {hasOffers && (
                              <div className="flex items-center gap-1">
                                <LuDollarSign className="w-4 h-4" />
                                <span className="font-medium text-blue-600">
                                  {request.offers!.length}{" "}
                                  {request.offers!.length === 1
                                    ? "quote"
                                    : "quotes"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="ml-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}
                          >
                            {request.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Offers Section */}
                    {hasOffers && (
                      <div className="border-t border-gray-200 bg-gray-50 p-6">
                        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <LuDollarSign className="w-4 h-4" />
                          Quotes Received ({request.offers!.length})
                        </h4>

                        <div className="space-y-3">
                          {request.offers!.map((offer) => (
                            <div
                              key={offer.id}
                              className={`bg-white rounded-lg border p-4 ${
                                offer.status === "ACCEPTED"
                                  ? "border-green-300 bg-green-50"
                                  : offer.status === "REJECTED"
                                    ? "border-gray-300 opacity-60"
                                    : "border-blue-200"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className="text-2xl font-bold text-gray-900">
                                      {offer.price.toLocaleString()}{" "}
                                      {offer.currency}
                                    </div>
                                    {offer.status === "ACCEPTED" && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        <LuCheck className="w-3 h-3 mr-1" />
                                        Accepted
                                      </span>
                                    )}
                                    {offer.status === "REJECTED" && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                        <LuX className="w-3 h-3 mr-1" />
                                        Declined
                                      </span>
                                    )}
                                  </div>

                                  {offer.message && (
                                    <div className="flex items-start gap-2 mt-2">
                                      <LuMessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                      <p className="text-sm text-gray-700">
                                        {offer.message}
                                      </p>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                                    <span>
                                      Sent {formatDate(offer.created_at)}
                                    </span>
                                    {offer.expires_at && (
                                      <span className="flex items-center gap-1">
                                        <LucideAlertCircle className="w-3 h-3" />
                                        Expires {formatDate(offer.expires_at)}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {offer.status === "PENDING" && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={(e) =>
                                        handleRejectOffer(offer.id, e)
                                      }
                                      disabled={processingOffer === offer.id}
                                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                      {processingOffer === offer.id
                                        ? "..."
                                        : "Decline"}
                                    </button>
                                    <button
                                      onClick={(e) =>
                                        handleAcceptOffer(offer.id, e)
                                      }
                                      disabled={processingOffer === offer.id}
                                      className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                      {processingOffer === offer.id
                                        ? "..."
                                        : "Accept Quote"}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {showMessageModal && modalContext && (
        <SendMessageModal
          open={showMessageModal}
          onClose={() => setShowMessageModal(false)}
          requestId={modalContext.requestId}
          mesterId={modalContext.mesterId}
          serviceName={modalContext.serviceName}
          onMessageSent={undefined}
        />
      )}
    </>
  );
}
