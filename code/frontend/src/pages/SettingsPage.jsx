import { useState } from "react";
import { C } from "../constants.js";
import { clearToken } from "../api.js";
import { AppLayout, Reveal } from "../components.jsx";

/**
 * SettingsPage
 * Props:
 *   setPage:  (page: string) => void
 *   onLogout: () => void
 */
export default function SettingsPage({ setPage, setSelectedPatient, onLogout, user }) {
  const [profile, setProfile] = useState({ name: user?.name || "", email: user?.email || "" });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AppLayout active="settings" setPage={setPage} setSelectedPatient={setSelectedPatient} onLogout={onLogout} user={user}>
      <div style={{ padding: 28 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: C.gray900,
            margin: "0 0 4px",
          }}
        >
          Settings
        </h1>
        <Reveal style={{ color: C.gray500, fontSize: 13, marginBottom: 24 }}>
          Manage your account
        </Reveal>

        {/* ── Banner ── */}
        <Reveal style={{ marginBottom: 24 }}>
          <div style={{ width: "100%", height: 120, borderRadius: 16, overflow: "hidden", position: "relative" }}>
            <img src="/settings_header.png" alt="Settings Header" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </Reveal>

        {/* ── Profile ── */}
        <Reveal
          style={{
            background: "#fff",
            borderRadius: 14,
            border: `1px solid ${C.gray200}`,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <SectionTitle>Profile</SectionTitle>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: 16,
            }}
          >
            {/* Name */}
            <div style={{ flex: "0 0 calc(50% - 8px)", minWidth: 0 }}>
              <Label>Name</Label>
              <input
                value={profile.name}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Your full name"
                style={inputStyle}
              />
            </div>

            {/* Email */}
            <div style={{ flex: "0 0 calc(50% - 8px)", minWidth: 0 }}>
              <Label>Email</Label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, email: e.target.value }))
                }
                placeholder="you@example.com"
                style={inputStyle}
              />
            </div>

            {/* Role (read-only) */}
            <div style={{ flex: "0 0 calc(50% - 8px)", minWidth: 0 }}>
              <Label>Role</Label>
              <input
                readOnly
                value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase() : "User"}
                style={{ ...inputStyle, background: C.gray50, color: C.gray500 }}
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            style={{
              background: saved ? C.green : C.blue,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "9px 20px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.2s",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {saved ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                Saved!
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </Reveal>

        {/* ── Notifications ── */}
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            border: `1px solid ${C.gray200}`,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <SectionTitle>Notifications</SectionTitle>
          {[
            ["Email reminders for appointments", true],
            ["SMS reminders for appointments", false],
            ["Weekly summary report", true],
          ].map(([label, defaultVal]) => (
            <ToggleRow key={label} label={label} defaultChecked={defaultVal} />
          ))}
        </div>

        {/* ── Account / Sign Out ── */}
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            border: `1px solid ${C.gray200}`,
            padding: 20,
          }}
        >
          <SectionTitle>Account</SectionTitle>
          <p style={{ color: C.gray500, fontSize: 13, marginBottom: 16 }}>
            Signing out will end your current session.
          </p>
          <button
            onClick={() => { clearToken(); onLogout(); }}
            style={{
              background: C.red,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>
    </AppLayout>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <div
      style={{
        fontWeight: 700,
        fontSize: 15,
        color: C.gray900,
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}

function Label({ children }) {
  return (
    <label
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: C.gray700,
        display: "block",
        marginBottom: 4,
      }}
    >
      {children}
    </label>
  );
}

function ToggleRow({ label, defaultChecked }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 0",
        borderBottom: `1px solid ${C.gray100}`,
      }}
    >
      <span style={{ fontSize: 13, color: C.gray700 }}>{label}</span>
      <button
        onClick={() => setChecked((v) => !v)}
        style={{
          width: 40,
          height: 22,
          borderRadius: 11,
          border: "none",
          background: checked ? C.blue : C.gray300,
          cursor: "pointer",
          position: "relative",
          transition: "background 0.2s",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#fff",
            position: "absolute",
            top: 3,
            left: checked ? 21 : 3,
            transition: "left 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        />
      </button>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: `1px solid ${C.gray200}`,
  fontSize: 13,
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
  color: C.gray900,
};
