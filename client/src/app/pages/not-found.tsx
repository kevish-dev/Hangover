import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <main className="grid min-h-[65vh] content-center gap-5 bg-[#f5f0e6] px-7 py-28 text-center text-[#781216]">
      <h1 className="text-4xl font-medium">Page not found</h1>
      <p className="text-[#241c18]">Browse the catalog to find a current trip or festival.</p>
      <nav className="flex justify-center gap-6" aria-label="Explore">
        <Link className="underline underline-offset-4" to="/trips">Browse trips</Link>
        <Link className="underline underline-offset-4" to="/festivals">Browse festivals</Link>
      </nav>
    </main>
  );
}
