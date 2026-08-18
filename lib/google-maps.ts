type GeocodeResult = {
  lat: number;
  lng: number;
  formattedAddress: string;
};

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error("GOOGLE_MAPS_API_KEY is not set");
    return null;
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", apiKey);

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    const data = await res.json();

    if (data.status !== "OK" || !data.results?.[0]) {
      console.warn("Geocoding failed:", data.status, data.error_message);
      return null;
    }

    const result = data.results[0];
    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
    };
  } catch (err) {
    console.error("Geocoding error:", err);
    return null;
  }
}