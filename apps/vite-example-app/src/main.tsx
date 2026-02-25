import React from "react";
import ReactDOM from "react-dom/client";

import { RefractBootstrap } from "@nkstack/refract-runtime-client";

import App from "./App";
import "./index.css";
import { refractRuntimeRegistry } from "./refract-runtime";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RefractBootstrap
      plugins={refractRuntimeRegistry.runtimePlugins}
      defaultPluginId={refractRuntimeRegistry.defaultPluginId}
    />
    <App />
  </React.StrictMode>
);
