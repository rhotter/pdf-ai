import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Readatron",
    description: "Chat with any PDF using AI",
    permissions: ["storage", "activeTab", "sidePanel", "tabs", "scripting"],
    action: {
      default_title: "Readatron",
      default_icon: {
        16: "icon/16.png",
        32: "icon/32.png",
        48: "icon/48.png",
        128: "icon/128.png",
      },
    },
    commands: {
      "_execute_action": {
        suggested_key: {
          default: "Ctrl+E",
          mac: "Command+E",
        },
        description: "Toggle Readatron sidebar",
      },
    },
    icons: {
      16: "icon/16.png",
      32: "icon/32.png",
      48: "icon/48.png",
      128: "icon/128.png",
    },
  },
  vite: () => ({
    resolve: {
      alias: {
        "@": __dirname,
      },
    },
  }),
});
