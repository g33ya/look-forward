export default function calculateDistanceMiles(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number
): number {
  const earthRadiusMiles = 3958.8;

  const toRadians = (degrees: number): number => {
    return (degrees * Math.PI) / 180;
  };

  const deltaLatitude = toRadians(latitude2 - latitude1);
  const deltaLongitude = toRadians(longitude2 - longitude1);

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(latitude1)) *
      Math.cos(toRadians(latitude2)) *
      Math.sin(deltaLongitude / 2) ** 2;

  return (
    earthRadiusMiles *
    2 *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
}