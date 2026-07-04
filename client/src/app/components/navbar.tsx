// @ts-ignore
import logoSrc from "../../imports/final-logo_png_transparent.png";

import { useState, useEffect, forwardRef } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { LoginDialog } from "./auth/LoginDialog";
import { useAuth } from "../../contexts/AuthContext";
import { User } from "lucide-react";

function NavLink({ label, scrolled }: { label: string; scrolled: boolean }) {
  const [hovered, setHovered] = useState(false);

  const restColor = scrolled
    ? "rgba(30,26,20,0.65)"
    : "rgba(242,237,228,0.82)";
  const hoverColor = scrolled ? "#1e1a14" : "#ffffff";
  const underlineColor = scrolled ? "#b8943a" : "#c8a96e";

  return (
    <button
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
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.7);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
        padding: "0 clamp(1.5rem, 2.5vw, 2.5rem)",
        height: "72px",
        transition: "background 0.4s ease, backdrop-filter 0.4s ease, box-shadow 0.4s ease",
        background: scrolled
          ? "rgba(245,240,230,0.94)"
          : "transparent",
        backdropFilter: scrolled ? "blur(18px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(18px)" : "none",
        boxShadow: scrolled
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
          height: "52px",
          width: "auto",
          objectFit: "contain",
          userSelect: "none",
          cursor: "pointer",
          transition: "filter 0.4s ease",
          filter: scrolled
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
            : <NavLink key={item} label={item} scrolled={scrolled} />
        ))}
      </div>

      {/* Auth and CTA */}
      <div className="flex items-center gap-4">
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
          >
            BOOK A TRIP
          </button>
        )}
      </div>
    </nav>
  );
}
