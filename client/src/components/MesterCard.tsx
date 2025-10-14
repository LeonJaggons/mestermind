import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  Trophy,
  MapPin,
  MessageCircle,
  Calendar,
  User,
} from "lucide-react";
import { useState } from "react";

interface MesterCardProps {
  mester: {
    id: string;
    full_name: string;
    rating_avg?: number;
    review_count?: number;
    lat?: number;
    lon?: number;
    bio?: string;
    logo_url?: string;
    availability_status?: string;
    response_time?: string;
    hire_count?: number;
    starting_price?: number;
  };
  distance?: string;
  services: Array<{
    service_id: string;
    name?: string;
  }>;
  serviceId?: string;
}

export default function MesterCard({
  mester,
  distance,
  services,
  serviceId,
}: MesterCardProps) {
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const stars = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="h-4 w-4 fill-green-500 text-green-500" />,
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Star
          key="half"
          className="h-4 w-4 fill-green-500/50 text-green-500"
        />,
      );
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />);
    }

    return stars;
  };

  const getRatingText = (rating: number) => {
    if (rating >= 4.5) return "Excellent";
    if (rating >= 4.0) return "Great";
    if (rating >= 3.5) return "Good";
    if (rating >= 3.0) return "Fair";
    return "Poor";
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return "text-green-600";
    if (rating >= 4.0) return "text-green-500";
    if (rating >= 3.5) return "text-yellow-500";
    if (rating >= 3.0) return "text-orange-500";
    return "text-red-500";
  };

  return (
    <Card className="p-4 sm:p-6 lg:p-8 hover:shadow-lg transition-shadow duration-200">
      <div className="flex flex-col sm:flex-row gap-4 px-4">
        {/* Profile Picture */}
        <div className="flex-shrink-0 flex justify-center sm:justify-start">
          <div className="h-20 w-20 sm:h-24 sm:w-24 lg:h-32 lg:w-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
            {mester.logo_url ? (
              <img
                src={mester.logo_url}
                alt={`${mester.full_name} logo`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to user icon if image fails to load
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextElementSibling?.classList.remove(
                    "hidden",
                  );
                }}
              />
            ) : null}
            <User
              className={`h-8 w-8 sm:h-10 sm:w-10 text-gray-400 ${mester.logo_url ? "hidden" : ""}`}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Name and Rating */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="text-center sm:text-left">
              <h4 className="text-lg sm:text-md font-bold text-gray-900">
                {mester.full_name}
              </h4>
              {/* Availability Badge */}
              {/* {
                mester.availability_status && (
                  <div className="mb-2">
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-700 border-amber-200"
                    >
                      <Calendar className="h-3 w-3 mr-1" />
                      {mester.availability_status}
                    </Badge>
                  </div>
                )} */}
              {mester.rating_avg && (
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                  <span
                    className={`font-semibold text-sm ${getRatingColor(mester.rating_avg)}`}
                  >
                    {getRatingText(mester.rating_avg)} {mester.rating_avg}
                  </span>
                  <div className="flex items-center gap-1">
                    {renderStars(mester.rating_avg)}
                  </div>
                  <span className="text-gray-600 text-xs">
                    ({mester.review_count || 0})
                  </span>
                </div>
              )}
            </div>

            {/* Pricing */}
            {mester.starting_price && (
              <div className="text-center sm:text-right">
                <div className="text-lg sm:text-md font-semibold text-gray-600">
                  ${mester.starting_price}/hour
                </div>
                <div className="text-xs text-gray-500">Starting price</div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="space-y-1 mb-4">
            {mester.hire_count && (
              <div className="flex items-center justify-center sm:justify-start text-sm text-gray-600">
                <Trophy className="h-4 w-4 mr-2 text-gray-400" />
                {mester.hire_count} hires on Mestermind
              </div>
            )}
            {distance && (
              <div className="flex items-center justify-center sm:justify-start text-sm text-gray-600">
                <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                {distance}
              </div>
            )}
            {mester.response_time && (
              <div className="flex items-center justify-center sm:justify-start text-sm text-gray-600">
                <MessageCircle className="h-4 w-4 mr-2 text-gray-400" />
                Responds within{" "}
                <span className="font-semibold ml-1">
                  {mester.response_time}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Business Introduction */}
            {mester.bio && (
              <div className="bg-gray-50 rounded-lg p-3 flex-1">
                <p
                  className={`text-sm text-gray-700 ${!isBioExpanded ? "line-clamp-2" : ""}`}
                >
                  {mester.bio}
                </p>
                {mester.bio.length > 150 && (
                  <button
                    className="text-blue-600 text-sm hover:underline mt-1"
                    onClick={() => setIsBioExpanded(!isBioExpanded)}
                  >
                    {isBioExpanded ? "See less" : "See more"}
                  </button>
                )}
              </div>
            )}

            {/* Action Button */}
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg w-full sm:w-auto"
              onClick={() => {
                const url = serviceId
                  ? `/mester/${mester.id}?service_pk=${serviceId}`
                  : `/mester/${mester.id}`;
                window.location.href = url;
              }}
            >
              View profile
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
