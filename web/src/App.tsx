import React from "react";
import { useNavigate } from "react-router-dom";
import { checkCredentials } from "@/lib/auth";
import Footer from "@/components/Footer";
import { AuthLoading } from "@/components/AuthLoading";
import { useUser } from "@/lib/store";

function App() {
  const navigate = useNavigate();
  const currentUser = useUser();

  const [authCheckLoading, setAuthCheckLoading] = React.useState(false);

  React.useEffect(() => {
    checkAuth().then(() => {});
  }, []);

  const checkAuth = async () => {
    setAuthCheckLoading(true);
    const currentRoute = window.location.pathname + window.location.search;
    const status = await checkCredentials();
    if (status != 0) {
      if (currentRoute == "/") {
        navigate(`/auth/login`);
      } else {
        navigate(`/auth/login?route=${encodeURIComponent(currentRoute)}`);
      }
    } else {
      setAuthCheckLoading(false);
    }
  };

  return (
    <>
      {authCheckLoading ? (
        <AuthLoading />
      ) : (
        <div className="flex h-screen flex-col justify-between">
          <div className="p-4 lg:p-32 lg:pt-16">
            <h1>Hello {currentUser.first_name}</h1>
            <p className="mt-4 text-gray-400">
              Welcome to Sentinel, Gaucho Racing's central authentication
              service and member directory. Sentinel also provides Single Sign
              On (SSO) access to all our internal services. If you would like to
              build an application using Sentinel, check out our API
              documentation{" "}
              <span
                className="cursor-pointer text-gr-pink hover:text-gr-pink/80"
                onClick={() =>
                  window.open(
                    "https://wiki.gauchoracing.com/books/sentinel/page/api-documentation",
                    "_blank",
                  )
                }
              >
                here
              </span>
              .
            </p>
          </div>
          <Footer />
        </div>
      )}
    </>
  );
}

export default App;
