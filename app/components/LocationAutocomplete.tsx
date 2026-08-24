import { useEffect, useRef } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";

type SelectedPlace = {
  address: string;
  latitude: number;
  longitude: number;
};

type LocationAutocompleteProps = {
  onPlaceSelected: (place: SelectedPlace) => void;
};

type PlaceSelectEvent = Event & {
  placePrediction: {
    toPlace: () => {
      fetchFields: (options: { fields: string[] }) => Promise<void>;
      formattedAddress?: string;
      location?: {
        lat: () => number;
        lng: () => number;
      };
    };
  };
};

export default function LocationAutocomplete({
  onPlaceSelected,
}: LocationAutocompleteProps) {
  const places = useMapsLibrary("places");
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onPlaceSelected);

  useEffect(() => {
    callbackRef.current = onPlaceSelected;
  }, [onPlaceSelected]);

  useEffect(() => {
    if (!places || !containerRef.current) {
      return;
    }

    const autocomplete = new places.PlaceAutocompleteElement();

    autocomplete.classList.add("location-autocomplete");

    containerRef.current.replaceChildren(autocomplete);

    const handleSelect = async (event: Event) => {
      const selectEvent = event as PlaceSelectEvent;
      const place = selectEvent.placePrediction.toPlace();

      await place.fetchFields({
        fields: ["formattedAddress", "location"],
      });

      if (!place.formattedAddress || !place.location) {
        return;
      }

      callbackRef.current({
        address: place.formattedAddress,
        latitude: place.location.lat(),
        longitude: place.location.lng(),
      });
    };

    autocomplete.addEventListener("gmp-select", handleSelect);

    return () => {
      autocomplete.removeEventListener("gmp-select", handleSelect);
      autocomplete.remove();
    };
  }, [places]);

  return <div ref={containerRef} className="min-w-0 flex-1" />;
}