import React from "react";
import axios from "axios";
import {
  JIFFY_API_URL,
  SENTINEL_CLIENT_ID,
  SENTINEL_OAUTH_BASE_URL,
} from "@/consts/config";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import { useNavigate, useSearchParams } from "react-router-dom";
import { checkCredentials, saveAccessToken } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { OutlineButton } from "@/components/ui/outline-button";

function LoginPage() {
  const navigate = useNavigate();
  const [queryParameters] = useSearchParams();

  const [sentinelMsg, setSentinelMsg] = React.useState("");
  const [loginLoading, setLoginLoading] = React.useState(true);

  React.useEffect(() => {
    ping();
    login();
  }, []);

  const ping = async () => {
    try {
      const response = await axios.get(`${JIFFY_API_URL}/ping`);
      console.log(response.data);
      setSentinelMsg(response.data.message);
    } catch (error: any) {
      notify.error(getAxiosErrorMessage(error));
    }
  };

  const loginSentinel = async () => {
    const redirect_url = window.location.origin + "/auth/login";
    const scope = "user:read";
    let oauthUrl = `${SENTINEL_OAUTH_BASE_URL}?client_id=${SENTINEL_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirect_url)}&scope=${encodeURIComponent(scope)}`;
    const route = queryParameters.get("route");
    if (route) {
      oauthUrl += `&state=${encodeURIComponent(route)}`;
    }
    window.location.href = oauthUrl;
  };

  const checkAuth = async () => {
    const status = await checkCredentials();
    if (status == 0) {
      handleRedirect();
    }
  };

  const login = async () => {
    const code = queryParameters.get("code");
    if (!code) {
      loginSentinel();
      return;
    }
    try {
      const response = await axios.post(
        `${JIFFY_API_URL}/auth/login?code=${code}`,
      );
      if (response.status == 200) {
        saveAccessToken(response.data.access_token);
        checkAuth();
      }
    } catch (error: any) {
      notify.error(getAxiosErrorMessage(error));
      setLoginLoading(false);
    }
  };

  const handleRedirect = () => {
    const route = queryParameters.get("state");
    if (route && route != "null") {
      navigate(route);
    } else {
      navigate("/");
    }
  };

  const LoadingCard = () => {
    return (
      <Card className="border-none p-4 md:w-[500px] md:p-8">
        <div className="flex flex-col items-center justify-center">
          <img
            src="/logo/mechanic-logo.png"
            alt="Gaucho Racing"
            className="mx-auto h-20 md:h-24"
          />
          <Loader2 className="mt-8 h-16 w-16 animate-spin" />
        </div>
      </Card>
    );
  };

  const InvalidCodeCard = () => {
    return (
      <Card className="p-4 md:w-[500px] md:p-8">
        <div className="items-center">
          <img
            src="/logo/mechanic-logo.png"
            alt="Gaucho Racing"
            className="mx-auto h-20 md:h-24"
          />
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">
            Sentinel Sign On Error
          </h1>
          <p className="mt-4">Invalid or expired code. Please try again.</p>
          <OutlineButton
            className="mt-4 w-full"
            onClick={() => {
              loginSentinel();
            }}
          >
            Sentinel Sign On
          </OutlineButton>
        </div>
      </Card>
    );
  };

  return (
    <>
      <div className="flex h-screen flex-col items-center justify-between">
        <div className="w-full"></div>
        <div className="w-full items-center justify-center p-4 md:flex md:p-32">
          {loginLoading ? <LoadingCard /> : <InvalidCodeCard />}
        </div>
        <div className="flex w-full justify-end p-4 text-gray-500">
          <p>{sentinelMsg}</p>
        </div>
      </div>
    </>
  );
}

export default LoginPage;
