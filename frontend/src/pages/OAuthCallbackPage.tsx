import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { canAccessReview, canAccessUserAdmin } from "../auth/roles";
import type { UserRole } from "../types/auth";

function destinationForRole(role: UserRole) {
  if (canAccessUserAdmin(role)) {
    return "/admin";
  }
  if (canAccessReview(role)) {
    return "/teacher/submissions/history";
  }
  if (role === "STUDENT") {
    return "/submissions/upload";
  }
  return "/dashboard";
}

export function OAuthCallbackPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { completeOAuthLogin } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const tokenParam = new URLSearchParams(location.search).get("token");
    if (!tokenParam) {
      setError("Google sign-in did not return an access token.");
      return;
    }
    const oauthToken = tokenParam;

    async function finish() {
      try {
        const profile = await completeOAuthLogin(oauthToken);
        if (active) {
          navigate(destinationForRole(profile.role), { replace: true });
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Google sign-in failed");
        }
      }
    }

    void finish();
    return () => {
      active = false;
    };
  }, [completeOAuthLogin, location.search, navigate]);

  return (
    <main className="not-found-page">
      <section className="panel not-found-panel">
        <p className="eyebrow">Google sign-in</p>
        <h1>{error ? "Could not finish login" : "Finishing login"}</h1>
        {error ? (
          <>
            <p>{error}</p>
            <Link className="button button-primary" to="/login">Back to login</Link>
          </>
        ) : (
          <p className="route-loading">Please wait...</p>
        )}
      </section>
    </main>
  );
}
