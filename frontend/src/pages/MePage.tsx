import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import type { UserRole } from "../types/auth";

const MAX_AVATAR_FILE_SIZE = 1024 * 1024;
const ACCEPTED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

const roleDetails: Record<UserRole, { eyebrow: string; title: string; body: string; action: string; to: string }> = {
  STUDENT: {
    eyebrow: "Submission access",
    title: "Student account",
    body: "You can upload source files for available assignments and review your recent submission history.",
    action: "Open upload page",
    to: "/submissions/upload"
  },
  TEACHER: {
    eyebrow: "Review access",
    title: "Teacher account",
    body: "You can create assignments, inspect submitted files, run comparisons, and open saved reports.",
    action: "Open assignments",
    to: "/teacher/submissions/history"
  },
  BUSINESS_ADMIN: {
    eyebrow: "Business administration",
    title: "Business admin account",
    body: "You can manage classroom users and keep access aligned with teaching responsibilities.",
    action: "Manage users",
    to: "/admin"
  },
  SYSTEM_ADMIN: {
    eyebrow: "System administration",
    title: "System admin account",
    body: "You can manage elevated account access while staying separate from day-to-day review workflows.",
    action: "Manage users",
    to: "/admin"
  }
};

export function MePage() {
  const { user, refreshMe, updateAvatar } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);

  useEffect(() => {
    setAvatarUrl(user?.avatarUrl ?? "");
  }, [user?.avatarUrl]);

  async function handleRefresh() {
    try {
      setMessage(null);
      setError(null);
      await refreshMe();
      setMessage("Profile refreshed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh");
    }
  }

  function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setMessage(null);
    setError(null);

    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      setError("Avatar must be a PNG, JPEG, GIF, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_FILE_SIZE) {
      setError("Avatar image must be 1 MB or smaller.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarUrl(reader.result);
      } else {
        setError("Failed to read avatar image.");
      }
    };
    reader.onerror = () => setError("Failed to read avatar image.");
    reader.readAsDataURL(file);
  }

  async function handleAvatarSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSavingAvatar(true);
    setMessage(null);
    setError(null);

    try {
      const updated = await updateAvatar(avatarUrl.trim() || null);
      setAvatarUrl(updated.avatarUrl ?? "");
      setMessage("Avatar updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update avatar");
    } finally {
      setSavingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    setSavingAvatar(true);
    setMessage(null);
    setError(null);

    try {
      await updateAvatar(null);
      setAvatarUrl("");
      setMessage("Avatar removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove avatar");
    } finally {
      setSavingAvatar(false);
    }
  }

  const role = user?.role ?? "STUDENT";
  const details = roleDetails[role];
  const initials = user?.username?.slice(0, 2).toUpperCase() ?? "US";
  const previewAvatarUrl = avatarUrl.trim();

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Account</p>
          <h1>My Profile</h1>
          <p>Review the identity and role currently attached to your session.</p>
        </div>
        <button className="button button-primary" type="button" onClick={handleRefresh}>
          Refresh profile
        </button>
      </section>

      {message && <p className="alert alert-success">{message}</p>}
      {error && <p className="alert alert-error">{error}</p>}

      <section className="profile-grid">
        <article className="profile-card">
          <span className="profile-avatar">
            {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials}
          </span>
          <div>
            <h2>{user?.username ?? "Unknown user"}</h2>
            <p>{user?.role ?? "No role loaded"}</p>
          </div>
        </article>
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">{details.eyebrow}</p>
              <h2>{details.title}</h2>
            </div>
          </div>
          <p className="muted">{details.body}</p>
          <Link className="button button-subtle profile-action" to={details.to}>
            {details.action}
          </Link>
        </article>
      </section>

      <section className="panel avatar-editor">
        <div className="avatar-editor__preview">
          <span className="profile-avatar profile-avatar--preview">
            {previewAvatarUrl ? <img src={previewAvatarUrl} alt="" /> : initials}
          </span>
          <div>
            <p className="eyebrow">Avatar</p>
            <h2>Profile photo</h2>
          </div>
        </div>
        <form className="stacked-form" onSubmit={handleAvatarSubmit}>
          <label>
            Image URL
            <input
              type="url"
              value={avatarUrl.startsWith("data:image/") ? "" : avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="https://example.com/avatar.png"
            />
          </label>
          <label>
            Upload image
            <input
              type="file"
              accept={ACCEPTED_AVATAR_TYPES.join(",")}
              onChange={handleAvatarFileChange}
            />
          </label>
          <div className="panel-actions">
            <button
              className="button button-subtle"
              type="button"
              onClick={handleRemoveAvatar}
              disabled={savingAvatar || (!user?.avatarUrl && !avatarUrl.trim())}
            >
              Remove avatar
            </button>
            <button className="button button-primary" type="submit" disabled={savingAvatar}>
              {savingAvatar ? "Saving..." : "Save avatar"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

