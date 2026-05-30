import ReactDOM from "react-dom/client";
import App from "./App";
import "./style.css";

// Keep a port open so background knows when the side panel closes (port disconnects)
chrome.runtime.connect({ name: "sidepanel-lifecycle" });

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
