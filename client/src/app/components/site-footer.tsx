// @ts-ignore — Vite resolves PNG imports as asset URLs
import logoSrc from "/images/final-logo_png_transparent.png";

import { useState } from "react";
import { motion } from "motion/react";
import { MapPin, Mail, Phone, Instagram, ArrowRight, Send, CheckCircle } from "lucide-react";
import { apiClient } from "../../lib/axios";
import { toast } from "sonner";
import { showErrorToast } from "../../lib/errors";

const TRIP_TYPES = [
  "Mountain Trek",
  "Cultural Festival",
  "Beach Escape",
  "Desert Expedition",
  "Jungle & Wildlife",
  "Heritage Walk",
  "Road Trip",
  "Backpacking Tour",
  "Photography Tour",
  "Bonfire Retreat",
  "Institute / College Trip",
  "Custom Trip",
];

const NAV_COLS = [
  {
    heading: "Explore",
    links: [
      { label: "Signature Destinations", url: "#" },
      { label: "Types of Trips", url: "#" },
      { label: "Featured Festivals", url: "#" },
      { label: "Hidden Gems", url: "#" }
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "Our Story", url: "#" },
      { label: "Our Journey", url: "#" },
      { label: "Travel Blog", url: "#" },
      { label: "Careers", url: "#" }
    ],
  },
  {
    heading: "Connect",
    links: [
      { label: "Instagram", url: "https://www.instagram.com/hangovertrails/" },
      { label: "WhatsApp Us", url: "https://wa.me/918415929069" },
      { label: "Email Us", url: "mailto:experience@hangovertrails.com" },
      { label: "Community", url: "#" }
    ],
  },
];

