import { useState, useRef, useEffect } from "react";
import { C, STATUS_COLORS } from "./constants.js";
import { getAllPatients } from "./api.js";

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ label }) {
  const s = STATUS_COLORS[label] || { bg: C.gray100, color: C.gray700 };
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        borderRadius: 20,
        padding: "3px 12px",
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

// ─── Reveal Wrapper ───────────────────────────────────────────────────────────
export function Reveal({ children, style = {} }) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${isVisible ? "visible" : ""}`} style={style}>
      {children}
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ initials, size = 36 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${C.blue}, ${C.teal})`,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.33,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, iconColor, iconPath }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        padding: "20px 24px",
        border: `1px solid ${C.gray200}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flex: 1,
        minWidth: 0,
      }}
      className="card-hover"
    >
      <div>
        <div
          style={{
            fontSize: 11,
            color: C.gray500,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.6,
            marginBottom: 6,
          }}
        >
          {label}
        </div>
        <div
          style={{ fontSize: 32, fontWeight: 700, color: C.gray900, lineHeight: 1 }}
        >
          {value}
        </div>
      </div>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: iconColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
          {iconPath}
        </svg>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const NAV = [
  {
    id: "dashboard",
    label: "Dashboard",
    d: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  },
  {
    id: "patients",
    label: "Patients",
    d: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  },
  {
    id: "appointments",
    label: "Appointments",
    d: "M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z",
  },
  {
    id: "reports",
    label: "Reports",
    d: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z",
  },
  {
    id: "settings",
    label: "Settings",
    d: "M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z",
  },
];


export function Sidebar({ active, setPage, user }) {
  const [collapsed, setCollapsed] = useState(false);

  let navItems = [...NAV];
  if (user?.role === "ADMIN") {
    navItems = [
      {
        id: "users",
        label: "Users",
        d: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
      },
      ...NAV.filter(n => n.id === "settings")
    ];
  } else if (user?.role === "STUDENT") {
    navItems = NAV.filter(n => n.id !== "appointments" && n.id !== "reports");
  }

  return (
    <div
      style={{
        width: collapsed ? 72 : 210,
        minHeight: "100vh",
        background: C.sidebar,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        borderRight: "1px solid rgba(255,255,255,0.05)",
        transition: "width 0.3s ease",
      }}
    >
      {/* Brand */}
      <div
        style={{
          padding: collapsed ? "20px 18px 16px" : "20px 16px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 10,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `linear-gradient(135deg,${C.blue},${C.teal})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
          </svg>
        </div>
        {!collapsed && (
          <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
            <div
              style={{
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                lineHeight: 1.2,
              }}
            >
              OrthoRecords
            </div>
            <div style={{ color: C.gray500, fontSize: 10 }}>Case Management</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 8px" }}>
        {navItems.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              title={collapsed ? item.label : ""}
              onClick={() => setPage(item.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                gap: 10,
                padding: collapsed ? "12px 0" : "10px 12px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                background: isActive ? "rgba(33,150,243,0.15)" : "transparent",
                color: isActive ? C.blue : C.gray400,
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                marginBottom: 4,
                transition: "all 0.15s",
                textAlign: "left",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{ flexShrink: 0 }}
              >
                <path d={item.d} />
              </svg>
              {!collapsed && <span style={{ whiteSpace: "nowrap", overflow: "hidden" }}>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div style={{ padding: "12px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px 0",
            background: "transparent",
            border: "none",
            color: C.gray400,
            cursor: "pointer",
            borderRadius: 8,
            transition: "all 0.2s"
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}


// ─── TopBar ───────────────────────────────────────────────────────────────────
export function TopBar({ user = null, setPage, setSelectedPatient, onLogout, active }) {
  const displayName = user?.name || "User";
  const initials = user?.initials || displayName[0]?.toUpperCase() || "U";
  const picture = user?.picture || "";

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const [notifications, setNotifications] = useState([]);



  const unreadCount = notifications.filter(n => !n.read).length;
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <div
      style={{
        height: 56,
        background: "#fff",
        borderBottom: `1px solid ${C.gray200}`,
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        gap: 16,
        flexShrink: 0,
      }}
    >
      {/* Removed Search */}
      <div style={{ flex: 1 }} />

      {/* Bell Notification */}
      <div style={{ position: "relative", marginLeft: "auto" }} ref={notifRef}>
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 4 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={C.gray500}>
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
          </svg>
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: 0,
                right: 2,
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: C.red,
                border: "2px solid #fff",
                fontSize: 8,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>

        {/* Notification Popup Panel */}
        {showNotifications && (
          <div style={{
            position: "absolute",
            top: 40,
            right: 0,
            width: 320,
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
            border: `1px solid ${C.gray200}`,
            zIndex: 100,
            overflow: "hidden"
          }}>
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.gray100}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: C.gray50 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: C.gray900 }}>Notifications</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{ background: "none", border: "none", color: C.blue, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Mark all as read</button>
              )}
            </div>
            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              {notifications.length > 0 ? notifications.map(n => (
                <div key={n.id} style={{
                  padding: "12px 16px",
                  borderBottom: `1px solid ${C.gray100}`,
                  background: n.read ? "#fff" : "rgba(33,150,243,0.04)",
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start"
                }}>
                  {!n.read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.blue, marginTop: 6, flexShrink: 0 }} />}
                  <div>
                    <div style={{ fontSize: 13, color: C.gray800, fontWeight: n.read ? 400 : 600, marginBottom: 4 }}>{n.text}</div>
                    <div style={{ fontSize: 11, color: C.gray400 }}>{n.time}</div>
                  </div>
                </div>
              )) : (
                <div style={{ padding: 24, textAlign: "center", color: C.gray400, fontSize: 13 }}>No notifications</div>
              )}
            </div>
            <div style={{ padding: "10px", textAlign: "center", borderTop: `1px solid ${C.gray100}` }}>
              <button style={{ background: "none", border: "none", color: C.blue, fontSize: 13, cursor: "pointer" }}>View all</button>
            </div>
          </div>
        )}
      </div>

      {/* User avatar + name */}
      <div style={{ position: "relative" }} ref={profileRef}>
        <div
          onClick={() => setShowProfile(!showProfile)}
          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 8px", borderRadius: 8, transition: "background 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.background = C.gray50}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          {picture ? (
            <img
              src={picture}
              alt={displayName}
              referrerPolicy="no-referrer"
              style={{
                width: 32, height: 32, borderRadius: "50%",
                objectFit: "cover", border: `2px solid ${C.blue}`,
              }}
            />
          ) : (
            <div
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.blue}, ${C.teal})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 13, fontWeight: 700,
              }}
            >
              {initials}
            </div>
          )}
          <div style={{ fontSize: 12 }}>
            <div style={{
              fontWeight: 600, color: C.gray700, lineHeight: 1.2,
              maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {displayName}
            </div>
            <div style={{ color: C.gray400 }}>
              {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase() : "User"}
            </div>
          </div>
        </div>

        {/* Profile Popup */}
        {showProfile && (
          <div style={{
            position: "absolute",
            top: 50,
            right: 0,
            width: 240,
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
            border: `1px solid ${C.gray200}`,
            zIndex: 100,
            overflow: "hidden"
          }}>
            <div style={{ padding: "16px", borderBottom: `1px solid ${C.gray100}`, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, ${C.blue}, ${C.teal})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>
                {initials}
              </div>
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.gray900, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{displayName}</div>
                <div style={{ color: C.gray500, fontSize: 12, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{user?.email || "No email"}</div>
              </div>
            </div>
            <div style={{ padding: 8 }}>
              <button
                onClick={() => { setShowProfile(false); setPage('settings'); }}
                style={{ width: "100%", padding: "10px 12px", background: "none", border: "none", textAlign: "left", fontSize: 13, color: C.gray700, cursor: "pointer", borderRadius: 6, transition: "background 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.background = C.gray50}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                Account Settings
              </button>
              <button
                onClick={() => {
                  setShowProfile(false);
                  if (onLogout) onLogout();
                }}
                style={{ width: "100%", padding: "10px 12px", background: "none", border: "none", textAlign: "left", fontSize: 13, color: C.red, cursor: "pointer", borderRadius: 6, transition: "background 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.background = C.gray50}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Global Overlay (Toasts & Dialogs) ─────────────────────────────────────────
export function GlobalOverlay() {
  const [toast, setToast] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [promptState, setPromptState] = useState(null);
  const [promptVal, setPromptVal] = useState("");

  useEffect(() => {
    const handleToast = (e) => {
      setToast(e.detail);
      setTimeout(() => setToast(null), 3000);
    };
    const handleConfirm = (e) => setConfirmState(e.detail);
    const handlePrompt = (e) => {
      setPromptState(e.detail);
      setPromptVal(e.detail.defaultValue || "");
    };

    window.addEventListener("toast", handleToast);
    window.addEventListener("confirmDialog", handleConfirm);
    window.addEventListener("promptDialog", handlePrompt);

    return () => {
      window.removeEventListener("toast", handleToast);
      window.removeEventListener("confirmDialog", handleConfirm);
      window.removeEventListener("promptDialog", handlePrompt);
    };
  }, []);

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 99999,
          padding: "12px 20px", borderRadius: 12,
          background: toast.type === "error" ? C.red : toast.type === "info" ? C.blue : C.green,
          color: "#fff", fontSize: 14, fontWeight: 600,
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          display: "flex", alignItems: "center", gap: 8,
          animation: "slideIn 0.3s ease"
        }}>
          {toast.type === "error" ? "✕" : toast.type === "info" ? "ℹ" : "✓"} {toast.message}
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmState && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99998,
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "#fff", padding: 24, borderRadius: 16, width: "100%", maxWidth: 400,
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)", animation: "slideUp 0.3s ease"
          }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 18, color: C.gray900 }}>{confirmState.title}</h3>
            {confirmState.message && <p style={{ margin: "0 0 24px", color: C.gray500, fontSize: 14, lineHeight: 1.5 }}>{confirmState.message}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => { confirmState.onCancel(); setConfirmState(null); }} style={{
                padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.gray200}`, background: "#fff", color: C.gray700, fontWeight: 600, cursor: "pointer"
              }}>Cancel</button>
              <button onClick={() => { confirmState.onConfirm(); setConfirmState(null); }} style={{
                padding: "8px 16px", borderRadius: 8, border: "none", background: C.blue, color: "#fff", fontWeight: 600, cursor: "pointer"
              }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Dialog */}
      {promptState && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99998,
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "#fff", padding: 24, borderRadius: 16, width: "100%", maxWidth: 400,
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)", animation: "slideUp 0.3s ease"
          }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18, color: C.gray900 }}>{promptState.title}</h3>
            <input
              autoFocus
              value={promptVal}
              onChange={e => setPromptVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { promptState.onSubmit(promptVal); setPromptState(null); } }}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.blue}40`,
                fontSize: 14, fontFamily: "inherit", color: C.gray900, outline: "none", boxSizing: "border-box",
                background: `${C.blue}06`, marginBottom: 24
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => { promptState.onCancel(); setPromptState(null); }} style={{
                padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.gray200}`, background: "#fff", color: C.gray700, fontWeight: 600, cursor: "pointer"
              }}>Cancel</button>
              <button onClick={() => { promptState.onSubmit(promptVal); setPromptState(null); }} style={{
                padding: "8px 16px", borderRadius: 8, border: "none", background: C.blue, color: "#fff", fontWeight: 600, cursor: "pointer"
              }}>Submit</button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </>
  );
}

// ─── Layout wrapper ─────────────────────────────────────────────────────
export function AppLayout({ active, setPage, setSelectedPatient, onLogout, user, children }) {
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      <GlobalOverlay />
      <Sidebar active={active} setPage={setPage} user={user} />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          background: C.gray50,
        }}
      >
        <TopBar user={user} setPage={setPage} setSelectedPatient={setSelectedPatient} onLogout={onLogout} active={active} />
        <div style={{ flex: 1, overflowY: "auto" }} className="page-transition">{children}</div>
      </div>
    </div>
  );
}
