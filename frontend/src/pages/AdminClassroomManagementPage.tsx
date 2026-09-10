import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClassroom, deleteClassroom, getClassrooms, updateClassroom } from "../api/submissionApi";
import { useAuth } from "../auth/AuthContext";
import { roleBadgeClass } from "../auth/roles";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { ClassroomResponse, CreateClassroomRequest } from "../types/submission";

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
}

function parseUsernames(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function formatUsernames(value: string[]) {
  return value.join("\n");
}

const CLASS_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;

function normalizeClassCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function classroomPayload(
  name: string,
  code: string,
  description: string,
  teachers: string,
  students: string
): CreateClassroomRequest {
  return {
    name: name.trim(),
    code: normalizeClassCode(code),
    description: description.trim() || null,
    teacherUsernames: parseUsernames(teachers),
    studentUsernames: parseUsernames(students)
  };
}

function validateClassroomPayload(
  payload: CreateClassroomRequest,
  classrooms: ClassroomResponse[],
  excludedClassroomId?: number
) {
  if (!payload.name) {
    return "Class name is required";
  }
  if (!payload.code) {
    return "Class code is required";
  }
  if (!CLASS_CODE_PATTERN.test(payload.code)) {
    return "Class code must be 3-32 characters and use only letters, numbers, underscore, or hyphen";
  }
  if (
    classrooms.some(
      (classroom) => classroom.id !== excludedClassroomId && normalizeClassCode(classroom.code) === payload.code
    )
  ) {
    return `Class code ${payload.code} already exists`;
  }

  return null;
}

export function AdminClassroomManagementPage() {
  const { token, user } = useAuth();
  const [classrooms, setClassrooms] = useState<ClassroomResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedClassroomId, setSelectedClassroomId] = useState<number | "">("");
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<number[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTeachers, setNewTeachers] = useState("");
  const [newStudents, setNewStudents] = useState("");

  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTeachers, setEditTeachers] = useState("");
  const [editStudents, setEditStudents] = useState("");

  const selectedClassroom = useMemo(
    () => classrooms.find((classroom) => classroom.id === selectedClassroomId),
    [classrooms, selectedClassroomId]
  );
  const allClassroomsSelected = classrooms.length > 0
    && classrooms.every((classroom) => selectedDeleteIds.includes(classroom.id));

  const teacherCount = useMemo(
    () => new Set(classrooms.flatMap((classroom) => classroom.teacherUsernames)).size,
    [classrooms]
  );
  const studentCount = useMemo(
    () => new Set(classrooms.flatMap((classroom) => classroom.studentUsernames)).size,
    [classrooms]
  );
  const assignmentCount = useMemo(
    () => classrooms.reduce((sum, classroom) => sum + classroom.assignmentCount, 0),
    [classrooms]
  );

  async function refreshClassrooms() {
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const data = await getClassrooms(token);
      setClassrooms(data);
      setSelectedDeleteIds((current) => current.filter((id) => data.some((classroom) => classroom.id === id)));
      setSelectedClassroomId((current) => {
        if (current && data.some((classroom) => classroom.id === current)) {
          return current;
        }
        return data[0]?.id ?? "";
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load classrooms");
      setClassrooms([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshClassrooms();
  }, [token]);

  useEffect(() => {
    if (!selectedClassroom) {
      setEditName("");
      setEditCode("");
      setEditDescription("");
      setEditTeachers("");
      setEditStudents("");
      return;
    }

    setEditName(selectedClassroom.name);
    setEditCode(selectedClassroom.code);
    setEditDescription(selectedClassroom.description ?? "");
    setEditTeachers(formatUsernames(selectedClassroom.teacherUsernames));
    setEditStudents(formatUsernames(selectedClassroom.studentUsernames));
  }, [selectedClassroom]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setMessage(null);
    setError(null);
    const payload = classroomPayload(newName, newCode, newDescription, newTeachers, newStudents);
    const validationError = validateClassroomPayload(payload, classrooms);
    if (validationError) {
      setError(validationError);
      return;
    }

    setCreating(true);
    try {
      const created = await createClassroom(token, payload);
      setMessage(`Created class ${created.code}`);
      setNewName("");
      setNewCode("");
      setNewDescription("");
      setNewTeachers("");
      setNewStudents("");
      await refreshClassrooms();
      setSelectedClassroomId(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create classroom");
    } finally {
      setCreating(false);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedClassroom) return;

    setMessage(null);
    setError(null);
    const payload = classroomPayload(editName, editCode, editDescription, editTeachers, editStudents);
    const validationError = validateClassroomPayload(payload, classrooms, selectedClassroom.id);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      const updated = await updateClassroom(token, selectedClassroom.id, payload);
      setClassrooms((current) => current.map((classroom) => (classroom.id === updated.id ? updated : classroom)));
      setMessage(`Updated class ${updated.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update classroom");
    } finally {
      setSaving(false);
    }
  }

  function toggleClassroomSelection(id: number) {
    setSelectedDeleteIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function toggleAllClassrooms() {
    setSelectedDeleteIds(allClassroomsSelected ? [] : classrooms.map((classroom) => classroom.id));
  }

  async function deleteSelectedClassrooms() {
    if (!token || selectedDeleteIds.length === 0) return;

    const idsToDelete = [...selectedDeleteIds];
    setDeleting(true);
    setMessage(null);
    setError(null);
    try {
      await Promise.all(idsToDelete.map((id) => deleteClassroom(token, id)));
      setMessage(`Deleted ${idsToDelete.length} class${idsToDelete.length === 1 ? "" : "es"}.`);
      setSelectedDeleteIds([]);
      if (selectedClassroomId && idsToDelete.includes(selectedClassroomId)) {
        setSelectedClassroomId("");
      }
      await refreshClassrooms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete selected classrooms");
      await refreshClassrooms();
    } finally {
      setDeleting(false);
      setConfirmDeleteOpen(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Business administration</p>
          <h1>Classrooms</h1>
          <p>Signed in as <strong>{user?.username}</strong>. Manage academic classes, memberships, and assignment containers.</p>
        </div>
        {user?.role && <span className={roleBadgeClass(user.role)}>{user.role}</span>}
      </section>

      <section className="stat-grid stat-grid--four">
        <article className="stat-card">
          <span>Classes</span>
          <strong>{classrooms.length}</strong>
          <small>{loading ? "Refreshing..." : "Managed by Business Admin"}</small>
        </article>
        <article className="stat-card">
          <span>Teachers</span>
          <strong>{teacherCount}</strong>
          <small>Assigned by username</small>
        </article>
        <article className="stat-card">
          <span>Students</span>
          <strong>{studentCount}</strong>
          <small>Enrolled by username or code</small>
        </article>
        <article className="stat-card stat-card--accent">
          <span>Assignments</span>
          <strong>{assignmentCount}</strong>
          <small>Contained in classes</small>
        </article>
      </section>

      {message && <p className="alert alert-success">{message}</p>}
      {error && <p className="alert alert-error">{error}</p>}

      <div className="admin-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Create</p>
              <h2>New class</h2>
            </div>
          </div>
          <form className="stacked-form" onSubmit={handleCreate}>
            <label>
              Name
              <input value={newName} onChange={(event) => setNewName(event.target.value)} required maxLength={160} />
            </label>
            <label>
              Code
              <input
                value={newCode}
                onChange={(event) => setNewCode(normalizeClassCode(event.target.value))}
                required
                maxLength={32}
              />
            </label>
            <label>
              Description
              <textarea value={newDescription} onChange={(event) => setNewDescription(event.target.value)} maxLength={4000} />
            </label>
            <label>
              Teachers
              <textarea
                value={newTeachers}
                onChange={(event) => setNewTeachers(event.target.value)}
                placeholder="teacher01, teacher02"
              />
            </label>
            <label>
              Students
              <textarea
                value={newStudents}
                onChange={(event) => setNewStudents(event.target.value)}
                placeholder="student01, student02"
              />
            </label>
            <button className="button button-primary" type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create class"}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header panel-header--split">
            <div>
              <p className="eyebrow">Directory</p>
              <h2>Managed classes</h2>
            </div>
            <div className="panel-actions">
              <button
                className="button button-danger"
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={selectedDeleteIds.length === 0 || deleting}
              >
                Delete selected
              </button>
              <button className="button button-subtle" type="button" onClick={refreshClassrooms} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh list"}
              </button>
            </div>
          </div>

          <p className="selection-note">Selected classes: {selectedDeleteIds.length}</p>

          {loading ? (
            <p className="empty-state">Loading classrooms...</p>
          ) : classrooms.length === 0 ? (
            <p className="empty-state">No classrooms have been created yet.</p>
          ) : (
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="select-column">
                      <input
                        type="checkbox"
                        checked={allClassroomsSelected}
                        onChange={toggleAllClassrooms}
                        aria-label="Select all classrooms"
                      />
                    </th>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Teachers</th>
                    <th>Students</th>
                    <th>Assignments</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {classrooms.map((classroom) => (
                    <tr
                      key={classroom.id}
                      className={classroom.id === selectedClassroomId ? "comparison-row--active" : ""}
                      onClick={() => setSelectedClassroomId(classroom.id)}
                    >
                      <td onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedDeleteIds.includes(classroom.id)}
                          onChange={() => toggleClassroomSelection(classroom.id)}
                          aria-label={`Select class ${classroom.code}`}
                        />
                      </td>
                      <td>{classroom.code}</td>
                      <td>{classroom.name}</td>
                      <td>{classroom.teacherUsernames.length}</td>
                      <td>{classroom.studentUsernames.length}</td>
                      <td>{classroom.assignmentCount}</td>
                      <td>{formatDate(classroom.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Membership</p>
            <h2>{selectedClassroom ? `${selectedClassroom.code} - ${selectedClassroom.name}` : "Select a class"}</h2>
          </div>
        </div>
        {selectedClassroom ? (
          <form className="classroom-edit-form" onSubmit={handleSave}>
            <label>
              Name
              <input value={editName} onChange={(event) => setEditName(event.target.value)} required maxLength={160} />
            </label>
            <label>
              Code
              <input
                value={editCode}
                onChange={(event) => setEditCode(normalizeClassCode(event.target.value))}
                required
                maxLength={32}
              />
            </label>
            <label className="classroom-edit-form__wide">
              Description
              <textarea value={editDescription} onChange={(event) => setEditDescription(event.target.value)} maxLength={4000} />
            </label>
            <label>
              Teacher usernames
              <textarea value={editTeachers} onChange={(event) => setEditTeachers(event.target.value)} />
            </label>
            <label>
              Student usernames
              <textarea value={editStudents} onChange={(event) => setEditStudents(event.target.value)} />
            </label>
            <button className="button button-primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save class"}
            </button>
          </form>
        ) : (
          <p className="empty-state">Choose a classroom from the directory to edit its membership.</p>
        )}
      </section>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete selected classes?"
        message={`This will delete ${selectedDeleteIds.length} selected class${selectedDeleteIds.length === 1 ? "" : "es"} and all assignments/submission records inside them.`}
        confirmLabel="Delete classes"
        loading={deleting}
        onConfirm={deleteSelectedClassrooms}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
