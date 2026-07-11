
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { MapPin, Calendar, ArrowRight } from "lucide-react";
import { fetchFeaturedFestivals, type ApiFestival } from "../../lib/festivalApi";
import { mediaImageUrl, mediaVideoUrl } from "../../lib/media";
import {
  ContainerStagger,
  ContainerAnimated,
} from "./hero-video-primitives";
import {
  motion,
  useScroll,
  useMotionTemplate,
  useMotionValue,
  useTransform,
  MotionValue,
} from "motion/react";

// Brand crimson — client-specified
const CRIMSON = "#781216";

// ── Window-scroll-based progress hook ────────────────────────────────────────
function useElementScrollProgress(
  ref: React.RefObject<HTMLDivElement | null>,
): MotionValue<number> {
  const { scrollY } = useScroll();
  const progress = useMotionValue(0);

  useEffect(() => {
    const update = () => {
      const el = ref.current;
      if (!el) return;
      const currentScroll = scrollY.get();
      const docTop =
        el.getBoundingClientRect().top + currentScroll;
      const height = el.offsetHeight;
      const vh = window.innerHeight;
      const raw =
        (currentScroll - docTop) / Math.max(1, height - vh);
      progress.set(Math.max(0, Math.min(1, raw)));
    };
    const unsub = scrollY.on("change", update);
    window.addEventListener("resize", update);
    const t = setTimeout(update, 50);
    return () => {
      unsub();
      window.removeEventListener("resize", update);
      clearTimeout(t);
    };
  }, [scrollY, progress, ref]);

  return progress;
}

function formatFestivalDate(festival: ApiFestival) {
  const slot = festival.slots?.[0];
  if (!slot?.startDate) return festival.bestTimeToVisit || "Dates to be announced";
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(new Date(slot.startDate));
}

// ── Main export ───────────────────────────────────────────────────────────────

export function FestivalVideo() {
  const navigate = useNavigate();
  const [festivals, setFestivals] = useState<ApiFestival[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchFeaturedFestivals()
      .then((data) => {
        if (!cancelled) setFestivals(data.filter((festival) => festival.videoUrl || festival.bannerImages?.length > 0));
      })
      .catch(() => {
        if (!cancelled) setFestivals([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isLoading && festivals.length === 0) return null;

  const videos = festivals.map((festival, index) => {
    const step = 1 / Math.max(festivals.length, 1);
    return {
      id: festival.id,
      videoUrl: festival.videoUrl,
      imageUrl: festival.bannerImages?.[0] || "",
      label: festival.title,
      location: festival.location,
      date: formatFestivalDate(festival),
      quote: festival.overview,
      range: [Math.max(0, index * step - 0.08), Math.min(1, (index + 1) * step + 0.08)] as [number, number],
      zIndex: index + 1,
    };
  });
  return (
    <div
      style={{
        background: CRIMSON,
        fontFamily: "'Poppins', sans-serif",
        borderTop: "1px solid rgba(0,0,0,0.2)",
        position: "relative",
      }}
    >
      {/* Text header — crimson background */}
      <section
        style={{
          padding:
            "clamp(3.5rem,7vw,6rem) clamp(1.5rem,5vw,6rem) clamp(2.5rem,5vw,4rem)",
          textAlign: "center",
          position: "relative",
        }}
      >
        <ContainerStagger>
          <ContainerAnimated animation="top">
            <p
              style={{
                color: "#f2c97a",
                fontSize: "0.7rem",
                fontWeight: 500,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                marginBottom: "20px",
              }}
            >
              / Featured Festivals
            </p>
          </ContainerAnimated>

          <ContainerAnimated animation="top">
            <h2
              style={{
                color: "#f9f1e8",
                fontSize: "clamp(2.4rem,6vw,5rem)",
                fontWeight: 300,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                margin: "0 auto 18px",
                maxWidth: "820px",
              }}
            >
              Feel the pulse.{" "}
              <em
                style={{
                  color: "#f2c97a",
                  fontStyle: "italic",
                }}
              >
                Live the moment.
              </em>
            </h2>
          </ContainerAnimated>

          <ContainerAnimated animation="blur">
            <p
              style={{
                color: "rgba(249,241,232,0.65)",
                fontSize: "clamp(0.88rem,1.5vw,1.05rem)",
                fontWeight: 300,
                lineHeight: 1.85,
                maxWidth: "560px",
                margin: "0 auto 40px",
              }}
            >
              We take you where festivals are born — not tourist
              events, but raw, real, unforgettable celebrations
              rooted in culture and community.
            </p>
          </ContainerAnimated>

          <ContainerAnimated animation="blur">
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: "16px",
                marginBottom: "44px",
                maxWidth: "960px",
                margin: "0 auto 44px",
              }}
            >
              {festivals.map((festival) => (
                <FestivalChip key={festival.id} festival={{ name: festival.title, place: festival.location, date: formatFestivalDate(festival), tag: festival.bestTimeToVisit || "Featured Festival" }} />
              ))}
            </div>
          </ContainerAnimated>

          <ContainerAnimated animation="bottom">
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "14px",
                flexWrap: "wrap",
              }}
            >
              <GoldButton onClick={() => navigate("/festivals")}>
                VIEW ALL FESTIVALS <ArrowRight size={13} />
              </GoldButton>
              <OutlineButton onClick={() => navigate("/festivals")}>
                BOOK A FESTIVAL TRIP
              </OutlineButton>
            </div>
          </ContainerAnimated>
        </ContainerStagger>
      </section>

      {/* Stacked scroll videos */}
      {isLoading ? <div style={{ height: "min(160vh, 900px)", background: "#1a1612" }} /> : <StackedVideos videos={videos} />}
    </div>
  );
}

