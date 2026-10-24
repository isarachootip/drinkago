/**
 * คำนวณระยะห่างระหว่างพิกัด GPS 2 จุด (Haversine formula) คืนค่าเป็นเมตร (จำนวนเต็ม)
 */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} ม.`;
  }
  return `${(meters / 1000).toFixed(1)} กม.`;
}

export async function getCurrentGps(opts: {
  mockGps: boolean;
  mockLat: number;
  mockLng: number;
}): Promise<{ lat: number; lng: number }> {
  if (opts.mockGps || typeof navigator === 'undefined' || !navigator.geolocation) {
    return { lat: opts.mockLat, lng: opts.mockLng };
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: opts.mockLat, lng: opts.mockLng }),
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 },
    );
  });
}
