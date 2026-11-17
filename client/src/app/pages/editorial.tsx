import { Link, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { SiteFooter } from "../components/site-footer";
import { fetchCrmFestivals } from "../../lib/festivalApi";
import { publicTripsQuery } from "../../lib/catalogQueries";
import { CONTACT_EMAIL, CONTACT_PHONE, guidePaths, pages } from "../../seo/content.mjs";
import { catalogName, pathOf } from "../../seo/metadata.mjs";

export default function EditorialPage() {
  const path = useLocation().pathname.replace(/\/+$/, "");
  const content = pages[path];
  const slugs = content.related ?? [];
  const trips = useQuery({ ...publicTripsQuery, enabled: slugs.some((slug: string) => !slug.includes("festival")) });
  const festivals = useQuery({
    queryKey: ["public", "festivals", "crm"],
    queryFn: ({ signal }) => fetchCrmFestivals(signal),
    enabled: slugs.some((slug: string) => slug.includes("festival")),
    staleTime: 60_000,
  });
  const catalog = [
    ...(trips.data ?? []).map((item) => ({ item, kind: "trips" })),
    ...(festivals.data ?? []).map((item) => ({ item, kind: "festivals" })),
  ];
  const related = slugs.map((slug: string) => catalog.find(({ item }) => item.publicSlug === slug)).filter(Boolean);
  const guides = path === "/guides" ? guidePaths : [];
  return (
    <>
      <main className="min-h-[60vh] bg-[#f5f0e6] px-6 pt-32 pb-20 text-[#241c18] sm:px-12 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap gap-2 text-sm text-[#6c554e]">
            <Link to="/" className="underline underline-offset-4">Home</Link><span>/</span>
            {path.startsWith("/guides/") && <><Link to="/guides" className="underline underline-offset-4">Travel guides</Link><span>/</span></>}
            <span aria-current="page">{content.heading}</span>
          </nav>
          <h1 className="max-w-4xl text-4xl leading-tight font-semibold tracking-tight text-[#781216] sm:text-6xl">{content.heading}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed">{content.description}</p>
          <div className="mt-12 border-t border-[#d8cabb]">
            {(content.sections ?? []).map(([heading, text]: [string, string]) => (
              <section className="grid gap-3 border-b border-[#d8cabb] py-7 sm:grid-cols-[1fr_2.1fr] sm:gap-8" key={heading}>
                <h2 className="text-xl font-medium text-[#781216]">{heading}</h2>
                <p className="max-w-2xl leading-relaxed">{text}</p>
              </section>
            ))}
            {guides.map((guide) => (
              <Link key={guide} to={guide} className="flex items-center justify-between gap-4 border-b border-[#d8cabb] py-6 text-lg text-[#781216] hover:underline">
                {pages[guide].heading}<ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
              </Link>
            ))}
          </div>
          {content.external && <section className="mt-9"><h2 className="mb-3 text-xl font-medium">Official information</h2><ul>{content.external.map(([url, label]: [string, string]) => <li key={url}><a className="text-[#781216] underline underline-offset-4" href={url}>{label}</a></li>)}</ul></section>}
          {slugs.length > 0 && (
            <section className="mt-9">
              <h2 className="mb-3 text-xl font-medium">Related trips</h2>
              <ul className="space-y-2">
                {related.map((entry: (typeof catalog)[number]) => <li key={entry.item.id}><Link className="text-[#781216] underline underline-offset-4" to={pathOf(entry.kind, entry.item)}>{catalogName(entry.item)}</Link></li>)}
                {related.length === 0 && <li><Link to="/trips" className="text-[#781216] underline underline-offset-4">Browse the trip catalog</Link></li>}
              </ul>
            </section>
          )}
          {content.inquiry && (
            <section className="mt-9">
              <h2 className="mb-3 text-xl font-medium">Contact Hangover Trails</h2>
              <ul className="space-y-2">
                <li><a className="text-[#781216] underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></li>
                <li><a className="text-[#781216] underline underline-offset-4" href={`tel:${CONTACT_PHONE}`}>+91 84159 29069</a></li>
                <li><a className="text-[#781216] underline underline-offset-4" href="#contact">Send a trip inquiry</a></li>
              </ul>
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
