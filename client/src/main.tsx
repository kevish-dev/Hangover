import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";

const root = document.getElementById("root")!;
if (root.querySelector(".seo-page")) {
  document.documentElement.dataset.seoPath = location.pathname.replace(/\/+$/, "") || "/";
}
createRoot(root).render(<App />);
