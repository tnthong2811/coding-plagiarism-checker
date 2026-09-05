import { FormEvent, useEffect, useMemo, useState } from "react";
import { createUserByAdmin, deleteUserByAdmin, listUsersByAdmin, updateUserRoleByAdmin } from "../api/authApi";
import { useAuth } from "../auth/AuthContext";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { AdminUser, UserRole } from "../types/auth";

const ROLE_OPTIONS: UserRole[] = ["STUDENT", "TEACHER", "ADMIN"];

function roleBadgeClass(role: UserRole) {
  return `role-badge role-badge--${role.toLowerCase()}`;
}

export function AdminUserManagementPage() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [createRole, setCreateRole] = useState<UserRole>("STUDENT");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingUsers, setDeletingUsers] = useState(false);

  const sortedUsers = useMemo(() => [...users].sort((a, b) => a.id - b.id), [users]);
  const selectableUsers = useMemo(
    () => sortedUsers.filter((item) => item.id !== user?.id),
    [sortedUsers, user?.id]
  );
  const allSelectableUsersSelected = selectableUsers.length > 0
    && selectableUsers.every((item) => selectedUserIds.includes(item.id));
  const roleCounts = useMemo(
    () => ({
      STUDENT: users.filter((item) => item.role === "STUDENT").length,
      TEACHER: users.filter((item) => item.role === "TEACHER").length,
      ADMIN: users.filter((item) => item.role === "ADMIN").length
    }),
    [users]
  );

  async function refreshUsers() {
    if (!token) return;
    setLoadingUsers(true);
    try {
      const data = await listUsersByAdmin(token);
      setUsers(data);
      setSelectedUserIds((current) =>
        current.filter((id) => data.some((item) => item.id === id && item.id !== user?.id))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    refreshUsers();
  }, [token]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setMessage(null);
    setError(null);
    setSubmittingCreate(true);

    try {
      await createUserByAdmin(token, { username, password, role: createRole });
      setMessage("User created successfully");
      setUsername("");
      setPassword("");
      setCreateRole("STUDENT");
      await refreshUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSubmittingCreate(false);
    }
  }

  async function handleRoleChange(targetUser: AdminUser, role: UserRole) {
    if (!token) return;

    setMessage(null);
    setError(null);
    setUpdatingUserId(targetUser.id);
    try {
      const updated = await updateUserRoleByAdmin(token, targetUser.id, { role });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setMessage(`Updated role for ${updated.username} to ${updated.role}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setUpdatingUserId(null);
    }
  }

  function toggleUserSelection(id: number) {
    if (id === user?.id) {
      return;
    }
    setSelectedUserIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function toggleAllUsers() {
    setSelectedUserIds(allSelectableUsersSelected ? [] : selectableUsers.map((item) => item.id));
  }

  async function deleteSelectedUsers() {
    if (!token || selectedUserIds.length === 0) {
      return;
    }

    const idsToDelete = [...selectedUserIds];
    setDeletingUsers(true);
    setMessage(null);
    setError(null);
    try {
      await Promise.all(idsToDelete.map((id) => deleteUserByAdmin(token, id)));
      setMessage(`Deleted ${idsToDelete.length} user${idsToDelete.length === 1 ? "" : "s"}.`);
      setSelectedUserIds([]);
      await refreshUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete selected users");
      await refreshUsers();
    } finally {
      setDeletingUsers(false);
      setConfirmDeleteOpen(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>User Management</h1>
          <p>Signed in as <strong>{user?.username}</strong>. Create accounts and update role assignments.</p>
        </div>
        <span className="role-badge role-badge--admin">ADMIN</span>
      </section>

      <section className="stat-grid stat-grid--four">
        <article className="stat-card">
          <span>Total users</span>
          <strong>{users.length}</strong>
          <small>{loadingUsers ? "Refreshing..." : "Loaded accounts"}</small>
        </article>
        <article className="stat-card">
          <span>Students</span>
          <strong>{roleCounts.STUDENT}</strong>
          <small>Submission access</small>
        </article>
        <article className="stat-card">
          <span>Teachers</span>
          <strong>{roleCounts.TEACHER}</strong>
          <small>Review access</small>
        </article>
        <article className="stat-card stat-card--accent">
          <span>Admins</span>
          <strong>{roleCounts.ADMIN}</strong>
          <small>Full management access</small>
        </article>
      </section>

      <div className="admin-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Create</p>
              <h2>New user</h2>
            </div>
          </div>
          <form className="stacked-form" onSubmit={handleCreate}>
            <label>
              Username
              <input value={username} onChange={(e) => setUsername(e.target.value)} required />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </label>
            <label>
              Role
              <select value={createRole} onChange={(e) => setCreateRole(e.target.value as UserRole)}>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </label>
            <button className="button button-primary" type="submit" disabled={submittingCreate}>
              {submittingCreate ? "Creating..." : "Create user"}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header panel-header--split">
            <div>
              <p className="eyebrow">Directory</p>
              <h2>All users</h2>
            </div>
            <div className="panel-actions">
              <button
                className="button button-danger"
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={selectedUserIds.length === 0 || deletingUsers}
              >
                Delete selected
              </button>
              <button className="button button-subtle" type="button" onClick={refreshUsers} disabled={loadingUsers}>
                {loadingUsers ? "Refreshing..." : "Refresh list"}
              </button>
            </div>
          </div>

          <p className="selection-note">Selected users: {selectedUserIds.length}</p>

          {message && <p className="alert alert-success">{message}</p>}
          {error && <p className="alert alert-error">{error}</p>}

          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="select-column">
                    <input
                      type="checkbox"
                      checked={allSelectableUsersSelected}
                      onChange={toggleAllUsers}
                      aria-label="Select all users"
                    />
                  </th>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(u.id)}
                        disabled={u.id === user?.id}
                        onChange={() => toggleUserSelection(u.id)}
                        aria-label={`Select ${u.username}`}
                      />
                    </td>
                    <td>#{u.id}</td>
                    <td>
                      {u.username}
                      {u.id === user?.id && <span className="inline-note">Current user</span>}
                    </td>
                    <td><span className={roleBadgeClass(u.role)}>{u.role}</span></td>
                    <td>
                      <select
                        value={u.role}
                        disabled={updatingUserId === u.id}
                        onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete selected users?"
        message={`This will permanently delete ${selectedUserIds.length} selected user${selectedUserIds.length === 1 ? "" : "s"}.`}
        confirmLabel="Delete users"
        loading={deletingUsers}
        onConfirm={deleteSelectedUsers}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}