export function SiteFooter() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", trip: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formElement = e.currentTarget as HTMLFormElement;
    const values = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      message: form.message.trim(),
    };
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneDigits = values.phone.replace(/\D/g, "");
    const issue = values.name.length < 2
      ? { field: "name", message: "Enter your full name." }
      : !emailPattern.test(values.email)
        ? { field: "email", message: "Enter a valid email address." }
        : values.phone && phoneDigits.length < 7
          ? { field: "phone", message: "Enter a valid phone number or leave it blank." }
          : values.message.length < 10
            ? { field: "message", message: "Tell us a little more about the trip you want." }
            : null;
    if (issue) {
      toast.error("Please check the inquiry form", { description: issue.message });
      (formElement.elements.namedItem(issue.field) as HTMLElement | null)?.focus();
      return;
    }

    let mappedTripType: string | undefined;
    if (values.trip) {
      if (values.trip === "Jungle & Wildlife") mappedTripType = "JUNGLE_WILDLIFE";
      else if (values.trip === "Institute / College Trip") mappedTripType = "INSTITUTE_COLLEGE_TRIP";
      else if (values.trip === "Cultural Festival") mappedTripType = undefined; // Not in backend enum
      else mappedTripType = values.trip.toUpperCase().replace(/\s+/g, '_');
    }

    setIsSubmitting(true);
    try {
      await apiClient.post("/inquiries", {
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        tripType: mappedTripType,
        message: values.message,
      });
      setSubmitted(true);
      toast.success("Inquiry sent successfully", { description: "Our team will reach out within 24 hours." });
    } catch (error: unknown) {
      showErrorToast(error, "Failed to send inquiry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = (field: string) => ({
    width: "100%",
    background: focused === field ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)",
    border: `1px solid ${focused === field ? "rgba(184,148,58,0.65)" : "rgba(242,237,228,0.14)"}`,
    borderRadius: "6px",
    padding: "13px 16px",
    color: "#f2ede4",
    fontFamily: "'Poppins', sans-serif",
    fontSize: "0.82rem",
    fontWeight: 300,
    outline: "none",
    boxSizing: "border-box" as const,
    transition: "border-color 0.25s ease, background 0.25s ease",
    WebkitAppearance: "none" as const,
  });

  const labelStyle = {
    display: "block",
    color: "rgba(242,237,228,0.5)",
    fontSize: "0.62rem",
    fontWeight: 500,
    letterSpacing: "0.18em",
    textTransform: "uppercase" as const,
    marginBottom: "6px",
    fontFamily: "'Poppins', sans-serif",
  };

  return (
    <>
      {/* ═══════════════════════════════════════════════════
          CONTACT SECTION — full-bleed image + form
      ═══════════════════════════════════════════════════ */}
      <section id="contact" style={{ position: "relative", minHeight: "100vh", overflow: "hidden", fontFamily: "'Poppins', sans-serif" }}>

        {/* Background photo */}
        <img
          src="https://images.unsplash.com/photo-1533088339408-74fcf62b8e6a?w=1920&h=1080&fit=crop&auto=format&q=90"
          alt="Camping under stars"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%" }}
        />

        {/* Overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(11,11,11,0.72) 0%, rgba(11,11,11,0.55) 50%, rgba(11,11,11,0.68) 100%)" }} />

        {/* Decorative gold circle */}
        <div style={{ position: "absolute", top: "-180px", right: "-180px", width: "520px", height: "520px", borderRadius: "50%", border: "1px solid rgba(184,148,58,0.08)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "-100px", right: "-100px", width: "340px", height: "340px", borderRadius: "50%", border: "1px solid rgba(184,148,58,0.05)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 2, maxWidth: "1280px", margin: "0 auto", padding: "clamp(4rem,8vh,7rem) clamp(1.5rem,5vw,6rem)", display: "grid", gap: "clamp(3rem,6vw,8rem)", alignItems: "center" }}
          className="grid-cols-1 lg:grid-cols-2">

          {/* ── Left: headline + info ── */}
          <div>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55 }}
              style={{ color: "#b8943a", fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: "18px" }}
            >
              / Let's Plan Your Trip
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.65, delay: 0.08 }}
              style={{ color: "#f2ede4", fontSize: "clamp(2.2rem,5vw,4rem)", fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1.1, margin: "0 0 24px" }}
            >
              Your next great<br />
              story starts with<br />
              <em style={{ color: "#b8943a", fontStyle: "italic" }}>one message.</em>
            </motion.h2>

            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
              style={{ height: "1px", width: "60px", background: "#b8943a", marginBottom: "24px", transformOrigin: "left" }}
            />

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.28 }}
              style={{ color: "rgba(242,237,228,0.52)", fontSize: "0.88rem", fontWeight: 300, lineHeight: 1.85, marginBottom: "clamp(2rem,4vw,3rem)", maxWidth: "380px" }}
            >
              Tell us where you want to go, who you're traveling with, and when — we'll take care of the rest with the kind of attention only a small team can give.
            </motion.p>

            {/* Contact details */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.35 }}
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              {[
                { icon: Mail, text: "experience@hangovertrails.com", href: "mailto:experience@hangovertrails.com" },
                { icon: Phone, text: "+91 84159 29069", href: "tel:+918415929069" },
                { icon: MapPin, text: "Dawn Tours and Travels\nPapu-1, Naharlagun\nArunachal Pradesh- 791110", href: "https://maps.app.goo.gl/D1eC1BV9xyoP8iP56?g_st=aw" },
              ].map(({ icon: Icon, text, href }) => (
                <a
                  key={text}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  <div style={{
                    width: "32px", height: "32px", borderRadius: "50%",
                    background: "rgba(184,148,58,0.12)",
                    border: "1px solid rgba(184,148,58,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Icon size={13} color="#b8943a" strokeWidth={1.5} />
                  </div>
                  <span style={{ color: "rgba(242,237,228,0.68)", fontSize: "0.82rem", fontWeight: 300 }}>{text}</span>
                </a>
              ))}
            </motion.div>

            {/* Social */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.45 }}
              style={{ display: "flex", gap: "10px", marginTop: "clamp(1.5rem,3vw,2.5rem)" }}
            >
              {[
                { name: "Instagram", url: "https://www.instagram.com/hangovertrails/" },
                { name: "LinkedIn", url: "https://www.linkedin.com/company/hangover-trails/" },
                { name: "Facebook", url: "https://www.facebook.com/hangovertrails/" },
                { name: "WhatsApp", url: "https://wa.me/918415929069" }
              ].map((s) => (
                <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" style={{
                  padding: "7px 16px",
                  border: "1px solid rgba(242,237,228,0.14)",
                  borderRadius: "999px",
                  background: "rgba(242,237,228,0.05)",
                  color: "rgba(242,237,228,0.55)",
                  fontSize: "0.65rem",
                  fontFamily: "'Poppins', sans-serif",
                  letterSpacing: "0.1em",
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                  textDecoration: "none",
                  display: "inline-block"
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(184,148,58,0.45)"; e.currentTarget.style.color = "#b8943a"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(242,237,228,0.14)"; e.currentTarget.style.color = "rgba(242,237,228,0.55)"; }}
                >
                  {s.name}
                </a>
              ))}
            </motion.div>
          </div>

          {/* ── Right: contact form ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.15 }}
          >
            <div style={{
              background: "rgba(11,11,11,0.55)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(242,237,228,0.08)",
              borderRadius: "16px",
              padding: "clamp(24px,4vw,40px)",
            }}>
              {submitted ? (
                <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                  <CheckCircle size={48} color="#b8943a" strokeWidth={1.2} style={{ margin: "0 auto 20px" }} />
                  <h3 style={{ color: "#f2ede4", fontSize: "1.3rem", fontWeight: 400, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
                    We've received your message!
                  </h3>
                  <p style={{ color: "rgba(242,237,228,0.5)", fontSize: "0.84rem", fontWeight: 300, lineHeight: 1.75, margin: "0 0 24px" }}>
                    Our team will reach out within 24 hours to start planning your perfect trip.
                  </p>
                  <button
                    onClick={() => { setSubmitted(false); setForm({ name: "", email: "", phone: "", trip: "", message: "" }); }}
                    style={{ background: "none", border: "1px solid rgba(184,148,58,0.35)", borderRadius: "999px", padding: "8px 20px", color: "#b8943a", fontSize: "0.72rem", fontFamily: "'Poppins', sans-serif", letterSpacing: "0.1em", cursor: "pointer" }}
                  >
                    Send another
                  </button>
                </div>
              ) : (
                <form noValidate onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  <div>
                    <p style={{ color: "#f2ede4", fontSize: "1.05rem", fontWeight: 400, letterSpacing: "-0.01em", margin: "0 0 4px" }}>
                      Tell us about your dream trip
                    </p>
                    <p style={{ color: "rgba(242,237,228,0.35)", fontSize: "0.72rem", fontWeight: 300, margin: 0 }}>
                      We'll respond within 24 hours.
                    </p>
                  </div>

                  {/* Name + Email row */}
                  <div style={{ display: "grid", gap: "12px" }} className="grid-cols-1 sm:grid-cols-2">
                    <div>
                      <label style={labelStyle}>Full Name *</label>
                      <input
                        type="text"
                        name="name"
                        placeholder="Arjun Sharma"
                        value={form.name}
                        required
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        onFocus={() => setFocused("name")}
                        onBlur={() => setFocused(null)}
                        style={inputStyle("name")}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Email *</label>
                      <input
                        type="email"
                        name="email"
                        placeholder="arjun@email.com"
                        value={form.email}
                        required
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        onFocus={() => setFocused("email")}
                        onBlur={() => setFocused(null)}
                        style={inputStyle("email")}
                      />
                    </div>
                  </div>

                  {/* Phone + Trip Type row */}
                  <div style={{ display: "grid", gap: "12px" }} className="grid-cols-1 sm:grid-cols-2">
                    <div>
                      <label style={labelStyle}>Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        placeholder="+91 84159 29069"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        onFocus={() => setFocused("phone")}
                        onBlur={() => setFocused(null)}
                        style={inputStyle("phone")}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Trip Type</label>
                      <select
                        name="trip"
                        value={form.trip}
                        onChange={(e) => setForm({ ...form, trip: e.target.value })}
                        onFocus={() => setFocused("trip")}
                        onBlur={() => setFocused(null)}
                        style={{ ...inputStyle("trip"), cursor: "pointer" }}
                      >
                        <option value="" style={{ background: "#1a1612" }}>Select a type…</option>
                        {TRIP_TYPES.map((t) => (
                          <option key={t} value={t} style={{ background: "#1a1612" }}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label style={labelStyle}>Your Message *</label>
                    <textarea
                      placeholder="Tell us where you want to go, when, how many people, and anything else we should know…"
                      name="message"
                      value={form.message}
                      required
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      onFocus={() => setFocused("message")}
                      onBlur={() => setFocused(null)}
                      rows={4}
                      style={{ ...inputStyle("message"), resize: "none" as const, lineHeight: 1.65 }}
                    />
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      background: "#b8943a",
                      border: "none",
                      borderRadius: "6px",
                      padding: "14px 28px",
                      color: "#1a1612",
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      cursor: isSubmitting ? "wait" : "pointer",
                      opacity: isSubmitting ? 0.7 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      transition: "background 0.25s ease, transform 0.15s ease",
                      width: "100%",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#cfa84e")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#b8943a")}
                    onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
                    onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  >
                    {isSubmitting ? "Sending…" : "Plan My Trip"} <Send size={13} />
                  </button>

                  <p style={{ color: "rgba(242,237,228,0.25)", fontSize: "0.62rem", textAlign: "center", fontWeight: 300, letterSpacing: "0.06em", margin: 0 }}>
                    No spam. No package deals. Just real conversations.
                  </p>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FOOTER — navigation + brand + copyright
      ═══════════════════════════════════════════════════ */}
      <footer style={{ background: "#0f0d0b", fontFamily: "'Poppins', sans-serif", borderTop: "1px solid rgba(242,237,228,0.06)" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "clamp(3rem,6vw,5rem) clamp(1.5rem,5vw,6rem) 0" }}>

          {/* Top: brand + nav cols */}
          <div style={{ display: "grid", gap: "clamp(2rem,4vw,5rem)", marginBottom: "clamp(2.5rem,5vw,4rem)" }}
            className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">

            {/* Brand col */}
            <div className="sm:col-span-2 lg:col-span-2">
              <img
                src={logoSrc as string}
                alt="Hangover Trails"
                style={{ height: "32px", width: "auto", objectFit: "contain", filter: "brightness(10) sepia(0.1)", marginBottom: "12px", display: "block" }}
              />
              <p style={{ color: "rgba(242,237,228,0.38)", fontSize: "0.78rem", fontWeight: 300, lineHeight: 1.8, marginBottom: "24px", maxWidth: "240px" }}>
                Community-led travel for the curious, the bold, and the ones who believe the best stories happen off the beaten path.
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                {[
                  { Icon: Instagram, href: "https://www.instagram.com/hangovertrails/" },
                  { Icon: Mail, href: "mailto:experience@hangovertrails.com" },
                  { Icon: Phone, href: "tel:+918415929069" }
                ].map(({ Icon, href }, i) => (
                  <a key={i} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined} style={{
                    width: "34px", height: "34px",
                    border: "1px solid rgba(242,237,228,0.12)",
                    borderRadius: "50%",
                    background: "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                    transition: "border-color 0.25s ease, background 0.25s ease",
                    textDecoration: "none",
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(184,148,58,0.5)"; e.currentTarget.style.background = "rgba(184,148,58,0.08)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(242,237,228,0.12)"; e.currentTarget.style.background = "transparent"; }}
                  >
                    <Icon size={13} color="rgba(242,237,228,0.5)" strokeWidth={1.5} />
                  </a>
                ))}
              </div>
            </div>

            {/* Nav cols */}
            {NAV_COLS.map((col) => (
              <div key={col.heading}>
                <p style={{ color: "#b8943a", fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "18px" }}>
                  {col.heading}
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "11px" }}>
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a href={link.url} target={link.url.startsWith("http") ? "_blank" : undefined} rel={link.url.startsWith("http") ? "noopener noreferrer" : undefined} style={{
                        background: "none", border: "none", padding: 0,
                        color: "rgba(242,237,228,0.45)",
                        fontSize: "0.8rem", fontWeight: 300, fontFamily: "'Poppins', sans-serif",
                        cursor: "pointer", letterSpacing: "0.02em",
                        transition: "color 0.2s ease",
                        textAlign: "left",
                        textDecoration: "none",
                        display: "inline-block",
                      }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#f2ede4")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(242,237,228,0.45)")}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Gold divider */}
          <div style={{ height: "1px", background: "linear-gradient(to right, rgba(184,148,58,0.4), rgba(184,148,58,0.08), transparent)", marginBottom: "24px" }} />

          {/* Bottom bar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: "12px",
            paddingBottom: "clamp(1.5rem,3vw,2rem)",
          }}>
            <p style={{ color: "rgba(242,237,228,0.22)", fontSize: "0.68rem", fontWeight: 300, letterSpacing: "0.06em", margin: 0 }}>
              © 2025 Hangover Trails. All rights reserved.
            </p>
            <div style={{ display: "flex", gap: "20px" }}>
              {["Privacy Policy", "Terms of Service", "Refund Policy"].map((item) => (
                <button key={item} style={{
                  background: "none", border: "none", padding: 0,
                  color: "rgba(242,237,228,0.22)", fontSize: "0.68rem",
                  fontFamily: "'Poppins', sans-serif", letterSpacing: "0.06em",
                  cursor: "pointer", transition: "color 0.2s ease",
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(242,237,228,0.55)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(242,237,228,0.22)")}
                >
                  {item}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#b8943a" }} />
              <span style={{ color: "rgba(242,237,228,0.22)", fontSize: "0.65rem", letterSpacing: "0.1em" }}>
                Made with Love
              </span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
