import { useState, useEffect } from "react";
import { AppLayout } from "../components.jsx";
import { getUsers, createUser, deleteUser } from "../api.js";
import { C } from "../constants.js";

export default function UsersPage({ setPage, setSelectedPatient, onLogout, user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("STAFF");
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const res = await getUsers();
    if (res.error) {
      setError(res.error);
    } else {
      setUsers(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    if (!newUsername.trim() || !newPassword.trim()) return alert("Username and Password are required");
    setCreating(true);
    const res = await createUser({ username: newUsername, password: newPassword, role: newRole });
    setCreating(false);
    
    if (res.error) {
      alert("Error: " + res.error);
    } else {
      setNewUsername("");
      setNewPassword("");
      setNewRole("STAFF");
      fetchUsers();
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    const res = await deleteUser(id);
    if (res.error) {
      alert("Error: " + res.error);
    } else {
      fetchUsers();
    }
  };

  if (user?.role !== "ADMIN") {
    return (
      <AppLayout active="users" setPage={setPage} setSelectedPatient={setSelectedPatient} onLogout={onLogout} user={user}>
        <div style={{ padding: 40, textAlign: "center", color: C.red }}>
          <h2>Access Denied</h2>
          <p>You do not have permission to view this page.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout active="users" setPage={setPage} setSelectedPatient={setSelectedPatient} onLogout={onLogout} user={user}>
      <div style={{ padding: "32px 40px", maxWidth: 1000, margin: "0 auto" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <h1 style={{ margin: "0 0 8px", fontSize: 28, color: C.gray900 }}>User Management</h1>
            <p style={{ margin: 0, color: C.gray500 }}>Create and manage staff and student accounts.</p>
          </div>
        </div>

        {/* Create User Form */}
        <div style={{ background: "#fff", padding: 24, borderRadius: 16, border: `1px solid ${C.gray200}`, marginBottom: 32, display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.gray700, marginBottom: 6 }}>Username</label>
            <input 
              type="text" 
              value={newUsername} 
              onChange={e => setNewUsername(e.target.value)} 
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.gray200}`, fontSize: 14 }}
              placeholder="New username"
            />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.gray700, marginBottom: 6 }}>Password</label>
            <input 
              type="password" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.gray200}`, fontSize: 14 }}
              placeholder="Password"
            />
          </div>
          <div style={{ width: 150 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.gray700, marginBottom: 6 }}>Role</label>
            <select 
              value={newRole} 
              onChange={e => setNewRole(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.gray200}`, fontSize: 14 }}
            >
              <option value="STAFF">Staff</option>
              <option value="STUDENT">Student</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <button 
            onClick={handleCreateUser} 
            disabled={creating}
            style={{ padding: "11px 20px", background: C.blue, color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", opacity: creating ? 0.7 : 1 }}
          >
            {creating ? "Creating..." : "Create User"}
          </button>
        </div>

        {/* Users Table */}
        <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${C.gray200}`, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: C.gray500 }}>Loading users...</div>
          ) : error ? (
            <div style={{ padding: 40, textAlign: "center", color: C.red }}>{error}</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.gray50, borderBottom: `1px solid ${C.gray200}` }}>
                  <th style={{ padding: "16px 24px", textAlign: "left", fontSize: 13, fontWeight: 600, color: C.gray500 }}>ID</th>
                  <th style={{ padding: "16px 24px", textAlign: "left", fontSize: 13, fontWeight: 600, color: C.gray500 }}>Username</th>
                  <th style={{ padding: "16px 24px", textAlign: "left", fontSize: 13, fontWeight: 600, color: C.gray500 }}>Role</th>
                  <th style={{ padding: "16px 24px", textAlign: "left", fontSize: 13, fontWeight: 600, color: C.gray500 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${C.gray100}` }}>
                    <td style={{ padding: "16px 24px", fontSize: 14, color: C.gray900 }}>{u.id}</td>
                    <td style={{ padding: "16px 24px", fontSize: 14, color: C.gray900, fontWeight: 500 }}>{u.username}</td>
                    <td style={{ padding: "16px 24px" }}>
                      <span style={{ 
                        background: u.role === "ADMIN" ? "rgba(244, 67, 54, 0.1)" : u.role === "STAFF" ? "rgba(33, 150, 243, 0.1)" : "rgba(76, 175, 80, 0.1)",
                        color: u.role === "ADMIN" ? C.red : u.role === "STAFF" ? C.blue : C.green,
                        padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      {user.id !== u.id && (
                        <button 
                          onClick={() => handleDeleteUser(u.id)}
                          style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontWeight: 600, fontSize: 13 }}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
