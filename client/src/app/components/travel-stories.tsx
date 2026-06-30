import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { Search, X, ArrowRight, Tag } from "lucide-react";
import { ProgressiveBlur } from "./progressive-blur";

const CATEGORIES = [
  "All",
  "First Time in Arunachal",
  "Packing Guides",
  "Hidden Gems",
  "Local Food",
  "Cultural Etiquette",
  "Road Trips",
  "Trekking Guides",
  "Festival Guides",
];

const POSTS = [
  {
    id: 1,
    title: "First Time in Arunachal: What Nobody Tells You",
    excerpt: "Permits, protocols, and the pure magic of India's last frontier — a first-timer's honest guide to the land of the rising sun.",
    category: "First Time in Arunachal",
    tags: ["Northeast India", "Permits", "Solo Travel"],
    readTime: "8 min read",
    date: "Jun 12, 2025",
    featured: true,
    image: "https://images.unsplash.com/photo-1626948688703-0136bc0a90da?w=900&h=600&fit=crop&auto=format&q=90",
  },
  {
    id: 2,
    title: "The Ultimate 5-Day Packing List for Himalayan Treks",
    excerpt: "Layers, boots, altitude sickness pills — everything that earns its weight in your pack at 4,000 metres.",
    category: "Packing Guides",
    tags: ["Trekking", "Gear", "Mountains"],
    readTime: "6 min read",
    date: "May 28, 2025",
    featured: false,
    image: "https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=700&h=500&fit=crop&auto=format&q=90",
  },
  {
    id: 3,
    title: "7 Hidden Gems Near Hampi You've Never Heard Of",
    excerpt: "Beyond the boulder landscape and the Virupaksha Temple — the forgotten corners that most tourists walk right past.",
    category: "Hidden Gems",
    tags: ["Karnataka", "Heritage", "Offbeat"],
    readTime: "5 min read",
    date: "May 15, 2025",
    featured: false,
    image: "https://images.unsplash.com/photo-1621246935353-ff54e60ab837?w=700&h=500&fit=crop&auto=format&q=90",
  },
  {
    id: 4,
    title: "Eating Through Nagaland: A Pork-Lover's Paradise",
    excerpt: "Smoked meats, fermented bamboo shoots, and a food culture so distinct it deserves its own passport stamp.",
    category: "Local Food",
    tags: ["Nagaland", "Food", "Northeast India"],
    readTime: "7 min read",
    date: "Apr 30, 2025",
    featured: false,
    image: "https://images.unsplash.com/photo-1728364283053-b1e2abe71611?w=700&h=500&fit=crop&auto=format&q=90",
  },
  {
    id: 5,
    title: "Festival Etiquette: How to Attend Indian Festivals Respectfully",
    excerpt: "What to wear, when to stay silent, and how to participate without being the tourist everyone remembers for the wrong reason.",
    category: "Cultural Etiquette",
    tags: ["Culture", "Festivals", "Tips"],
    readTime: "9 min read",
    date: "Apr 10, 2025",
    featured: false,
    image: "https://images.unsplash.com/photo-1777222219334-acf1885f245c?w=700&h=500&fit=crop&auto=format&q=90",
  },
  {
    id: 6,
    title: "Manali–Leh Highway: Everything You Need to Know in 2025",
    excerpt: "Road conditions, fuel stops, altitude checkpoints, and why you should take the Nubra Valley detour without question.",
    category: "Road Trips",
    tags: ["Ladakh", "Road Trip", "Bike"],
    readTime: "11 min read",
    date: "Mar 22, 2025",
    featured: false,
    image: "https://images.unsplash.com/photo-1767947774950-d33a9c59ccad?w=700&h=500&fit=crop&auto=format&q=90",
  },
  {
    id: 7,
    title: "Kedarkantha Trek: A Beginner's Complete Guide",
    excerpt: "The snow-covered summit, the oak forests, and why this Uttarakhand classic is the perfect first Himalayan winter trek.",
    category: "Trekking Guides",
    tags: ["Uttarakhand", "Winter Trek", "Beginners"],
    readTime: "10 min read",
    date: "Feb 18, 2025",
    featured: false,
    image: "https://images.unsplash.com/photo-1768449414649-f70b2b7fac0a?w=700&h=500&fit=crop&auto=format&q=90",
  },
  {
    id: 8,
    title: "Ziro Music Festival 2025: Your Complete Attendee Guide",
    excerpt: "Camping spots, set times, what to pack, and how to get there — everything for your first Ziro experience.",
    category: "Festival Guides",
    tags: ["Ziro", "Music", "Arunachal"],
    readTime: "8 min read",
    date: "Jan 5, 2025",
    featured: false,
    image: "https://images.unsplash.com/photo-1508519829430-40f7d3d161b4?w=700&h=500&fit=crop&auto=format&q=90",
  },
];

