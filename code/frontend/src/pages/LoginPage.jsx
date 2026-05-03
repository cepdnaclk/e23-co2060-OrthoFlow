import { useState, useEffect, useRef } from "react";
import { C } from "../constants.js";
import { loginUser, registerUser } from "../api.js";

/**
 * LoginPage
 *
 * Props:
 *   onLogin: (user: { name, email, picture, initials }) => void
 *
 */
export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPolicyModal, setShowPolicyModal] = useState(null);

  const clearError = (key) =>
    setErrors((prev) => ({ ...prev, [key]: undefined }));

  // ── Username / password submit ────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!username.trim()) e.username = "Username is required";
    if (!password) e.password = "Password is required";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      const authResponse = await loginUser({ username, password });
      const { data, error } = authResponse;

      if (error) {
        setErrors({ password: error });
      } else {
        onLogin({
          name: data?.user?.username || data?.username || username,
          email: "",
          picture: "",
          initials: (data?.user?.username || data?.username || username).substring(0, 2).toUpperCase(),
          provider: "password",
          token: data?.token || null,
          role: data?.user?.role || "STUDENT",
        });
      }
    } catch {
      setErrors({ password: "Unexpected error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = (key) => ({
    width: "100%",
    padding: "11px 14px",
    paddingRight: key === "password" ? 44 : 14,
    borderRadius: 10,
    border: `1.5px solid ${errors[key] ? C.red : "rgba(255,255,255,0.12)"}`,
    background: "rgba(255,255,255,0.07)",
    color: "#fff",
    fontSize: 14,
    outline: "none",
    fontFamily: "inherit",
    transition: "border-color 0.15s",
    boxSizing: "border-box",
  });

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", padding: "24px 16px",
      background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyMid} 55%, #162038 100%)`,
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      {/* Blobs */}
      <div style={{ position: "absolute", top: -140, left: -140, width: 440, height: 440, borderRadius: "50%", background: "rgba(33,150,243,0.09)", filter: "blur(70px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -100, right: -100, width: 360, height: 360, borderRadius: "50%", background: "rgba(0,191,165,0.07)", filter: "blur(60px)", pointerEvents: "none" }} />

      {/* Card */}
      <div style={{
        background: "rgba(255,255,255,0.04)", backdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24,
        padding: "40px 40px 36px", width: "100%", maxWidth: 440,
        boxShadow: "0 32px 80px rgba(0,0,0,0.55)", position: "relative", zIndex: 1,
      }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg,${C.blue},${C.teal})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
            </svg>
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 17, letterSpacing: "-0.3px" }}>OrthoRecords</div>
            <div style={{ color: C.gray400, fontSize: 11 }}>Case Management</div>
          </div>
        </div>

        <div style={{ marginTop: 22, textAlign: "center" }}>
          <span style={{ color: C.gray500, fontSize: 12 }}>
            By continuing you agree to our{" "}
            <span onClick={() => setShowPolicyModal("terms")} style={{ color: C.blueLight, cursor: "pointer" }}>Terms</span>{" "}
            and{" "}
            <span onClick={() => setShowPolicyModal("privacy")} style={{ color: C.blueLight, cursor: "pointer" }}>Privacy Policy</span>
          </span>
        </div>

        <>
          <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.4px" }}>
            Welcome back
          </h2>
          <p style={{ color: C.gray400, fontSize: 13, margin: "0 0 24px", lineHeight: 1.5 }}>
            Sign in to manage your patients and appointments.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>Username</label>
              <input type="text" value={username}
                onChange={(e) => { setUsername(e.target.value); clearError("username"); }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="Enter your username" style={fieldStyle("username")}
                onFocus={(e) => !errors.username && (e.target.style.borderColor = C.blue)}
                onBlur={(e) => !errors.username && (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
              />
              {errors.username && <ErrMsg>{errors.username}</ErrMsg>}
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError("password"); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="Enter your password" style={fieldStyle("password")}
                  onFocus={(e) => !errors.password && (e.target.style.borderColor = C.blue)}
                  onBlur={(e) => !errors.password && (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                />
                <button onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.gray400, display: "flex", padding: 2 }}>
                  {showPw ? <EyeOff /> : <EyeOn />}
                </button>
              </div>
              {errors.password && <ErrMsg>{errors.password}</ErrMsg>}
            </div>

            <button onClick={handleSubmit} disabled={loading} style={{
              width: "100%", padding: "13px 0",
              background: loading ? "rgba(33,150,243,0.5)" : `linear-gradient(135deg,${C.blue},#1565c0)`,
              border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4,
              boxShadow: loading ? "none" : "0 4px 20px rgba(33,150,243,0.35)",
            }}>
              {loading && <Spinner color="rgba(255,255,255,0.5)" />}
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </div>
        </>
      </div>

      {showPolicyModal && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 400, boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 12px", color: C.gray900, fontSize: 18 }}>
              {showPolicyModal === "terms" ? "Terms of Service" : "Privacy Policy"}
            </h3>
            <div style={{ color: C.gray600, fontSize: 13, lineHeight: 1.6, maxHeight: "50vh", overflowY: "auto", marginBottom: 20, paddingRight: 8 }}>
              {showPolicyModal === "terms" ? (
                <>
                  <p style={{ marginBottom: 8 }}>By using OrthoRecords, you agree to these terms. This system is for clinical and educational use only.</p>
                  <p style={{ marginBottom: 8 }}>You are responsible for maintaining the confidentiality of patient data in compliance with HIPAA and relevant healthcare regulations.</p>
                  <p>Do not share your account credentials with anyone. All actions are logged and audited.</p>
                </>
              ) : (
                <>
                  <p style={{ marginBottom: 8 }}>We take your privacy and patient data security seriously. All data is encrypted in transit and at rest.</p>
                  <p style={{ marginBottom: 8 }}>We do not sell or share patient records with third parties. Data is only accessible to authorized clinical personnel.</p>
                  <p>If you have any questions about data retention, please contact your system administrator.</p>
                </>
              )}
            </div>
            <button onClick={() => setShowPolicyModal(null)} style={{ width: "100%", padding: "10px 0", background: C.gray100, color: C.gray800, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Close
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(148,163,184,0.55); }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px rgba(17,24,39,0.95) inset !important;
          -webkit-text-fill-color: #fff !important;
        }
      `}</style>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const labelStyle = {
  display: "block", fontSize: 12, fontWeight: 600,
  color: C.gray400, marginBottom: 6, letterSpacing: "0.2px",
};

function ErrMsg({ children }) {
  return (
    <div style={{ fontSize: 11, color: C.red, marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill={C.red}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
      </svg>
      {children}
    </div>
  );
}

function Spinner({ color }) {
  return <div style={{ width: 16, height: 16, border: `2px solid rgba(255,255,255,0.15)`, borderTopColor: color, borderRadius: "50%", animation: "spin 0.75s linear infinite", flexShrink: 0 }} />;
}

function EyeOn() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78 3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
    </svg>
  );
}
