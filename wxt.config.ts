import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "PDF AI Chat",
    description: "Chat with any PDF using AI",
    permissions: ["storage", "activeTab"],
    commands: {
      "toggle-sidebar": {
        suggested_key: {
          default: "Ctrl+E",
          mac: "Command+E",
        },
        description: "Toggle PDF AI Chat sidebar",
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
