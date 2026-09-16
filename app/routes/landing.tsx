import { useRef } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate, useOutletContext } from "react-router";
import LiquidReveal from "../components/LiquidReveal";

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
  const pageRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={pageRef} className="landing-page">
      <LiquidReveal containerRef={pageRef} />

      <div className="landing-content">
        <h1>
            <span>look for</span>ward
        </h1>
        <GoogleLogin
            theme="filled_black"
            shape="pill"
            size="large"
            text="continue_with"
            width="150"
            onSuccess={async (response) => {
                const result = await fetch(
                `${import.meta.env.VITE_API_URL}/auth/google`,
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
      </div>
      <footer className="landing-footer">
        made with ♡ by gia
      </footer>
    </div>
  );
}