// @ts-ignore
import logoSrc from "/images/final-logo_png_transparent.png";

import { useState, useEffect, forwardRef } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { LoginDialog } from "./auth/LoginDialog";
import { useAuth } from "../../contexts/AuthContext";
import { Menu, User, X } from "lucide-react";

function NavLink({ label, scrolled, onClick }: { label: string; scrolled: boolean; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);

  const restColor = scrolled
    ? "rgba(30,26,20,0.65)"
    : "rgba(242,237,228,0.82)";
  const hoverColor = scrolled ? "#1e1a14" : "#ffffff";
  const underlineColor = scrolled ? "#b8943a" : "#c8a96e";

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: "'Poppins', sans-serif",
        fontWeight: hovered ? 500 : 400,
        fontSize: "0.82rem",
        letterSpacing: "0.08em",
        color: hovered ? hoverColor : restColor,
        transition: "color 0.25s ease",
        position: "relative",
        paddingBottom: "5px",
        background: "none",
        border: "none",
        cursor: "pointer",
        outline: "none",
      }}
    >
      {label}
      <span style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        height: "1.5px",
        width: hovered ? "100%" : "0%",
        background: underlineColor,
        transition: "width 0.3s ease",
        display: "block",
        borderRadius: "2px",
      }} />
    </button>
  );
}

function PageNavLink({ label, to, scrolled }: { label: string; to: string; scrolled: boolean }) {
  const [hovered, setHovered] = useState(false);
  const restColor = scrolled ? "rgba(30,26,20,0.65)" : "rgba(242,237,228,0.82)";
  const hoverColor = scrolled ? "#1e1a14" : "#ffffff";
  const underlineColor = scrolled ? "#b8943a" : "#c8a96e";
  return (
    <Link to={to} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ fontFamily: "'Poppins', sans-serif", fontWeight: hovered ? 500 : 400, fontSize: "0.82rem", letterSpacing: "0.08em", color: hovered ? hoverColor : restColor, transition: "color 0.25s ease", position: "relative", paddingBottom: "5px", textDecoration: "none", outline: "none" }}>
      {label}
      <span style={{ position: "absolute", bottom: 0, left: 0, height: "1.5px", width: hovered ? "100%" : "0%", background: underlineColor, transition: "width 0.3s ease", display: "block", borderRadius: "2px" }} />
    </Link>
  );
}

function TripsNavLink({ scrolled }: { scrolled: boolean }) {
  const [hovered, setHovered] = useState(false);
  const restColor = scrolled ? "rgba(30,26,20,0.65)" : "rgba(242,237,228,0.82)";
  const hoverColor = scrolled ? "#1e1a14" : "#ffffff";
  const underlineColor = scrolled ? "#b8943a" : "#c8a96e";

  return (
    <Link
      to="/trips"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: "'Poppins', sans-serif",
        fontWeight: hovered ? 500 : 400,
        fontSize: "0.82rem",
        letterSpacing: "0.08em",
        color: hovered ? hoverColor : restColor,
        transition: "color 0.25s ease",
        position: "relative",
        paddingBottom: "5px",
        textDecoration: "none",
        outline: "none",
      }}
    >
      Trips
      <span style={{ position: "absolute", bottom: 0, left: 0, height: "1.5px", width: hovered ? "100%" : "0%", background: underlineColor, transition: "width 0.3s ease", display: "block", borderRadius: "2px" }} />
    </Link>
  );
}

