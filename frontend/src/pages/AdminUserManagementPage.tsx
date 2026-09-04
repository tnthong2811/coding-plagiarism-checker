import { FormEvent, useEffect, useMemo, useState } from "react";
import { createUserByAdmin, listUsersByAdmin, updateUserRoleByAdmin } from "../api/authApi";
import { useAuth } from "../auth/AuthContext";
import type { AdminUser, UserRole } from "../types/auth";

const ROLE_OPTIONS: UserRole[] = ["STUDENT", "TEACHER", "ADMIN"];

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

  const sortedUsers = useMemo(() => [...users].sort((a, b) => a.id - b.id), [users]);

  async function refreshUsers() {
    if (!token) return;
    setLoadingUsers(true);
    try {
      const data = await listUsersByAdmin(token);
      setUsers(data);
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

  return (
    <section className="card">
      <h2>Admin - User Management</h2>
      <p>Signed in as <strong>{user?.username}</strong> ({user?.role})</p>

      <form onSubmit={handleCreate}>
        <h3>Create New User</h3>
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
        <button type="submit" disabled={submittingCreate}>
          {submittingCreate ? "Creating..." : "Create user"}
        </button>
      </form>

      <hr />

      <h3>All Users</h3>
      <button type="button" onClick={refreshUsers} disabled={loadingUsers}>
        {loadingUsers ? "Refreshing..." : "Refresh list"}
      </button>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedUsers.map((u) => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.username}</td>
              <td>{u.role}</td>
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
    </section>
  );
}

