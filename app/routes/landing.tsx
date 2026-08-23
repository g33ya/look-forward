import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router";

export default function Landing() {
    const navigate = useNavigate();

    return (
        <>
            <GoogleLogin 
            onSuccess={(credentialResponse) => {
                console.log(credentialResponse);
                navigate("/trips");
            }} 
            onError={() => console.error("Google login failed")} 
            auto_select={true} />
        </>
    )
}