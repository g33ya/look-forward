import { useParams } from "react-router";

export default function TripPage() {
  const { trip } = useParams();

  return <h1>{trip?.split("-").join(" ")}</h1>;
}