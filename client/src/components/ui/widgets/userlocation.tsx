import React, { useEffect, useState } from "react";
import { useGeolocation } from "react-haiku";
import { MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const UserLocation = () => {
  const { latitude, longitude, error, loading } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 10000,
  });

  const [locationName, setLocationName] = useState("");

  // Reverse Geocoding with OpenStreetMap API
  useEffect(() => {
    if (latitude && longitude) {
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
      )
        .then((res) => res.json())
        .then((data) => {
          setLocationName(data.display_name || "Unknown Location");
        })
        .catch(() => setLocationName("Failed to fetch location"));
    }
  }, [latitude, longitude]);

  return (
    <Card className=" p-4 border-t border-dashed shadow-none">
      <CardContent className="p-6">
        <div className="flex items-center space-x-2 mb-3">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Your Current Address</h2>
        </div>

        {loading && <p className="text-sm">📍 Getting your location...</p>}

        {error && <p className="text-sm text-red-500">❌ {error.message}</p>}

        {!loading && !error && latitude && longitude && (
          <div className="text-sm">
            <p>Location obtained not stored</p>
            {/* <p>
              <strong>Lat:</strong> {latitude.toFixed(4)},{" "}
              <strong>Lng:</strong> {longitude.toFixed(4)}
            </p> */}
            <p className="mt-1 text-muted-foreground">
              {locationName || "Detecting location..."}
            </p>
            <a
              href={`https://www.google.com/maps?q=${latitude},${longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline text-xs"
            >
              Open in Google Maps
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserLocation;
