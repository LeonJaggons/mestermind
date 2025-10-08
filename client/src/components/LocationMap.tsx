'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });

interface LocationMapProps {
  postalCode?: string;
  lat?: number;
  lon?: number;
  locationName?: string;
  className?: string;
}

export default function LocationMap({ postalCode, lat, lon, locationName, className = "" }: LocationMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([47.4979, 19.0402]); // Budapest default
  const [mapZoom, setMapZoom] = useState(12);
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (lat && lon) {
      setMapCenter([lat, lon]);
      setMarkerPosition([lat, lon]);
      setMapZoom(15); // Zoom in more when we have exact coordinates
    }
  }, [lat, lon]);

  if (!isClient) {
    // Show placeholder while loading
    return (
      <div className={`h-64 bg-gray-100 relative ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <div className="text-lg font-medium text-gray-900">{locationName || postalCode || 'Loading map...'}</div>
            <div className="text-sm text-gray-500">Map loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-64 relative ${className}`}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        dragging={true}
        keyboard={true}
        touchZoom={true}
        boxZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png"
        />
        {markerPosition && (
          <Marker position={markerPosition}>
            <Popup>
              <div className="text-center">
                <div className="font-medium">{locationName || postalCode}</div>
                <div className="text-sm text-gray-600">
                  {lat?.toFixed(4)}, {lon?.toFixed(4)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
      
      {/* Location pin overlay for visual consistency */}
      {markerPosition && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white text-xs font-medium">SI</span>
          </div>
        </div>
      )}
    </div>
  );
}