// ── Stacked Videos ────────────────────────────────────────────────────────────

function StackedVideos({ videos }: { videos: VideoMeta[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollYProgress =
    useElementScrollProgress(containerRef);

  return (
    <div
      ref={containerRef}
      style={{
        height: "min(300vh, 2100px)",
        background: "#1a1612",
        position: "relative",
      }}
    >
      {/* Gradient bridge: crimson fades into dark so the seam is invisible */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "120px",
          background: `linear-gradient(to bottom, ${CRIMSON}, #1a1612)`,
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      {videos.map((v) => (
        <VideoLayer
          key={v.label}
          video={v}
          scrollYProgress={scrollYProgress}
        />
      ))}
    </div>
  );
}

interface VideoMeta {
  id: string;
  videoUrl: string | null;
  imageUrl: string;
  label: string;
  location: string;
  date: string;
  quote: string;
  range: [number, number];
  zIndex: number;
}

function VideoLayer({
  video,
  scrollYProgress,
}: {
  video: VideoMeta;
  scrollYProgress: MotionValue<number>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const node = videoRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShouldLoad(entry.isIntersecting),
      { rootMargin: "150px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = videoRef.current;
    if (!node) return;
    if (shouldLoad) {
      node.load();
      node.play().catch(() => undefined);
    }
    else {
      node.pause();
      node.removeAttribute("src");
      node.load();
    }
  }, [shouldLoad]);
  const progress = useTransform(
    scrollYProgress,
    video.range,
    [0, 1],
    { clamp: true },
  );

  const insetY = useTransform(progress, [0, 1], [34, 0]);
  const insetX = useTransform(progress, [0, 1], [40, 0]);
  const roundedness = useTransform(progress, [0, 1], [999, 0]);
  const clipPath = useMotionTemplate`inset(${insetY}% ${insetX}% ${insetY}% ${insetX}% round ${roundedness}px)`;
  const scale = useTransform(progress, [0, 1], [1.06, 1]);
  const barWidth = useTransform(
    progress,
    [0, 1],
    ["0%", "100%"],
  );

  return (
    <div
      className="aspect-[9/16] w-full max-h-[85vh] top-[7.5vh] md:max-h-none md:aspect-auto md:h-screen md:top-0 mx-auto"
      style={{
        position: "sticky",
        zIndex: video.zIndex,
        overflow: "hidden",
      }}
    >
      <motion.div
        style={{
          clipPath,
          width: "100%",
          height: "100%",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <motion.video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="none"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            scale,
          }}
        >
          {shouldLoad && video.videoUrl && <source src={mediaVideoUrl(video.videoUrl)} type="video/mp4" />}
        </motion.video>

        {!video.videoUrl && (
          <img
            src={mediaImageUrl(video.imageUrl, { width: 1920, fit: "fit" })}
            alt={video.label}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(26,22,18,0.72) 0%, rgba(26,22,18,0.15) 55%, transparent 100%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "absolute",
            bottom: "clamp(20px,4vh,48px)",
            left: "clamp(20px,4vw,56px)",
            right: "clamp(20px,4vw,56px)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              background: "rgba(242,237,228,0.08)",
              border: "1px solid rgba(242,237,228,0.18)",
              padding: "8px 16px",
              backdropFilter: "blur(6px)",
              maxWidth: "100%",
            }}
          >
            <span
              style={{
                color: "#f2ede4",
                fontSize: "0.72rem",
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontFamily: "'Poppins', sans-serif",
                lineHeight: 1.4,
              }}
            >
              {video.label}
            </span>
          </div>
        </div>

        <motion.div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            height: "2.5px",
            background: "#b8943a",
            width: barWidth,
          }}
        />
      </motion.div>
    </div>
  );
}

// ── Small presentational components ──────────────────────────────────────────

function GoldButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "#f2c97a",
        color: "#781216",
        border: "none",
        padding: "12px 28px",
        fontSize: "0.78rem",
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        width: "min(100%, 260px)",
        fontFamily: "'Poppins', sans-serif",
        transition: "background 0.25s ease",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "#f9d98a")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = "#f2c97a")
      }
    >
      {children}
    </button>
  );
}

function OutlineButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        color: "rgba(249,241,232,0.8)",
        border: "1px solid rgba(249,241,232,0.3)",
        padding: "12px 28px",
        fontSize: "0.78rem",
        fontWeight: 400,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        cursor: "pointer",
        width: "min(100%, 260px)",
        fontFamily: "'Poppins', sans-serif",
        transition: "border-color 0.25s ease, color 0.25s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#f2c97a";
        e.currentTarget.style.color = "#f2c97a";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor =
          "rgba(249,241,232,0.3)";
        e.currentTarget.style.color = "rgba(249,241,232,0.8)";
      }}
    >
      {children}
    </button>
  );
}

function FestivalChip({
  festival,
}: {
  festival: { name: string; place: string; date: string; tag: string };
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "flex-start",
        background: "rgba(255,255,255,0.1)",
        border: "1px solid rgba(255,255,255,0.25)",
        borderRadius: "0px",
        padding: "22px 28px",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        minWidth: 0,
        maxWidth: "420px",
        flex: "1 1 220px",
        transition:
          "border-color 0.25s ease, background 0.25s ease, transform 0.2s ease",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "#f2c97a";
        el.style.background = "rgba(242,201,122,0.14)";
        el.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "rgba(255,255,255,0.25)";
        el.style.background = "rgba(255,255,255,0.1)";
        el.style.transform = "translateY(0)";
      }}
    >
      {/* Tag line */}
      <span
        style={{
          color: "#f2c97a",
          fontSize: "0.6rem",
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          marginBottom: "8px",
          display: "block",
        }}
      >
        {festival.tag}
      </span>

      {/* Festival name */}
      <span
        style={{
          color: "#f9f1e8",
          fontSize: "1.05rem",
          fontWeight: 500,
          display: "block",
          lineHeight: 1.25,
          marginBottom: "12px",
          letterSpacing: "-0.01em",
        }}
      >
        {festival.name}
      </span>

      {/* Divider */}
      <div
        style={{
          width: "28px",
          height: "1px",
          background: "rgba(242,201,122,0.4)",
          marginBottom: "12px",
        }}
      />

      {/* Place + Date */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "5px",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <MapPin size={11} color="rgba(249,241,232,0.5)" />
          <span
            style={{
              color: "rgba(249,241,232,0.65)",
              fontSize: "0.75rem",
              fontWeight: 300,
            }}
          >
            {festival.place}
          </span>
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <Calendar size={11} color="#f2c97a" />
          <span
            style={{
              color: "#f2c97a",
              fontSize: "0.75rem",
              fontWeight: 500,
            }}
          >
            {festival.date}
          </span>
        </span>
      </div>
    </div>
  );
}
