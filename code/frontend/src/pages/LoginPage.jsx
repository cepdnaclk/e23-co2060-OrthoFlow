import { useState, useEffect, useRef } from "react";
import { C } from "../constants.js";
import { loginUser, registerUser } from "../api.js";

/**
 * LoginPage
 *
 * Props:
 *   onLogin: (user: { name, email, picture, initials }) => void
 *
 * Google OAuth setup (one-time):
 *   1. Go to https://console.cloud.google.com/
 *   2. Create a project → APIs & Services → Credentials → Create OAuth 2.0 Client ID
 *   3. Application type: Web application
 *   4. Authorised JavaScript origins: http://localhost:5173
 *   5. Copy the Client ID and paste it into GOOGLE_CLIENT_ID below
 */

const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID_HERE"; // ← paste your Client ID

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function LoginPage({ onLogin }) {
  const [tab, setTab] = useState("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState("CLINICIAN");
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(null); // "terms" | "privacy" | null
  const googleBtnRef = useRef(null);

  // ── Initialise Google Identity Services ─────────────────────────────────
  useEffect(() => {
    const init = () => {
      if (!window.google) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Render the official Google button (hidden — we trigger it via our own button)
      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          width: 360,
        });
      }
    };

    // SDK might already be loaded or still loading
    if (window.google) {
      init();
    } else {
      // Wait for the async script to fire its onload
      const interval = setInterval(() => {
        if (window.google) { clearInterval(interval); init(); }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  // ── Called by Google with a JWT credential ───────────────────────────────
  const handleGoogleCredential = (response) => {
    setGLoading(false);
    try {
      // Decode the JWT payload (base64) — no library needed
      const payload = JSON.parse(
        atob(response.credential.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
      );
      const user = {
        name: payload.name || payload.email,
        email: payload.email || "",
        picture: payload.picture || "",
        initials: getInitials(payload.name || payload.email),
        provider: "google",
      };
      onLogin(user);
    } catch {
      setErrors({ google: "Google sign-in failed. Please try again." });
    }
  };

  // ── Trigger the Google Account Chooser popup ─────────────────────────────
  const handleGoogleClick = () => {
    if (GOOGLE_CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID_HERE") {
      // Mock flow for local testing when no Client ID is provided
      setGLoading(true);
      const doDemoLogin = async () => {
        // Attempt to register the demo user (ignore error if already exists)
        await registerUser({ username: "demo_user", email: "demo@gmail.com", password: "password123", role: "CLINICIAN" });
        // Log in to get a real backend token
        const res = await loginUser({ username: "demo_user", password: "password123" });
        setGLoading(false);
        
        onLogin({
          name: "Dr. Google Demo",
          email: "demo@gmail.com",
          picture: "",
          initials: "GD",
          provider: "google",
          role: "CLINICIAN",
          token: res.data?.token || null
        });
      };
      doDemoLogin();
      return;
    }

    if (!window.google) {
      setErrors({ google: "Google SDK not loaded yet. Please wait a moment." });
      return;
    }

    setGLoading(true);
    // Clicking the hidden rendered button opens the real account chooser
    googleBtnRef.current?.querySelector("div[role=button]")?.click();
    // If user cancels the popup, clear loading after a timeout
    setTimeout(() => setGLoading(false), 8000);
  };

  // ── Username / password submit ────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!username.trim()) e.username = "Username is required";
    if (tab === "signup" && !email.trim()) e.email = "Email is required";
    if (tab === "signup" && email && !/\S+@\S+\.\S+/.test(email))
      e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    if (password.length > 0 && password.length < 6)
      e.password = "At least 6 characters";
    if (tab === "signup" && password !== confirm)
      e.confirm = "Passwords do not match";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      let authResponse;
      if (tab === "signup") {
        const regRes = await registerUser({ username, email, password, role });
        if (regRes.error) {
          setErrors({ password: regRes.error });
          setLoading(false);
          return;
        }
      }

      authResponse = await loginUser({ username, password });
      const { data, error } = authResponse;

      if (error) {
        setErrors({ password: error });
      } else {
        onLogin({
          name: data?.user?.username || data?.username || username,
          email: data?.email || email || "",
          picture: data?.picture || "",
          initials: getInitials(data?.user?.username || data?.username || username),
          provider: "password",
          token: data?.token || null,
          role: data?.user?.role || "DOCTOR",
        });
      }
    } catch {
      setErrors({ password: "Unexpected error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = () => {
    const e = {};
    if (!email.trim()) e.email = "Email is required";
    if (email && !/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setResetSuccess(true);
    }, 1500);
  };

  const clearError = (key) =>
    setErrors((prev) => ({ ...prev, [key]: undefined }));

  const fieldStyle = (key) => ({
    width: "100%",
    padding: "11px 14px",
    paddingRight: key === "password" || key === "confirm" ? 44 : 14,
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

        {/* Tab switcher */}
        {tab !== "forgot" && (
          <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 4, marginBottom: 28 }}>
            {[["signin", "Sign In"], ["signup", "Sign Up"]].map(([key, label]) => (
              <button key={key} onClick={() => { setTab(key); setErrors({}); }} style={{
                flex: 1, padding: "9px 0", borderRadius: 9, border: "none",
                background: tab === key ? "rgba(255,255,255,0.12)" : "transparent",
                color: tab === key ? "#fff" : C.gray400,
                fontWeight: tab === key ? 600 : 400,
                fontSize: 14, cursor: "pointer", transition: "all 0.2s",
              }}>{label}</button>
            ))}
          </div>
        )}

        {resetSuccess && tab === "forgot" ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(0,191,165,0.15)", color: C.teal, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
            <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>Check your email</h2>
            <p style={{ color: C.gray400, fontSize: 13, margin: "0 0 24px", lineHeight: 1.5 }}>
              If an account exists for <strong>{email}</strong>, we have sent a password reset link.
            </p>
            <button onClick={() => { setTab("signin"); setResetSuccess(false); setErrors({}); }} style={{
              width: "100%", padding: "12px 0", background: "rgba(255,255,255,0.1)",
              border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 600,
              cursor: "pointer", transition: "all 0.2s"
            }}>Back to Sign In</button>
          </div>
        ) : (
          <>
            <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.4px" }}>
              {tab === "signin" ? "Welcome back" : tab === "forgot" ? "Reset password" : "Create account"}
            </h2>
            <p style={{ color: C.gray400, fontSize: 13, margin: "0 0 24px", lineHeight: 1.5 }}>
              {tab === "signin"
                ? "Sign in to manage your patients and appointments."
                : tab === "forgot"
                  ? "Enter your email address and we'll send you a link to reset your password."
                  : "Register to get started with OrthoRecords."}
            </p>

            {/* Form */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Username */}
              {tab !== "forgot" && (
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
              )}

              {/* Email (signup & forgot) */}
              {(tab === "signup" || tab === "forgot") && (
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type="email" value={email}
                    onChange={(e) => { setEmail(e.target.value); clearError("email"); }}
                    onKeyDown={(e) => e.key === "Enter" && (tab === "forgot" ? handleForgotSubmit() : handleSubmit())}
                    placeholder="you@example.com" style={fieldStyle("email")}
                    onFocus={(e) => !errors.email && (e.target.style.borderColor = C.blue)}
                    onBlur={(e) => !errors.email && (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                  />
                  {errors.email && <ErrMsg>{errors.email}</ErrMsg>}
                </div>
              )}

              {/* Role (signup only) */}
              {tab === "signup" && (
                <div>
                  <label style={labelStyle}>Role</label>
                  <div style={{ position: "relative" }}>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      style={{ ...fieldStyle("role"), appearance: "none" }}
                    >
                      <option value="CLINICIAN" style={{ color: "#000", background: "#fff" }}>Clinician</option>
                      <option value="STUDENT" style={{ color: "#000", background: "#fff" }}>Student</option>
                      <option value="PATIENT" style={{ color: "#000", background: "#fff" }}>Patient</option>
                    </select>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={C.gray400} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                      <path d="M7 10l5 5 5-5z" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Password */}
              {tab !== "forgot" && (
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
              )}

              {/* Confirm (signup only) */}
              {tab === "signup" && (
                <div>
                  <label style={labelStyle}>Confirm Password</label>
                  <div style={{ position: "relative" }}>
                    <input type={showCf ? "text" : "password"} value={confirm}
                      onChange={(e) => { setConfirm(e.target.value); clearError("confirm"); }}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                      placeholder="Re-enter your password" style={fieldStyle("confirm")}
                      onFocus={(e) => !errors.confirm && (e.target.style.borderColor = C.blue)}
                      onBlur={(e) => !errors.confirm && (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                    />
                    <button onClick={() => setShowCf(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.gray400, display: "flex", padding: 2 }}>
                      {showCf ? <EyeOff /> : <EyeOn />}
                    </button>
                  </div>
                  {errors.confirm && <ErrMsg>{errors.confirm}</ErrMsg>}
                </div>
              )}

              {tab === "signin" && (
                <div style={{ textAlign: "right", marginTop: -4 }}>
                  <span onClick={() => { setTab("forgot"); setErrors({}); }} style={{ color: C.blueLight, fontSize: 12, cursor: "pointer" }}>Forgot password?</span>
                </div>
              )}

              {tab === "forgot" && (
                <div style={{ textAlign: "left", marginTop: -4 }}>
                  <span onClick={() => { setTab("signin"); setErrors({}); }} style={{ color: C.blueLight, fontSize: 12, cursor: "pointer" }}>← Back to Sign In</span>
                </div>
              )}

              {/* Submit */}
              <button onClick={tab === "forgot" ? handleForgotSubmit : handleSubmit} disabled={loading} style={{
                width: "100%", padding: "13px 0",
                background: loading ? "rgba(33,150,243,0.5)" : `linear-gradient(135deg,${C.blue},#1565c0)`,
                border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4,
                boxShadow: loading ? "none" : "0 4px 20px rgba(33,150,243,0.35)",
              }}>
                {loading && <Spinner color="rgba(255,255,255,0.5)" />}
                {loading
                  ? (tab === "signin" ? "Signing in…" : tab === "forgot" ? "Sending link…" : "Creating account…")
                  : (tab === "signin" ? "Sign In" : tab === "forgot" ? "Send Reset Link" : "Create Account")}
              </button>
            </div>
          </>
        )}

        {tab !== "forgot" && (
          <>
            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
              <span style={{ color: C.gray500, fontSize: 12, whiteSpace: "nowrap" }}>or continue with</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
            </div>

            {/* Google error */}
            {errors.google && (
              <div style={{ marginBottom: 12 }}>
                <ErrMsg>{errors.google}</ErrMsg>
              </div>
            )}

            {/* Our styled Google button (triggers the hidden SDK button) */}
            <button onClick={handleGoogleClick} disabled={gLoading} style={{
              width: "100%", padding: "12px 20px",
              background: gLoading ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.93)",
              border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              cursor: gLoading ? "not-allowed" : "pointer", transition: "all 0.2s",
              fontSize: 14, fontWeight: 600, color: gLoading ? C.gray400 : C.gray900,
            }}>
              {gLoading ? <Spinner color={C.blue} /> : (
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              {gLoading ? "Opening Google…" : "Continue with Google"}
            </button>
          </>
        )}

        {/* Hidden div where Google SDK renders its real button */}
        <div ref={googleBtnRef} style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 1, height: 1, overflow: "hidden" }} />

        {/* Footer */}
        <div style={{ marginTop: 22, textAlign: "center" }}>
          <span style={{ color: C.gray500, fontSize: 12 }}>
            By continuing you agree to our{" "}
            <span onClick={() => setShowPolicyModal("terms")} style={{ color: C.blueLight, cursor: "pointer" }}>Terms</span>{" "}
            and{" "}
            <span onClick={() => setShowPolicyModal("privacy")} style={{ color: C.blueLight, cursor: "pointer" }}>Privacy Policy</span>
          </span>
        </div>
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
