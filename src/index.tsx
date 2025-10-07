import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement!);

root.render(
  <StrictMode>
    <Suspense fallback={<div>Initializing...</div>}>
      <App />
    </Suspense>
  </StrictMode>
);
