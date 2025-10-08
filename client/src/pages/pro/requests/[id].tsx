import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { subscribeToAuthChanges } from "@/lib/auth";
import {
  getCustomerRequest,
  fetchQuestions,
  fetchServiceById,
  getCoordinatesByPostalCode,
  fetchProStatus,
  createOffer,
  listOffers,
  type CustomerRequest,
  type Question,
  type Service,
  type Offer,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Clock,
  Users,
  CheckCircle,
  Paperclip,
  MessageCircle,
} from "lucide-react";
import LocationMap from "@/components/LocationMap";

export default function RequestDetailPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<CustomerRequest | null>(null);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [price, setPrice] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [mesterId, setMesterId] = useState<string | null>(null);
  const [existingOffer, setExistingOffer] = useState<Offer | null>(null);
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
    if (checking) return;
    if (!id) return;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const req = await getCustomerRequest(id);
        setRequest(req);
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

        // Fetch location coordinates if postal code is available
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
      } catch {
        setError("Failed to load request");
      } finally {
        setLoading(false);
      }
    })();
  }, [checking, id]);

  // Check for existing offers
  useEffect(() => {
    if (!id || !mesterId) return;

    (async () => {
      try {
        const offers = await listOffers({
          request_id: id as string,
          mester_id: mesterId,
        });
        if (offers && offers.length > 0) {
          setExistingOffer(offers[0]);
        }
      } catch (e) {
        console.warn("Failed to check for existing offers:", e);
      }
    })();
  }, [id, mesterId]);

  // Messaging UI removed; handled exclusively on messages page

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

    // Fallback to formatted key if no label found
    const displayLabel =
      label ||
      key.split("_").join(" ").charAt(0).toUpperCase() +
        key.split("_").join(" ").slice(1);

    return (
      <div
        key={key}
        className="text-sm flex flex-col border-b border-gray-200 pb-4"
      >
        <span className="text-md font-medium text-gray-500 mb-1">
          {displayLabel}
        </span>
        <span className="text-[16px] text-gray-800 font-medium">
          {formatValue(value)}
        </span>
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

  const handleSendOffer = async () => {
    if (!price || !message || !id || !mesterId) return;

    setSending(true);
    try {
      const offer = await createOffer(
        {
          request_id: id as string,
          price: parseFloat(price),
          currency: "HUF",
          message: message,
        },
        mesterId,
      );

      setExistingOffer(offer);
      alert(
        "Offer sent successfully! This request has been moved to your Offers page.",
      );
      // Redirect to offers page
      router.push("/pro/offers");
    } catch (e) {
      console.error("Failed to send offer:", e);
      alert("Failed to send offer. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const getServiceDisplayName = () => {
    if (service) {
      return service.name;
    }
    return "Service Request";
  };

  function getAvailability(): { type: string; [key: string]: unknown } | null {
    if (!request) return null;
    // Prefer normalized field from API
    const top = (request as { availability?: { type: string; [key: string]: unknown } }).availability;
    if (top && top.type === "weekly") return top;
    // Fallback to answers.availability (structured or raw)
    const a = (request.answers as { availability?: unknown })?.availability;
    if (!a) return null;
    if (a && typeof a === "object" && "value" in a) return (a as { value: { type: string; [key: string]: unknown } }).value;
    return a as { type: string; [key: string]: unknown };
  }

  function formatWeeklyAvailability(av: {
    days: number[];
    start: string;
    end: string;
  }): string {
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayNames = (av.days || [])
      .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
      .map((d) => labels[d]);
    if (dayNames.length === 0) return "Not specified";
    return `${dayNames.join(", ")} • ${av.start}–${av.end}`;
  }

  if (checking) {
    return (
      <main
        className="bg-white"
        style={{ maxHeight: "calc(100vh - 64px)", overflow: "hidden" }}
      >
        <div className="max-w-5xl mx-auto p-6">Loading…</div>
      </main>
    );
  }

  if (loading) {
    return (
      <main
        className=" bg-white"
        style={{ maxHeight: "calc(100vh - 64px)", overflow: "hidden" }}
      >
        <div className="max-w-5xl mx-auto p-6">Loading request…</div>
      </main>
    );
  }

  if (error || !request) {
    return (
      <main className="min-h-screen bg-white">
        <div className="max-w-5xl mx-auto p-6 text-red-600">
          {error || "Not found"}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div>
        <div
          className="flex"
          style={{
            backgroundColor: "rgb(250, 250, 250)",
          }}
        >
          {/* Left Panel - Lead Details */}
          <div className="max-w-[500px] flex-1 bg-white overflow-y-auto">
            {/* Map Section */}
            <div className="border border-gray-200 overflow-hidden">
              <LocationMap
                postalCode={request?.postal_code || undefined}
                lat={locationData?.lat || undefined}
                lon={locationData?.lon || undefined}
                locationName={
                  locationData?.name || request?.postal_code || undefined
                }
                className="h-64"
              />
              <div className="p-4 bg-transparent">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-medium text-gray-900">
                      {locationData?.name ||
                        request?.postal_code ||
                        "Location not specified"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {locationData?.city_name &&
                      locationData.city_name !== locationData.name
                        ? `${locationData.city_name}, Hungary`
                        : "Location"}
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    15% discount
                  </Badge>
                </div>
              </div>
            </div>

            {/* Lead Status */}
            <div className="border border-gray-200 p-4 border-t-0">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      1 pro contacted
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      1 pro responded
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      1d 9h until request expires
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <p className="text-xs text-blue-700">
                  You&apos;ll only pay if the customer responds. Opportunities are
                  priced separately from other leads.{" "}
                  <button className="text-blue-600 hover:underline">
                    View price
                  </button>
                </p>
              </div>
            </div>

            {/* Job Details */}
            <div className="border border-gray-200 border-t-0">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Job Details
                </h3>
              </div>
              <div className="p-4 space-y-8">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Job type
                  </div>
                  <div className="text-sm text-gray-600">
                    {getServiceDisplayName()}
                  </div>
                  {service?.description && (
                    <div className="text-xs text-gray-500 italic mt-1">
                      Related to {service.description}
                    </div>
                  )}
                </div>

                {/* Customer Message */}
                {request?.message_to_pro && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-md">
                    <div className="text-sm font-medium text-gray-900 mb-2">
                      Customer Message
                    </div>
                    <div className="text-sm text-gray-700">
                      {request.message_to_pro}
                    </div>
                  </div>
                )}

                {/* Availability */}
                {(() => {
                  const av = getAvailability();
                  if (!av || av.type !== "weekly") return null;
                  const weeklyAv = av as unknown as { days: number[]; start: string; end: string };
                  return (
                    <div className="mt-4 p-3 bg-gray-50 rounded-md">
                      <div className="text-sm font-medium text-gray-900 mb-2">
                        Availability
                      </div>
                      <div className="text-sm text-gray-700">
                        {formatWeeklyAvailability(weeklyAv)}
                      </div>
                    </div>
                  );
                })()}

                {/* Question Answers */}
                {request?.answers &&
                  Object.keys(request.answers).length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm font-medium text-gray-900 mb-2">
                        Additional Details
                      </div>
                      <div className="space-y-4">
                        {Object.entries(request.answers)
                          .filter(([key]) => key !== "availability")
                          .map(([key, entry]) => renderAnswer(key, entry))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* Right Panel - Offer and Message */}
          <div className="space-y-6 flex-1 p-12 flex flex-col items-center justify-start sticky top-0 h-screen overflow-y-auto">
            {existingOffer ? (
              /* Existing Offer Display */
              <div className="w-[500px] space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Offer Sent
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Price:</span>
                      <span className="text-2xl font-semibold text-gray-900">
                        ${existingOffer.price} {existingOffer.currency}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Status:</span>
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        {existingOffer.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Sent:</span>
                      <span className="text-gray-900">
                        {new Date(
                          existingOffer.created_at,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                    {existingOffer.message && (
                      <div className="pt-3 border-t border-blue-200">
                        <span className="text-gray-600 block mb-2">
                          Message:
                        </span>
                        <p className="text-gray-900 whitespace-pre-wrap">
                          {existingOffer.message}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-center text-sm text-gray-600">
                  This request has been moved to your{" "}
                  <Link
                    href="/pro/offers"
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    Offers page
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* Price Section */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2 w-[500px]">
                  Price
                </h3>
                <div className="border border-gray-200 bg-white rounded-lg w-[500px]">
                  <div className="p-4">
                    <div className="relative flex justify-center">
                      <div className="relative inline-block h-fit my-auto">
                        <span className="absolute text-black text-3xl left-3 top-12 transform -translate-y-1/2  ">
                          $
                        </span>
                        <Input
                          type="number"
                          placeholder="0"
                          value={price}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Only allow positive numbers and empty string
                            if (
                              value === "" ||
                              (!isNaN(Number(value)) && Number(value) >= 0)
                            ) {
                              setPrice(value);
                            }
                          }}
                          min="0"
                          className="border-0 px-0 shadow-none bg-transparent pl-8 pr-4 py-8 outline-none focus:outline-none focus:border-0 focus:ring-0 focus:shadow-none text-gray-900 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] text-center"
                          style={{
                            fontSize:
                              price.length > 3
                                ? `${Math.max(120 - (price.length - 3) * 20, 30)}px`
                                : "120px",
                            width: `${Math.max(price.length * 50 + 80, 120)}px`,
                            minWidth: "300px",
                            maxWidth: "400px",
                            maxHeight: "fit-content",
                            minHeight: "fit-content",
                            height: "fit-content",
                            padding: "0px !important",
                            border: "none !important",
                            outline: "none !important",
                            outlineColor: "transparent !important",
                            outlineWidth: "0px !important",
                            outlineStyle: "none !important",
                            boxShadow: "none !important",
                            borderRadius: "0px !important",
                          }}
                        />
                        <button className="flex items-center justify-center mt-3 absolute bottom-0 left-0 right-0">
                          <span className="text-sm text-gray-600">
                            Fixed price
                          </span>
                          <svg
                            className="w-4 h-4 ml-2 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Message Section */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2 w-[500px]">
                  Message
                </h3>
                <div className="border border-gray-200 bg-white rounded-lg w-[500px]">
                  <div className="p-4">
                    <textarea
                      placeholder="Introduce yourself and share next steps."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full h-32 p-3 border border-gray-300 rounded-md resize-none focus:ring-0 focus:border-gray-400 text-gray-900 placeholder-gray-400"
                    />
                    <div className="flex items-center justify-between mt-3">
                      <button className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700">
                        <Paperclip className="h-4 w-4" />
                        <span>Attach</span>
                      </button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <button className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700">
                            <MessageCircle className="h-4 w-4" />
                            <span>Tips</span>
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>
                              Tips to write winning messages
                            </DialogTitle>
                            <DialogDescription>
                              Your message forms your customer&apos;s first
                              impression of you and your business. They love to
                              hire pros who:
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3">
                            <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
                              <li>Greet them by name.</li>
                              <li>
                                Talk about your relevant past work,
                                qualifications, and expertise.
                              </li>
                              <li>Describe what&apos;s included in the price.</li>
                              <li>
                                Encourage them to take the next step and follow
                                up!
                              </li>
                            </ul>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>

                {/* Send Button */}
                <div className="flex justify-end w-[500px]">
                  <Button
                    onClick={handleSendOffer}
                    disabled={!price || !message || sending}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md"
                  >
                    {sending ? "Sending..." : "Send"}
                  </Button>
                </div>
              </>
            )}

            {/* Conversation moved to /pro/messages */}
          </div>
        </div>
      </div>
    </main>
  );
}