const AuthButton = forwardRef<HTMLButtonElement, { label: string; onClick?: () => void; scrolled: boolean; className?: string }>(
  ({ label, onClick, scrolled, className, ...props }, ref) => {
    const [hovered, setHovered] = useState(false);
    const themeColor = scrolled ? "#b8943a" : "#c8a96e";
    
    return (
      <button
        ref={ref}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={className}
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 400,
          fontSize: "0.9rem",
          letterSpacing: "0.05em",
          padding: "6px 20px",
          cursor: "pointer",
          transition: "all 0.3s ease",
          background: hovered ? themeColor : "transparent",
          color: hovered ? (scrolled ? "#ffffff" : "#111") : themeColor,
          border: `1px solid ${themeColor}`,
          outline: "none",
        }}
        {...props}
      >
        {label}
      </button>
    );
  }
);

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.3);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const scrollToContact = () => {
    const contactEl = document.getElementById("contact");
    if (contactEl) {
      contactEl.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/");
      setTimeout(() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }), 300);
    }
    setMobileOpen(false);
  };

  const navItems = [
    { label: "Home", action: () => navigate("/") },
    { label: "Trips", action: () => navigate("/trips") },
    { label: "Festivals", action: () => navigate("/festivals") },
    { label: "Contact", action: scrollToContact },
    { label: "About", action: () => navigate("/about") },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 clamp(1rem, 2.5vw, 2.5rem)",
        minHeight: "clamp(56px, 8vw, 72px)",
        transition: "background 0.4s ease, backdrop-filter 0.4s ease, box-shadow 0.4s ease",
        background: scrolled || mobileOpen
          ? "rgba(245,240,230,0.94)"
          : "transparent",
        backdropFilter: scrolled || mobileOpen ? "blur(18px)" : "none",
        WebkitBackdropFilter: scrolled || mobileOpen ? "blur(18px)" : "none",
        width: "100vw",
        boxShadow: scrolled || mobileOpen
          ? "0 1px 0 rgba(0,0,0,0.07)"
          : "none",
      }}
    >
      {/* Logo — click goes home */}
      <img
        src={logoSrc as string}
        alt="Hangover Trails"
        onClick={() => navigate("/")}
        style={{
          height: "clamp(38px, 8vw, 52px)",
          width: "auto",
          maxWidth: "50vw",
          objectFit: "contain",
          userSelect: "none",
          cursor: "pointer",
          transition: "filter 0.4s ease",
          filter: scrolled || mobileOpen
            ? "none"
            : "brightness(10) sepia(0.12)",
        }}
      />

      {/* Nav links */}
      <div className="hidden md:flex items-center gap-10">
        {["Home", "Trips", "Festivals", "Contact", "About"].map((item) => (
          item === "Home"
            ? <PageNavLink key={item} label="Home" to="/" scrolled={scrolled} />
            : item === "Trips"
            ? <TripsNavLink key={item} scrolled={scrolled} />
            : item === "Festivals"
            ? <PageNavLink key={item} label="Festivals" to="/festivals" scrolled={scrolled} />
            : item === "About"
            ? <PageNavLink key={item} label="About" to="/about" scrolled={scrolled} />
            : item === "Contact"
            ? <NavLink key={item} label={item} scrolled={scrolled} onClick={() => {
                scrollToContact();
              }} />
            : <NavLink key={item} label={item} scrolled={scrolled} />
        ))}
      </div>

      {/* Auth and CTA */}
      <div className="hidden md:flex items-center gap-4">
        {isLoading ? (
          <AuthButton label="Loading..." scrolled={scrolled} />
        ) : user ? (
          <>
            {user.role === "ADMIN" && (
              <button
                onClick={() => navigate("/dashboard")}
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 500,
                  fontSize: "0.75rem",
                  letterSpacing: "0.08em",
                  padding: "6px 14px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  background: scrolled ? "rgba(120,18,22,0.08)" : "rgba(255,255,255,0.12)",
                  color: scrolled ? "#781216" : "#ffffff",
                  border: `1px solid ${scrolled ? "rgba(120,18,22,0.2)" : "rgba(255,255,255,0.25)"}`,
                  borderRadius: "4px",
                  outline: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = scrolled ? "rgba(120,18,22,0.15)" : "rgba(255,255,255,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = scrolled ? "rgba(120,18,22,0.08)" : "rgba(255,255,255,0.12)";
                }}
              >
                DASHBOARD
              </button>
            )}
            <button
              onClick={() => navigate("/profile")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: scrolled ? "rgba(30,26,20,0.05)" : "rgba(255,255,255,0.1)",
                color: scrolled ? "#1e1a14" : "#ffffff",
                border: `1px solid ${scrolled ? "rgba(30,26,20,0.1)" : "rgba(255,255,255,0.2)"}`,
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = scrolled ? "rgba(30,26,20,0.1)" : "rgba(255,255,255,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = scrolled ? "rgba(30,26,20,0.05)" : "rgba(255,255,255,0.1)";
              }}
              title="My Profile"
            >
              <User size={20} />
            </button>
          </>
        ) : (
          <LoginDialog>
            <AuthButton label="Sign In" scrolled={scrolled} />
          </LoginDialog>
        )}
        {!location.pathname.startsWith("/dashboard") && (
          <button
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 600,
              fontSize: "0.78rem",
              letterSpacing: "0.14em",
              padding: "10px 24px",
              cursor: "pointer",
              transition: "all 0.3s ease",
              background: scrolled ? "#781216" : "#c8a96e",
              color: "#ffffff",
              border: "none",
              activeTransform: "scale(0.95)",
            } as React.CSSProperties}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = scrolled ? "#9a1a1f" : "#dfc08a";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = scrolled ? "#781216" : "#c8a96e";
            }}
            onClick={() => navigate("/trips")}
          >
            BOOK A TRIP
          </button>
        )}
      </div>

      <button
        className="md:hidden flex items-center justify-center"
        onClick={() => setMobileOpen((open) => !open)}
        aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={mobileOpen}
        style={{
          width: "42px",
          height: "42px",
          flexShrink: 0,
          border: `1px solid ${scrolled || mobileOpen ? "rgba(30,26,20,0.14)" : "rgba(255,255,255,0.28)"}`,
          background: scrolled || mobileOpen ? "rgba(30,26,20,0.04)" : "rgba(255,255,255,0.12)",
          color: scrolled || mobileOpen ? "#1e1a14" : "#ffffff",
          cursor: "pointer",
        }}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {mobileOpen && (
        <div
          className="md:hidden"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "rgba(245,240,230,0.98)",
            borderTop: "1px solid rgba(30,26,20,0.08)",
            boxShadow: "0 18px 38px rgba(30,26,20,0.16)",
            padding: "14px 18px 18px",
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          <div style={{ display: "grid", gap: "4px" }}>
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                style={{
                  width: "100%",
                  minHeight: "38px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid rgba(30,26,20,0.07)",
                  color: "#1e1a14",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  padding: "0 2px",
                }}
              >
                {item.label}
                <span style={{ color: "#b8943a" }}>→</span>
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gap: "10px", marginTop: "16px" }}>
            {isLoading ? (
              <button disabled style={mobileActionStyle("outline")}>Loading...</button>
            ) : user ? (
              <>
                {user.role === "ADMIN" && (
                  <button onClick={() => navigate("/dashboard")} style={mobileActionStyle("outline")}>
                    Dashboard
                  </button>
                )}
                <button onClick={() => navigate("/profile")} style={mobileActionStyle("outline")}>
                  My Profile
                </button>
                <button onClick={logout} style={mobileActionStyle("outline")}>
                  Sign Out
                </button>
              </>
            ) : (
              <LoginDialog>
                <button style={mobileActionStyle("outline")}>Sign In</button>
              </LoginDialog>
            )}
            {!location.pathname.startsWith("/dashboard") && (
              <button onClick={() => navigate("/trips")} style={mobileActionStyle("solid")}>
                Book a Trip
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

function mobileActionStyle(variant: "solid" | "outline"): React.CSSProperties {
  const solid = variant === "solid";
  return {
    minHeight: "40px",
    width: "100%",
    border: solid ? "none" : "1px solid rgba(120,18,22,0.28)",
    background: solid ? "#781216" : "transparent",
    color: solid ? "#ffffff" : "#781216",
    fontFamily: "'Poppins', sans-serif",
    fontSize: "0.72rem",
    fontWeight: solid ? 600 : 500,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    cursor: "pointer",
  };
}
