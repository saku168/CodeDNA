import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// @ts-ignore: CSS modules are handled by the bundler.
import "./style.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