const ALL_TAGS = Array.from(new Set(POSTS.flatMap((p) => p.tags)));

/* ── Blog card ──────────────────────────────────────────────────── */
function BlogCard({ post, large = false }: { post: typeof POSTS[0]; large?: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        borderRadius: "12px",
        overflow: "hidden",
        cursor: "pointer",
        aspectRatio: large ? "16/9" : "4/3",
        background: "#1e1a14",
        flexShrink: 0,
      }}
    >
      {/* Image — fills card, slight scale on hover */}
      <img
        src={post.image}
        alt={post.title}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          transition: "transform 0.65s ease",
          transform: hovered ? "scale(1.06)" : "scale(1)",
          display: "block",
        }}
      />

      {/* Permanent dark gradient so text is readable without hover */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(to top, rgba(11,11,11,0.72) 0%, rgba(11,11,11,0.15) 45%, transparent 100%)",
        zIndex: 1,
        pointerEvents: "none",
      }} />

      {/* Category pill — top left, always visible */}
      <div style={{
        position: "absolute",
        top: "14px",
        left: "14px",
        zIndex: 10,
        background: "rgba(184,148,58,0.88)",
        backdropFilter: "blur(6px)",
        color: "#1e1a14",
        borderRadius: "999px",
        padding: "3px 11px",
        fontSize: "0.6rem",
        fontWeight: 600,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        fontFamily: "'Poppins', sans-serif",
      }}>
        {post.category}
      </div>

      {/* ProgressiveBlur — frosted glass on bottom, fades in on hover */}
      <ProgressiveBlur
        direction="bottom"
        blurLayers={8}
        blurIntensity={0.6}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "75%",
          zIndex: 2,
        }}
        animate={hovered ? "visible" : "hidden"}
        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      />

      {/* Text — always visible, blur appears behind it on hover */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 3,
          padding: large ? "0 28px 28px" : "0 18px 20px",
          pointerEvents: "none",
        }}
      >
        <p style={{
          color: "#f2ede4",
          fontSize: large ? "clamp(1.1rem, 2vw, 1.4rem)" : "clamp(0.92rem, 1.5vw, 1.05rem)",
          fontWeight: 500,
          letterSpacing: "-0.01em",
          lineHeight: 1.3,
          margin: "0 0 4px",
          fontFamily: "'Poppins', sans-serif",
        }}>
          {post.title}
        </p>
        <p style={{
          color: "rgba(220,215,205,0.75)",
          fontSize: "0.78rem",
          fontWeight: 300,
          letterSpacing: "0.01em",
          margin: 0,
          fontFamily: "'Poppins', sans-serif",
        }}>
          {post.readTime} · {post.date}
        </p>
      </div>
    </motion.article>
  );
}

