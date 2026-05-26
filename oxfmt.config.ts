import { defineConfig } from "oxfmt";

export default defineConfig({
  ignorePatterns: [],
  sortImports: {
    customGroups: [
      {
        groupName: "node",
        elementNamePattern: ["node:*"],
      },
    ],
    newlinesBetween: true,
    groups: [
      "node",
      "type-import",
      ["value-builtin", "value-external"],
      "type-internal",
      "value-internal",
      ["type-parent", "type-sibling", "type-index"],
      ["value-parent", "value-sibling", "value-index"],
      "unknown",
    ],
  },
});
