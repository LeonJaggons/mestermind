"use client";

import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface RequestMapProps {
  latitude?: number | null;
  longitude?: number | null;
  hasConfirmedAppointment?: boolean;
  city?: string;
}

export default function RequestMap({
  latitude,
  longitude,
  hasConfirmedAppointment = false,
  city = "New York City",
}: RequestMapProps) {
  // Default to NYC if no coordinates provided
  const defaultCenter: [number, number] = [40.8268, -74.0776];
  const center: [number, number] = 
    latitude && longitude ? [latitude, longitude] : defaultCenter;

  // If location is obfuscated (no confirmed appointment), show approximate area
  const showApproximateArea = !hasConfirmedAppointment && latitude && longitude;

  return (
    <MapContainer
      center={center}
      zoom={showApproximateArea ? 14 : 15}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      
      {latitude && longitude && (
        <>
          {showApproximateArea ? (
            // Show approximate area circle for unconfirmed appointments (privacy protection)
            <Circle
              center={center}
              radius={500} // 500 meters radius
              pathOptions={{
                color: "#3b82f6",
                fillColor: "#3b82f6",
                fillOpacity: 0.2,
                weight: 2,
              }}
            />
          ) : (
            // Show exact location marker for confirmed appointments
            <Marker position={center} />
          )}
        </>
      )}
    </MapContainer>
  );
}