/* ── Main section ───────────────────────────────────────────────── */
export function TravelStories() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return POSTS.filter((p) => {
      const matchCat = activeCategory === "All" || p.category === activeCategory;
      const matchTag = !activeTag || p.tags.includes(activeTag);
      const q = search.toLowerCase();
      const matchSearch = !q || p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q));
      return matchCat && matchTag && matchSearch;
    });
  }, [search, activeCategory, activeTag]);

  const featured = filtered.find((p) => p.featured) ?? filtered[0];
  const rest = filtered.filter((p) => p.id !== featured?.id);

  return (
    <section style={{
      background: "#f5f0e6",
      borderTop: "1px solid rgba(0,0,0,0.06)",
      fontFamily: "'Poppins', sans-serif",
      padding: "clamp(3.5rem,7vw,6rem) clamp(1.5rem,5vw,6rem)",
    }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "clamp(2rem,4vw,3rem)" }}>
          <div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              style={{ color: "#b8943a", fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: "12px" }}
            >
              / Travel Stories
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.08 }}
              style={{ color: "#1e1a14", fontSize: "clamp(2rem,4vw,3.2rem)", fontWeight: 300, letterSpacing: "-0.025em", lineHeight: 1.15, margin: 0 }}
            >
              Read before you{" "}
              <em style={{ color: "#b8943a", fontStyle: "italic" }}>wander.</em>
            </motion.h2>
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{ color: "rgba(30,26,20,0.5)", fontSize: "0.8rem", fontWeight: 300, lineHeight: 1.85, maxWidth: "260px", margin: 0 }}
          >
            Guides, stories, and honest advice from the trails we've walked.
          </motion.p>
        </div>

        {/* ── Search bar ── */}
        <div style={{ position: "relative", maxWidth: "440px", marginBottom: "clamp(1.5rem,3vw,2rem)" }}>
          <Search size={15} color="rgba(30,26,20,0.35)" style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Search stories, destinations, tips…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 40px 12px 44px",
              background: "#ffffff",
              border: "1px solid rgba(30,26,20,0.1)",
              borderRadius: "999px",
              fontSize: "0.82rem",
              fontWeight: 300,
              color: "#1e1a14",
              fontFamily: "'Poppins', sans-serif",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: "2px", display: "flex" }}>
              <X size={14} color="rgba(30,26,20,0.4)" />
            </button>
          )}
        </div>

        {/* ── Category pills ── */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "clamp(1.5rem,3vw,2.5rem)" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setActiveTag(null); }}
              style={{
                padding: "7px 16px",
                borderRadius: "999px",
                border: activeCategory === cat ? "1.5px solid #b8943a" : "1.5px solid rgba(30,26,20,0.12)",
                background: activeCategory === cat ? "#b8943a" : "transparent",
                color: activeCategory === cat ? "#1e1a14" : "rgba(30,26,20,0.6)",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.72rem",
                fontWeight: activeCategory === cat ? 600 : 400,
                letterSpacing: "0.06em",
                cursor: "pointer",
                transition: "all 0.25s ease",
                whiteSpace: "nowrap",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Tag cloud ── */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "clamp(2rem,4vw,3rem)", alignItems: "center" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "rgba(30,26,20,0.38)", fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", marginRight: "4px" }}>
            <Tag size={10} /> Tags
          </span>
          {ALL_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              style={{
                padding: "3px 10px",
                borderRadius: "999px",
                border: activeTag === tag ? "1px solid #b8943a" : "1px solid rgba(30,26,20,0.1)",
                background: activeTag === tag ? "rgba(184,148,58,0.1)" : "transparent",
                color: activeTag === tag ? "#b8943a" : "rgba(30,26,20,0.5)",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.65rem",
                fontWeight: 400,
                letterSpacing: "0.08em",
                cursor: "pointer",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
              }}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* ── Grid ── */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 0", color: "rgba(30,26,20,0.35)", fontSize: "0.9rem", fontFamily: "'Poppins', sans-serif" }}>
            No stories found. Try a different search or category.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Featured post — full width */}
            {featured && <BlogCard post={featured} large />}

            {/* Rest — 3-col grid */}
            {rest.length > 0 && (
              <div
                style={{ display: "grid", gap: "16px" }}
                className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              >
                {rest.map((post) => (
                  <BlogCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Load more ── */}
        {filtered.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            style={{ textAlign: "center", marginTop: "clamp(2rem,4vw,3.5rem)" }}
          >
            <button style={{
              padding: "13px 32px",
              border: "1.5px solid rgba(30,26,20,0.15)",
              borderRadius: "999px",
              background: "transparent",
              color: "rgba(30,26,20,0.65)",
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.78rem",
              fontWeight: 400,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "all 0.25s ease",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#b8943a"; e.currentTarget.style.color = "#b8943a"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(30,26,20,0.15)"; e.currentTarget.style.color = "rgba(30,26,20,0.65)"; }}
            >
              Read More Stories <ArrowRight size={13} />
            </button>
          </motion.div>
        )}
      </div>
    </section>
  );
}
