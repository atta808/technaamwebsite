"use client";

import {
  GoogleMap,
  useLoadScript,
  MarkerF,
  InfoWindowF,
} from "@react-google-maps/api";
import { useState, useMemo } from "react";

// Mandi Bahauddin Coordinates
const CENTER = { lat: 32.5855, lng: 73.5463 };

export default function GoogleMapSection() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
  });

  const [selectedLocation, setSelectedLocation] = useState(false);

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

  if (loadError)
    return (
      <div className="p-10 text-center text-red-500 bg-red-50 rounded-xl">
        Error loading Maps. Check API Key.
      </div>
    );
  if (!isLoaded)
    return (
      <div className="h-[450px] w-full bg-slate-200 animate-pulse rounded-xl" />
    );

  return (
    <div className="w-full h-[450px] rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        zoom={15}
        center={CENTER}
        options={mapOptions}
      >
        <MarkerF position={CENTER} onClick={() => setSelectedLocation(true)} />

        {selectedLocation && (
          <InfoWindowF
            position={CENTER}
            onCloseClick={() => setSelectedLocation(false)}
          >
            <div className="px-4 py-2 text-slate-900">
              <h3 className="font-bold text-lg border-b pb-1 mb-2">
                TechNaam HQ
              </h3>
              <p className="text-sm font-medium">Advocate Atta Ur Rehman</p>
              <p className="text-xs text-gray-500 mt-1">
                Mandi Bahauddin, Pakistan
              </p>

              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${CENTER.lat},${CENTER.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block bg-[#0B66FF] text-white text-xs px-3 py-1.5 rounded hover:bg-blue-700 transition"
              >
                Get Directions
              </a>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
}
