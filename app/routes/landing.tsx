import { GoogleLogin } from "@react-oauth/google";
import { useNavigate, useOutletContext } from "react-router";

export default function Landing() {
  const { setUser } = useOutletContext<{
    setUser: (user: {
      id: number;
      email: string;
      name: string;
      profile_picture?: string;
    }) => void;
  }>();

  const navigate = useNavigate();

  return (
    <>
      <GoogleLogin
        onSuccess={async (response) => {
          const result = await fetch(
            "http://localhost:8000/auth/google",
            {
              method: "POST",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                credential: response.credential,
              }),
            }
          );

          if (result.ok) {
            const user = await result.json();

            setUser(user);
            navigate("/trips");
          }
        }}
        onError={() => console.error("Google login failed")}
      />
    </>
  );
}