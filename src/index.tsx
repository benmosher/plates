import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import App from "./App";
import { dbReady } from "./plate-db";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement!);

dbReady.then(() =>
  root.render(
    <StrictMode>
      <BrowserRouter basename="/plates/">
        <App />
      </BrowserRouter>
    </StrictMode>,
  ),
);
