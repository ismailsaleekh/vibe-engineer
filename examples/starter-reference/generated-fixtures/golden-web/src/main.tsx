// @sample @demo @reference — golden-web Vite entry (I-17A / DL-16).
//
// Mirrors the I-15B `.source-template/apps/web/src/main.tsx` entry shape (Vite +
// React root on `#root`). `golden-web` is the RENDERABLE golden web app fixture
// that consumes the I-16B shared client (golden-client) so the golden-records
// route renders REAL classified records (DL-16 §245 "render/read it in web and
// mobile"). No contract/client re-declaration (DL-14 §5); vocabulary is
// sample/demo/reference-only (DL-20A).

import "./golden-web.css";
import { createRoot } from "react-dom/client";
import { GoldenWebApp } from "./app/app.js";

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("Golden-web root element #root not found");
}
createRoot(rootElement).render(<GoldenWebApp />);
