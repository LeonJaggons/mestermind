"use client";

import { Star, Trophy, MapPin, CheckCircle } from 'lucide-react';

interface BestMatchCardProps {
  category: string;
  name: string;
  rating: number;
  reviewCount: number;
  hasTopProBadge?: boolean;
  yearsExperience?: number;
  isVerified: boolean;
  onViewProfile: () => void;
}

export default function BestMatchCard({
  category,
  name,
  rating,
  reviewCount,
  hasTopProBadge = false,
  yearsExperience,
  isVerified,
  onViewProfile,
}: BestMatchCardProps) {
  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating)
            ? "text-green-500 fill-current"
            : "text-gray-300"
        }`}
      />
    ));
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-0">
      <div className="text-blue-700 bg-blue-100 text-center p-2 px-4  font-semibold text-sm mb-3">
        {category}
      </div>

      <div className="flex items-center mb-4 p-4 pb-0">
        <div className="w-12 h-12 bg-gray-300 rounded-full mr-3 flex items-center justify-center overflow-hidden">
          <span className="text-gray-600 font-semibold">
            {getInitials(name)}
          </span>
        </div>
        <div>
          <h3 className="font-bold text-gray-900">{name}</h3>
          <div className="flex items-center">
            <span className="text-gray-900 font-semibold mr-1">{rating}</span>
            <div className="flex mr-2">{renderStars(rating)}</div>
            <span className="text-gray-600 text-sm">({reviewCount})</span>
          </div>
        </div>
      </div>

      {hasTopProBadge && (
        <div className="bg-blue-100  text-blue-800 text-xs font-medium px-2 py-1 rounded-full inline-flex items-center mb-3">
          <Star className="w-3 h-3 mr-1 fill-current" />
          Top pro
        </div>
      )}

      <div className="space-y-2 mb-4">
        {yearsExperience && (
          <div className="flex items-center text-sm text-gray-600">
            <Trophy className="w-4 h-4 mr-2 text-gray-400" />
            {yearsExperience} years experience
          </div>
        )}
        <div className="flex px-4 items-center text-sm text-gray-600">
          {isVerified ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              Verified professional
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4 mr-2 text-gray-400" />
              Local professional
            </>
          )}
        </div>
      </div>

      <div className="px-4 pb-4">
        <button
          onClick={onViewProfile}
          className="w-full border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
        >
          View profile
        </button>
      </div>
    </div>
  );
}
