"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useI18n } from "@/lib/contexts/I18nContext";
import { Star, MessageSquare, CheckCircle } from "lucide-react";
import { API_BASE_URL } from "@/lib/api/config";

interface Review {
  id: number;
  rating: number;
  comment: string;
  customer_name: string;
  customer_avatar_url: string | null;
  service_details: string | null;
  mester_reply: string | null;
  mester_replied_at: string | null;
  hired_on_platform: boolean;
  verified_hire: boolean;
  created_at: string;
}

type FilterRating = "all" | "5" | "4" | "3" | "2" | "1";
type SortOption = "newest" | "oldest" | "highest" | "lowest";

export default function ReviewsPage() {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [proProfileId, setProProfileId] = useState<number | null>(null);
  const [filterRating, setFilterRating] = useState<FilterRating>("all");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [savingReply, setSavingReply] = useState(false);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Get user ID from backend
        const userResponse = await fetch(`${API_BASE_URL}/api/v1/users/firebase/${user.uid}`);
        if (!userResponse.ok) return;
        const userData = await userResponse.json();

        // Get pro profile
        const proProfileResponse = await fetch(`${API_BASE_URL}/api/v1/pro-profiles/user/${userData.id}`);
        if (proProfileResponse.ok) {
          const proProfileData = await proProfileResponse.json();
          setProProfileId(proProfileData.id);

          // Fetch reviews
          const reviewsResponse = await fetch(
            `${API_BASE_URL}/api/v1/reviews?pro_profile_id=${proProfileData.id}`
          );
          if (reviewsResponse.ok) {
            const reviewsData = await reviewsResponse.json();
            setReviews(reviewsData);
          }
        }
      } catch (error) {
        console.error("Error fetching reviews:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [user]);

  const handleReply = async (reviewId: number) => {
    if (!replyText.trim() || !proProfileId) return;

    try {
      setSavingReply(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/reviews/${reviewId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mester_reply: replyText.trim(),
        }),
      });

      if (response.ok) {
        const updatedReview = await response.json();
        setReviews((prev) =>
          prev.map((r) => (r.id === reviewId ? { ...r, mester_reply: updatedReview.mester_reply, mester_replied_at: updatedReview.mester_replied_at } : r))
        );
        setReplyingTo(null);
        setReplyText("");
      }
    } catch (error) {
      console.error("Error saving reply:", error);
    } finally {
      setSavingReply(false);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }

    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / reviews.length;
    const ratingDistribution = reviews.reduce(
      (acc, r) => {
        acc[r.rating as keyof typeof acc]++;
        return acc;
      },
      { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    );

    return {
      averageRating,
      totalReviews: reviews.length,
      ratingDistribution,
    };
  }, [reviews]);

  // Filter and sort reviews
  const filteredAndSortedReviews = useMemo(() => {
    let filtered = reviews;

    // Apply rating filter
    if (filterRating !== "all") {
      filtered = filtered.filter((r) => r.rating === parseInt(filterRating));
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      if (sortOption === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortOption === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortOption === "highest") {
        return b.rating - a.rating;
      } else if (sortOption === "lowest") {
        return a.rating - b.rating;
      }
      return 0;
    });

    return sorted;
  }, [reviews, filterRating, sortOption]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const locale = language === "hu" ? "hu-HU" : "en-US";
    return date.toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-gray-200 text-gray-200"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t("pro.reviews.title")}</h1>
          <p className="mt-2 text-gray-600">{t("pro.reviews.subtitle")}</p>
        </div>

        {/* Statistics Card */}
        {stats.totalReviews > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Average Rating */}
              <div className="text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <span className="text-4xl font-bold text-gray-900">
                    {stats.averageRating.toFixed(1)}
                  </span>
                  <div className="flex items-center">
                    <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  {stats.totalReviews} {stats.totalReviews === 1 ? t("pro.reviews.review") : t("pro.reviews.reviews")}
                </p>
              </div>

              {/* Rating Distribution */}
              <div className="md:col-span-2">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  {t("pro.reviews.ratingBreakdown")}
                </h3>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution];
                    const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                    return (
                      <div key={rating} className="flex items-center gap-3">
                        <div className="flex items-center gap-1 w-16">
                          <span className="text-sm font-medium text-gray-700">{rating}</span>
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-yellow-400 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter and Sort Controls */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {(["all", "5", "4", "3", "2", "1"] as FilterRating[]).map((rating) => (
              <button
                key={rating}
                onClick={() => setFilterRating(rating)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterRating === rating
                    ? "bg-[hsl(var(--primary))] text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                }`}
              >
                {rating === "all" ? (
                  t("pro.reviews.filter.all")
                ) : (
                  <div className="flex items-center gap-1">
                    <span>{rating}</span>
                    <Star className="w-4 h-4 fill-current" />
                  </div>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">{t("pro.reviews.sort")}</label>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent bg-white"
            >
              <option value="newest">{t("pro.reviews.sort.newest")}</option>
              <option value="oldest">{t("pro.reviews.sort.oldest")}</option>
              <option value="highest">{t("pro.reviews.sort.highest")}</option>
              <option value="lowest">{t("pro.reviews.sort.lowest")}</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]"></div>
          </div>
        ) : filteredAndSortedReviews.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Star className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {reviews.length === 0
                ? t("pro.reviews.noReviews")
                : t("pro.reviews.noReviewsFiltered")}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {reviews.length === 0
                ? t("pro.reviews.noReviewsDescription")
                : t("pro.reviews.noReviewsFilteredDescription")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedReviews.map((review) => (
              <div
                key={review.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {review.customer_avatar_url ? (
                      <img
                        src={review.customer_avatar_url}
                        alt={review.customer_name}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center">
                        <span className="text-lg font-semibold text-[hsl(var(--primary))]">
                          {review.customer_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Review Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {review.customer_name}
                          </h3>
                          {review.verified_hire && (
                            <CheckCircle
                              className="w-4 h-4 text-green-500"
                              aria-label={t("pro.reviews.verifiedHire")}
                            />
                          )}
                          {review.hired_on_platform && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                              {t("pro.reviews.hiredOnPlatform")}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          {renderStars(review.rating)}
                          <span className="text-sm text-gray-500">{formatDate(review.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Comment */}
                    <p className="text-gray-700 mb-3 whitespace-pre-wrap">{review.comment}</p>

                    {/* Service Details */}
                    {review.service_details && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          {t("pro.reviews.serviceDetails")}:
                        </p>
                        <p className="text-sm text-gray-600">{review.service_details}</p>
                      </div>
                    )}

                    {/* Pro Reply */}
                    {review.mester_reply ? (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-semibold text-blue-900">
                            {t("pro.reviews.yourReply")}
                          </span>
                          {review.mester_replied_at && (
                            <span className="text-xs text-blue-700">
                              {formatDate(review.mester_replied_at)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-blue-800 whitespace-pre-wrap">
                          {review.mester_reply}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4">
                        {replyingTo === review.id ? (
                          <div className="space-y-3">
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder={t("pro.reviews.replyPlaceholder")}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent resize-none"
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleReply(review.id)}
                                disabled={!replyText.trim() || savingReply}
                                className="px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {savingReply ? t("pro.reviews.saving") : t("pro.reviews.postReply")}
                              </button>
                              <button
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyText("");
                                }}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200"
                              >
                                {t("pro.reviews.cancel")}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setReplyingTo(review.id)}
                            className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--primary))] hover:underline"
                          >
                            <MessageSquare className="w-4 h-4" />
                            {t("pro.reviews.reply")}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
