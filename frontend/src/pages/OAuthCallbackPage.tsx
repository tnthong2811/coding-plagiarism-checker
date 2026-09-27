import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { canAccessReview, canAccessUserAdmin } from "../auth/roles";
import type { UserProfile, UserRole } from "../types/auth";
import { getFriendlyErrorMessage } from "../utils/errorMessages";

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

function shouldAskForUsername(profile: UserProfile) {
  return Boolean(profile.email && profile.username.toLowerCase() === profile.email.toLowerCase());
}

function suggestedUsername(profile: UserProfile) {
  return profile.email?.split("@")[0] ?? "";
}

export function OAuthCallbackPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { completeOAuthLogin, updateUsername } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [profileNeedingName, setProfileNeedingName] = useState<UserProfile | null>(null);
  const [username, setUsername] = useState("");
  const [setupError, setSetupError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const completionRef = useRef<{ token: string; promise: ReturnType<typeof completeOAuthLogin> } | null>(null);

  useEffect(() => {
    let active = true;
    const tokenParam = new URLSearchParams(location.search).get("token");
    if (!tokenParam) {
      setError("Google sign-in did not return an access token.");
      return;
    }
    const oauthToken = tokenParam;
    let completion = completionRef.current;
    if (!completion || completion.token !== oauthToken) {
      completion = { token: oauthToken, promise: completeOAuthLogin(oauthToken) };
      completionRef.current = completion;
    }
    const activeCompletion = completion;

    async function finish() {
      try {
        const profile = await activeCompletion.promise;
        if (!active) {
          return;
        }
        if (shouldAskForUsername(profile)) {
          setUsername(suggestedUsername(profile));
          setProfileNeedingName(profile);
          return;
        }
        navigate(destinationForRole(profile.role), { replace: true });
      } catch (err) {
        if (completionRef.current?.token === oauthToken) {
          completionRef.current = null;
        }
        if (active) {
          setError(getFriendlyErrorMessage(err, "Không thể hoàn tất đăng nhập bằng Google."));
        }
      }
    }

    void finish();
    return () => {
      active = false;
    };
  }, [completeOAuthLogin, location.search, navigate]);

  async function handleUsernameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profileNeedingName) {
      return;
    }

    const nextUsername = username.trim();
    if (!nextUsername) {
      setSetupError("Please enter a name.");
      return;
    }

    setSaving(true);
    setSetupError(null);
    try {
      const updatedProfile = await updateUsername(nextUsername);
      navigate(destinationForRole(updatedProfile.role), { replace: true });
    } catch (err) {
      setSetupError(getFriendlyErrorMessage(err, "Không thể cập nhật tên hiển thị."));
    } finally {
      setSaving(false);
    }
  }

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
      {profileNeedingName && (
        <div className="modal-backdrop" role="presentation">
          <section className="confirm-dialog google-name-dialog" role="dialog" aria-modal="true" aria-labelledby="google-name-title">
            <div>
              <p className="eyebrow">Google sign-in</p>
              <h2 id="google-name-title">Choose your name</h2>
              <p>This name will be saved to your account.</p>
            </div>
            <form onSubmit={handleUsernameSubmit}>
              <label>
                Name
                <input
                  autoFocus
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  minLength={2}
                  maxLength={60}
                  required
                />
              </label>
              {setupError && <p className="alert alert-error">{setupError}</p>}
              <div className="confirm-dialog__actions">
                <button className="button button-primary" type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save and continue"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
