import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router";

export default function Landing() {
    const navigate = useNavigate();

    return (
        <>
            <GoogleLogin
                onSuccess={async (response) => {
                    await fetch("http://localhost:8000/auth/google", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        credential: response.credential,
                    }),
                    });
                    navigate("/trips");
                }}
                onError={() => console.error("Google login failed")}
                />
        </>
    )
}