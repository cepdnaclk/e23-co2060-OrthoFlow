import { useState, useEffect } from "react";
import { C } from "../constants.js";
import { clearToken, getMyProfile, updateMyProfile } from "../api.js";
import { AppLayout, Reveal } from "../components.jsx";

export default function SettingsPage({ setPage, setSelectedPatient, onLogout, user }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ fullName: "", email: "", regNumber: "", password: "" });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await getMyProfile();
      if (!error && data?.user) {
        setProfile(data.user);
        setForm({ fullName: data.user.fullName || "", email: data.user.email || "", regNumber: data.user.regNumber || "", password: "" });
      }
      setLoading(false);
    })();
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {};
    if (form.fullName !== (profile?.fullName || "")) payload.fullName = form.fullName;
    if (form.email !== (profile?.email || "")) payload.email = form.email;
    if (form.regNumber !== (profile?.regNumber || "")) payload.regNumber = form.regNumber;
    if (form.password.trim()) payload.password = form.password;

    if (Object.keys(payload).length === 0) {
      showToast("No changes to save", "info");
      setSaving(false);
      setEditing(false);
      return;
    }

    const { data, error } = await updateMyProfile(payload);
    setSaving(false);
    if (!error && data?.user) {
      setProfile(data.user);
      setForm({ ...form, password: "" });
      setEditing(false);
      showToast("Profile updated successfully!");
    } else {
      showToast(error || "Failed to update profile", "error");
    }
  };

  const handleCancel = () => {
    setForm({ fullName: profile?.fullName || "", email: profile?.email || "", regNumber: profile?.regNumber || "", password: "" });
    setEditing(false);
  };

  const getRoleBadge = (role) => {
    const map = {
      ADMIN: { bg: "linear-gradient(135deg, #ef4444, #dc2626)", icon: "⚙️", label: "Administrator" },
      STAFF: { bg: "linear-gradient(135deg, #2196f3, #1565c0)", icon: "🩺", label: "Staff / Clinician" },
      STUDENT: { bg: "linear-gradient(135deg, #8b5cf6, #7c3aed)", icon: "🎓", label: "Student" },
    };
    return map[role] || { bg: C.gray400, icon: "👤", label: role || "User" };
  };

  const roleBadge = getRoleBadge(profile?.role || user?.role);
  const displayName = profile?.fullName || profile?.username || user?.name || "User";
  const initials = displayName.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
  const memberSince = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";

  const inputStyle = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: `1.5px solid ${C.blue}40`, fontSize: 14, fontFamily: "inherit",
    color: C.gray900, outline: "none", boxSizing: "border-box",
    background: `${C.blue}06`, transition: "border-color 0.2s",
  };

  return (
    <AppLayout active="settings" setPage={setPage} setSelectedPatient={setSelectedPatient} onLogout={onLogout} user={user}>
      <div style={{ padding: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.gray900, margin: "0 0 4px" }}>Settings</h1>
        <Reveal style={{ color: C.gray500, fontSize: 13, marginBottom: 24 }}>Manage your account and view profile details</Reveal>

        {/* Toast */}
        {toast && (
          <div style={{
            position: "fixed", top: 24, right: 24, zIndex: 9999,
            padding: "12px 20px", borderRadius: 12,
            background: toast.type === "error" ? C.red : toast.type === "info" ? C.blue : C.green,
            color: "#fff", fontSize: 14, fontWeight: 600,
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            display: "flex", alignItems: "center", gap: 8,
            animation: "slideIn 0.3s ease"
          }}>
            {toast.type === "error" ? "✕" : toast.type === "info" ? "ℹ" : "✓"} {toast.msg}
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, color: C.gray400, fontSize: 14 }}>
            <div style={{ width: 20, height: 20, border: `2px solid ${C.gray200}`, borderTopColor: C.blue, borderRadius: "50%", animation: "spin 0.75s linear infinite", marginRight: 10 }} />
            Loading profile...
          </div>
        ) : (
          <>
            {/* Profile Header */}
            <Reveal style={{ background: "#fff", borderRadius: 16, border: `1px solid ${C.gray200}`, overflow: "hidden", marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ height: 100, background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyMid} 50%, #1e3a5f 100%)`, position: "relative" }}>
                <div style={{ position: "absolute", top: 20, right: 20, padding: "5px 14px", borderRadius: 20, background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", color: "#fff", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{roleBadge.icon}</span> {roleBadge.label}
                </div>
              </div>
              <div style={{ padding: "0 24px 24px", position: "relative" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg, ${C.blue}, ${C.teal})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 24, fontWeight: 700, border: "4px solid #fff", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", marginTop: -36, position: "relative", zIndex: 1 }}>
                  {initials}
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: C.gray900 }}>{displayName}</div>
                  <div style={{ fontSize: 13, color: C.gray500, marginTop: 2 }}>@{profile?.username || user?.name || "user"}</div>
                </div>
              </div>
            </Reveal>

            {/* Account Details (View / Edit) */}
            <Reveal style={{ background: "#fff", borderRadius: 16, border: `1px solid ${C.gray200}`, padding: 24, marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <SectionTitle icon="👤">Account Details</SectionTitle>
                {!editing ? (
                  <button onClick={() => setEditing(true)} style={{
                    background: `${C.blue}10`, border: `1px solid ${C.blue}30`, borderRadius: 8,
                    padding: "7px 16px", fontSize: 13, fontWeight: 600, color: C.blue,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = `${C.blue}20`}
                    onMouseLeave={e => e.currentTarget.style.background = `${C.blue}10`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={C.blue}><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    Edit Profile
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={handleCancel} style={{
                      background: "#fff", border: `1px solid ${C.gray200}`, borderRadius: 8,
                      padding: "7px 16px", fontSize: 13, fontWeight: 600, color: C.gray700, cursor: "pointer",
                    }}>Cancel</button>
                    <button onClick={handleSave} disabled={saving} style={{
                      background: C.blue, border: "none", borderRadius: 8,
                      padding: "7px 16px", fontSize: 13, fontWeight: 600, color: "#fff",
                      cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      {saving && <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.75s linear infinite" }} />}
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                <DetailRow label="Username" value={profile?.username || "—"} icon={<UserIcon />} />

                {editing ? (
                  <EditRow label="Full Name" value={form.fullName} onChange={v => setForm({ ...form, fullName: v })} placeholder="Enter your full name" inputStyle={inputStyle} icon={<ProfileIcon />} />
                ) : (
                  <DetailRow label="Full Name" value={profile?.fullName || "Not set"} muted={!profile?.fullName} icon={<ProfileIcon />} />
                )}

                {editing ? (
                  <EditRow label="Email" value={form.email} onChange={v => setForm({ ...form, email: v })} placeholder="you@example.com" type="email" inputStyle={inputStyle} icon={<EmailIcon />} />
                ) : (
                  <DetailRow label="Email" value={profile?.email || "Not set"} muted={!profile?.email} icon={<EmailIcon />} />
                )}

                <DetailRow label="Role" icon={<ShieldIcon />} badge={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 12, background: roleBadge.bg, color: "#fff", fontSize: 11, fontWeight: 600 }}>
                    {roleBadge.icon} {roleBadge.label}
                  </span>
                } />

                {(profile?.regNumber || editing) && (
                  editing ? (
                    <EditRow label="Registration Number" value={form.regNumber} onChange={v => setForm({ ...form, regNumber: v })} placeholder="e.g. STU-2026-001" inputStyle={inputStyle} icon={<DocIcon />} />
                  ) : (
                    <DetailRow label="Registration Number" value={profile?.regNumber || "Not set"} muted={!profile?.regNumber} icon={<DocIcon />} />
                  )
                )}

                {editing && (
                  <EditRow label="New Password" value={form.password} onChange={v => setForm({ ...form, password: v })} placeholder="Leave blank to keep current" type="password" inputStyle={inputStyle} icon={<LockIcon />} hint="Only fill if you want to change your password" />
                )}

                <DetailRow label="Member Since" value={memberSince} icon={<CalendarIcon />} last />
              </div>
            </Reveal>

            {/* Notifications */}
            {(profile?.role || user?.role) === "STAFF" && (
              <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${C.gray200}`, padding: 24, marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <SectionTitle icon="🔔">Notifications</SectionTitle>
                {[["Email reminders for appointments", true], ["SMS reminders for appointments", false], ["Weekly summary report", true]].map(([label, val]) => (
                  <ToggleRow key={label} label={label} defaultChecked={val} />
                ))}
              </div>
            )}

            {/* Sign Out */}
            <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${C.gray200}`, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <SectionTitle icon="🔐">Account</SectionTitle>
              <p style={{ color: C.gray500, fontSize: 13, marginBottom: 16 }}>Signing out will end your current session.</p>
              <button onClick={() => { clearToken(); onLogout(); }} style={{
                background: `linear-gradient(135deg, ${C.red}, #dc2626)`, color: "#fff", border: "none", borderRadius: 10,
                padding: "11px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8, boxShadow: "0 2px 8px rgba(239,68,68,0.25)", transition: "transform 0.15s, box-shadow 0.15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(239,68,68,0.35)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(239,68,68,0.25)"; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" /></svg>
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </AppLayout>
  );
}

/* ── Helpers ── */

function SectionTitle({ children, icon }) {
  return (
    <div style={{ fontWeight: 700, fontSize: 15, color: C.gray900, display: "flex", alignItems: "center", gap: 8 }}>
      {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      {children}
    </div>
  );
}

function DetailRow({ label, value, icon, muted, badge, last }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "14px 0", borderBottom: last ? "none" : `1px solid ${C.gray100}`, gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: C.gray50, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: C.gray400, fontWeight: 600, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
        {badge || (
          <div style={{ fontSize: 14, color: muted ? C.gray400 : C.gray900, fontWeight: 500, fontStyle: muted ? "italic" : "normal", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
        )}
      </div>
    </div>
  );
}

function EditRow({ label, value, onChange, placeholder, type = "text", inputStyle, icon, hint }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", padding: "14px 0", borderBottom: `1px solid ${C.gray100}`, gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${C.blue}08`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: C.blue, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
        <input
          type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} style={inputStyle}
          onFocus={e => e.target.style.borderColor = C.blue}
          onBlur={e => e.target.style.borderColor = `${C.blue}40`}
        />
        {hint && <div style={{ fontSize: 11, color: C.gray400, marginTop: 4 }}>{hint}</div>}
      </div>
    </div>
  );
}

function ToggleRow({ label, defaultChecked }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.gray100}` }}>
      <span style={{ fontSize: 13, color: C.gray700 }}>{label}</span>
      <button onClick={() => setChecked(v => !v)} style={{ width: 40, height: 22, borderRadius: 11, border: "none", background: checked ? C.blue : C.gray200, cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
        <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: checked ? 21 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
      </button>
    </div>
  );
}

/* ── Icons ── */
const UserIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill={C.gray400}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>;
const ProfileIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill={C.gray400}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>;
const EmailIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill={C.gray400}><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>;
const ShieldIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill={C.gray400}><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>;
const DocIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill={C.gray400}><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>;
const LockIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill={C.gray400}><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>;
const CalendarIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill={C.gray400}><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>;
