import { useEffect } from "react";
import { useLocation, useMatch } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import { publicTripDetailQuery } from "../../lib/catalogQueries";
import { SITE_NAME, SITE_ORIGIN } from "../../seo/content.mjs";
import { detailMetadata, equivalentFestival, pageMetadata, primaryFestivalId } from "../../seo/metadata.mjs";
import { schemaFor } from "../../seo/render.mjs";

function setHeadTag(tag: "meta" | "link", key: string, attribute: string, value?: string) {
  const [name, field] = key.split("=");
  let node = document.head.querySelector(`${tag}[${name}="${field}"]`);
  if (!value) {
    node?.remove();
    return;
  }
  if (!node) {
    node = document.createElement(tag);
    node.setAttribute(name, field);
    document.head.append(node);
  }
  node.setAttribute(attribute, value);
}

export function RouteSeo() {
  const location = useLocation();
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const trip = useMatch("/trips/:slug");
  const festival = useMatch("/festivals/:slug");
  const share = new URLSearchParams(location.search).get("share");
  const hasShare = new URLSearchParams(location.search).has("share");
  const { user, isLoading } = useAuth();
  const viewer = { userId: user?.id, isLoading };
  const detail = useQuery(publicTripDetailQuery(festival?.params.slug || trip?.params.slug, Boolean(festival), share, viewer));
  const primaryId = festival && !hasShare ? primaryFestivalId(detail.data) : null;
  const primary = useQuery(publicTripDetailQuery(primaryId || undefined, true, null, viewer));

  useEffect(() => {
    const kind = festival ? "festivals" : "trips";
    const isDetail = Boolean(trip || festival);
    if (isDetail && detail.isPending && !hasShare) {
      // Keep the correct initial metadata while the same server-rendered route loads.
      if (document.documentElement.dataset.seoPath === path) return;
    }
    const metadata = hasShare ? { title: SITE_NAME, indexable: false }
      : isDetail ? detail.data ? detailMetadata(kind, detail.data, equivalentFestival(detail.data, primary.data) ? primary.data : undefined) : { title: SITE_NAME, indexable: false }
      : pageMetadata(path);
    const indexable = window.location.origin === SITE_ORIGIN && metadata.indexable;
    document.documentElement.dataset.seoPath = path;
    document.title = metadata.title;
    setHeadTag("meta", "name=robots", "content", indexable ? "index, follow, max-image-preview:large" : "noindex, nofollow");
    setHeadTag("meta", "name=description", "content", metadata.description);
    setHeadTag("link", "rel=canonical", "href", metadata.canonical);
    setHeadTag("meta", "property=og:site_name", "content", metadata.canonical ? SITE_NAME : undefined);
    setHeadTag("meta", "property=og:title", "content", metadata.canonical ? metadata.title : undefined);
    setHeadTag("meta", "property=og:type", "content", metadata.type);
    setHeadTag("meta", "property=og:description", "content", metadata.description);
    setHeadTag("meta", "property=og:url", "content", metadata.canonical);
    setHeadTag("meta", "property=og:image", "content", metadata.image);
    setHeadTag("meta", "name=twitter:card", "content", metadata.canonical ? "summary_large_image" : undefined);
    setHeadTag("meta", "name=twitter:title", "content", metadata.canonical ? metadata.title : undefined);
    setHeadTag("meta", "name=twitter:description", "content", metadata.description);
    setHeadTag("meta", "name=twitter:image", "content", metadata.image);
    let schema = document.head.querySelector("#page-schema");
    if (indexable) {
      if (!schema) {
        schema = document.createElement("script");
        schema.id = "page-schema";
        schema.setAttribute("type", "application/ld+json");
        document.head.append(schema);
      }
      schema.textContent = JSON.stringify(schemaFor(path, metadata, { origin: SITE_ORIGIN, item: isDetail ? detail.data : undefined, kind }));
    } else {
      schema?.remove();
    }
  }, [path, trip, festival, hasShare, detail.data, detail.isPending, primary.data]);

  return null;
}
