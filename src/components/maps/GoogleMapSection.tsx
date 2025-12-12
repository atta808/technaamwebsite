"use client";

import {
  GoogleMap,
  useLoadScript,
  MarkerF,
  InfoWindowF,
} from "@react-google-maps/api";
import { useState, useMemo, useCallback } from "react";
import { Star } from "lucide-react";

// Fallback Coordinates (Mandi Bahauddin)
const CENTER = { lat: 32.5855, lng: 73.5463 };
const LIBRARIES: "places"[] = ["places"];

export default function GoogleMapSection() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    libraries: LIBRARIES,
  });

  const [selectedLocation, setSelectedLocation] = useState(false);

  // Fix: We add this special comment to allow the 'any' type for Google data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [placeDetails, setPlaceDetails] = useState<any>(null);

  // Custom "TechNaam Blue" Map Style
  const mapOptions = useMemo(
    () => ({
      disableDefaultUI: false,
      clickableIcons: true,
      scrollwheel: false,
      zoomControl: true,
      styles: [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        {
          featureType: "water",
          elementType: "geometry",
          stylers: [{ color: "#0B66FF" }],
        },
        {
          featureType: "poi",
          elementType: "labels.text.fill",
          stylers: [{ color: "#d59563" }],
        },
        {
          featureType: "road",
          elementType: "geometry",
          stylers: [{ color: "#38414e" }],
        },
        {
          featureType: "road",
          elementType: "geometry.stroke",
          stylers: [{ color: "#212a37" }],
        },
        {
          featureType: "road",
          elementType: "labels.text.fill",
          stylers: [{ color: "#9ca5b3" }],
        },
      ],
    }),
    []
  );

  // Fetch Business Details (Ratings/Reviews) once map loads
  const onMapLoad = useCallback((map: google.maps.Map) => {
    // Use the Place ID you found
    const placeId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_PLACE_ID;

    if (placeId && window.google) {
      const service = new window.google.maps.places.PlacesService(map);
      service.getDetails(
        {
          placeId: placeId,
          fields: [
            "name",
            "rating",
            "user_ratings_total",
            "formatted_address",
            "geometry",
            "url",
          ],
        },
        (place, status) => {
          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            place
          ) {
            setPlaceDetails(place);
            // Center map on the actual business location
            if (place.geometry?.location) {
              map.panTo(place.geometry.location);
            }
          }
        }
      );
    }
  }, []);

  if (loadError)
    return (
      <div className="p-10 text-center text-red-500 bg-red-50 rounded-xl">
        Error loading Maps.
      </div>
    );
  if (!isLoaded)
    return (
      <div className="h-[450px] w-full bg-slate-200 animate-pulse rounded-xl" />
    );

  return (
    <div className="w-full h-[450px] rounded-2xl overflow-hidden shadow-2xl border border-slate-200 relative">
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        zoom={15}
        center={CENTER}
        options={mapOptions}
        onLoad={onMapLoad}
      >
        {/* Marker Position: Use fetched location if available, else default */}
        <MarkerF
          position={placeDetails?.geometry?.location || CENTER}
          onClick={() => setSelectedLocation(true)}
        />

        {/* Info Window */}
        {(selectedLocation || placeDetails) && (
          <InfoWindowF
            position={placeDetails?.geometry?.location || CENTER}
            onCloseClick={() => setSelectedLocation(false)}
            options={{ pixelOffset: new window.google.maps.Size(0, -30) }}
          >
            <div className="px-4 py-3 text-slate-900 min-w-[200px]">
              <h3 className="font-bold text-lg border-b pb-2 mb-2">
                {placeDetails?.name || "TechNaam HQ"}
              </h3>

              {/* Star Rating Section */}
              {placeDetails?.rating && (
                <div className="flex items-center gap-1 mb-2">
                  <span className="font-bold text-orange-500 text-lg">
                    {placeDetails.rating}
                  </span>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={
                          i < Math.round(placeDetails.rating)
                            ? "fill-orange-500 text-orange-500"
                            : "text-gray-300"
                        }
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">
                    ({placeDetails.user_ratings_total} reviews)
                  </span>
                </div>
              )}

              <p className="text-xs text-gray-500 mb-3">
                {placeDetails?.formatted_address || "Mandi Bahauddin, Pakistan"}
              </p>

              <a
                href={
                  placeDetails?.url ||
                  `http://googleusercontent.com/maps.google.com/6`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center bg-[#0B66FF] text-white text-xs font-bold px-4 py-2 rounded hover:bg-blue-700 transition"
              >
                View on Google Maps
              </a>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
}
