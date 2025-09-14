import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import init from "./rusty/rusty.js";

import App from "./App";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement!);
init().then(() => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
