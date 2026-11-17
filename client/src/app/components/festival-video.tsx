import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { ArrowRight, Calendar, MapPin } from "lucide-react";
import { canAutoplayVideo } from "../../lib/connection";
import { fetchFeaturedFestivals, type ApiFestival } from "../../lib/festivalApi";
import { mediaImageUrl, mediaVideoPosterUrl, mediaVideoUrl } from "../../lib/media";
import { ContainerAnimated, ContainerStagger } from "./hero-video-primitives";

const CRIMSON = "#781216";

function formatFestivalDate(festival: ApiFestival) {
  const slot = festival.slots?.[0];
  if (!slot?.startDate) return festival.bestTimeToVisit || "Dates to be announced";
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(new Date(slot.startDate));
}

// ── Main export ───────────────────────────────────────────────────────────────

export function FestivalVideo() {
  const navigate = useNavigate();
  const { data, isPending: isLoading } = useQuery({
    queryKey: ["public", "featured-festivals"],
    queryFn: ({ signal }) => fetchFeaturedFestivals(signal),
    staleTime: 60_000,
  });
  const festivals = (data ?? []).filter((festival) => festival.videoUrl || festival.bannerImages?.length);

  if (!isLoading && festivals.length === 0) return null;

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

          {festivals.length > 0 && (
            <ContainerAnimated animation="blur">
              <div className="mx-auto mb-8 flex max-w-[960px] flex-wrap justify-center gap-4">
                {festivals.map((festival) => (
                  <FestivalChip
                    key={festival.id}
                    festival={{
                      name: festival.title,
                      place: festival.location,
                      date: formatFestivalDate(festival),
                      tag: festival.bestTimeToVisit || "Featured Festival",
                    }}
                    onClick={() => navigate(`/festivals/${festival.id}`)}
                  />
                ))}
              </div>
            </ContainerAnimated>
          )}

          <ContainerAnimated animation="bottom">
            <Link
              to="/festivals"
              className="inline-flex min-h-11 w-full max-w-[260px] items-center justify-center gap-2 bg-[#f2c97a] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#781216] transition-colors hover:bg-[#f9d98a] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f2c97a]"
            >
              View all festivals <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </ContainerAnimated>
        </ContainerStagger>
      </section>

      {festivals.length > 0 && (
        <div className="bg-[#1a1612]">
          {festivals.map((festival) => (
            <FestivalMedia key={festival.id} festival={festival} />
          ))}
        </div>
      )}
    </div>
  );
}

function FestivalMedia({ festival }: { festival: ApiFestival }) {
  const panel = useRef<HTMLDivElement>(null);
  const player = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [loadVideo, setLoadVideo] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failedVideo, setFailedVideo] = useState<string>();
  const [failedPoster, setFailedPoster] = useState<string>();
  const videoUrl = festival.videoUrl;
  const playVideo = videoUrl && failedVideo !== videoUrl && canAutoplayVideo();
  const banner = festival.bannerImages?.find(Boolean);
  const poster = mediaVideoPosterUrl(videoUrl);
  const posterSource = banner && failedPoster !== banner ? banner : poster;
  const posterUrl = posterSource === banner
    ? mediaImageUrl(banner, { width: 1440, fit: "fit" })
    : posterSource;
  const responsiveBanner = posterSource === banner && banner?.includes("res.cloudinary.com");

  useEffect(() => {
    const node = panel.current;
    if (!node || !playVideo) return;

    const observer = new IntersectionObserver(([entry]) => {
      const visible = entry.isIntersecting && entry.intersectionRatio >= 0.45;
      setInView(visible);
      if (visible) setLoadVideo(true);
    }, { threshold: 0.45 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [playVideo]);

  useEffect(() => {
    const node = player.current;
    if (!node || !loadVideo) return;
    if (inView) {
      void node.play().catch(() => setPlaying(false));
    } else {
      node.pause();
    }
    return () => node.pause();
  }, [playVideo, loadVideo, inView, videoUrl]);

  return (
    <div
      ref={panel}
      className="relative isolate aspect-[9/16] max-h-[85svh] w-full overflow-hidden bg-[#1a1612] motion-safe:sticky motion-safe:top-14 md:aspect-auto md:h-svh md:max-h-none md:motion-safe:top-0"
    >
      {posterUrl && posterSource !== failedPoster && (
        <picture>
          {responsiveBanner && (
            <source
              media="(max-width: 767px)"
              sizes="100vw"
              srcSet={[480, 720, 1080].map((width) =>
                `${mediaImageUrl(banner, { width, height: Math.round(width * 16 / 9) })} ${width}w`,
              ).join(", ")}
            />
          )}
          <img
            src={posterUrl}
            srcSet={responsiveBanner ? [960, 1440, 1920].map((width) =>
              `${mediaImageUrl(banner, { width, fit: "fit" })} ${width}w`,
            ).join(", ") : undefined}
            sizes="100vw"
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setFailedPoster(posterSource)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </picture>
      )}
      {playVideo && videoUrl && (
        <video
          ref={player}
          src={loadVideo ? mediaVideoUrl(videoUrl) : undefined}
          data-playing={playing}
          aria-hidden="true"
          muted
          loop
          playsInline
          preload="none"
          onPlaying={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onWaiting={() => setPlaying(false)}
          onError={() => setFailedVideo(videoUrl)}
          className="absolute inset-0 h-full w-full object-cover transition-opacity data-[playing=false]:opacity-0 motion-reduce:transition-none"
        />
      )}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-t from-[#1a1612]/75 via-[#1a1612]/15 to-transparent" />
      <p className="absolute bottom-10 left-5 right-auto max-w-[calc(100%-2.5rem)] border border-[#f2ede4]/25 bg-[#1a1612]/65 px-4 py-2 text-xs font-medium uppercase leading-relaxed tracking-widest text-[#f2ede4] md:bottom-12 md:left-auto md:right-14">
        {festival.title}
      </p>
    </div>
  );
}

function FestivalChip({
  festival,
  onClick,
}: {
  festival: { name: string; place: string; date: string; tag: string };
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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
        fontFamily: "'Poppins', sans-serif",
        transition:
          "border-color 0.25s ease, background 0.25s ease, transform 0.2s ease",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = "#f2c97a";
        el.style.background = "rgba(242,201,122,0.14)";
        el.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
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
    </button>
  );
}
