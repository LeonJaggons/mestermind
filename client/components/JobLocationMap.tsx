"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface JobLocationMapProps {
  city?: string;
  district?: string;
  street?: string;
}

export default function JobLocationMap({ city, district, street }: JobLocationMapProps) {
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const geocodeAddress = async () => {
      if (!city && !district) {
        // Default to a central location if no address
        setCoordinates([47.4979, 19.0402]); // Budapest center as default
        setLoading(false);
        return;
      }

      try {
        // Build address string
        const addressParts = [street, district, city].filter(Boolean);
        const address = addressParts.join(", ");

        // Use Nominatim (OpenStreetMap geocoding) - free and no API key needed
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
          {
            headers: {
              'User-Agent': 'Mestermind App'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            setCoordinates([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
          } else {
            // Fallback to city only
            if (city) {
              const cityResponse = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`,
                {
                  headers: {
                    'User-Agent': 'Mestermind App'
                  }
                }
              );
              if (cityResponse.ok) {
                const cityData = await cityResponse.json();
                if (cityData.length > 0) {
                  setCoordinates([parseFloat(cityData[0].lat), parseFloat(cityData[0].lon)]);
                } else {
                  setCoordinates([47.4979, 19.0402]); // Budapest default
                }
              } else {
                setCoordinates([47.4979, 19.0402]);
              }
            } else {
              setCoordinates([47.4979, 19.0402]);
            }
          }
        } else {
          setCoordinates([47.4979, 19.0402]);
        }
      } catch (error) {
        console.error("Error geocoding address:", error);
        setCoordinates([47.4979, 19.0402]);
      } finally {
        setLoading(false);
      }
    };

    geocodeAddress();
  }, [city, district, street]);

  if (loading || !coordinates) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))] mx-auto mb-2"></div>
          <p className="text-xs text-gray-500">Loading map...</p>
        </div>
      </div>
    );
  }

  const addressString = [street, district, city].filter(Boolean).join(", ") || "Location";

  return (
    <MapContainer
      center={coordinates}
      zoom={street ? 15 : district ? 13 : 11}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={false}
      className="z-0"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <Marker position={coordinates}>
        <Popup>
          <div className="text-sm">
            <strong>Job Location</strong>
            <br />
            {addressString}
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
