import fs from "fs/promises";
import path from "path";
import type { SandboxTool } from "../types.js";

// Resolve the path to theme.json relative to the current module
// This assumes the tool is running from within the 'api' project's structure
const themeJsonPath = path.resolve(process.cwd(), "../ui/src/theme/theme.json");

export const themeEditorTool: SandboxTool = {
  name: "updateThemeValue",
  description:
    "Updates a specific key-value pair in the theme.json file to change the UI's appearance. Use this to modify global colors, fonts, and other theme-level settings.",

  inputSchema: {
    type: "object",
    properties: {
      key: {
        type: "string",
        description:
          'The theme variable key to update (e.g., "color-primary").',
      },
      value: {
        type: "string",
        description: 'The new value to set for the key (e.g., "#FF0000").',
      },
    },
    required: ["key", "value"],
  },

  handler: async (args: Record<string, unknown>) => {
    const { key, value } = args as { key: string; value: string };

    try {
      // Read the theme file
      let theme;
      try {
        const themeJsonContent = await fs.readFile(themeJsonPath, "utf-8");
        theme = JSON.parse(themeJsonContent);
      } catch (readError) {
        return {
          status: "error",
          message: `❌ Failed to read theme file: ${
            (readError as Error).message
          }`,
        };
      }

      // Allow any key - no validation constraints

      // Update the value
      theme[key] = value;

      // Write the updated theme back to the file
      await fs.writeFile(
        themeJsonPath,
        JSON.stringify(theme, null, 2),
        "utf-8"
      );

      return {
        status: "success",
        message: `✅ Theme updated successfully: Set "${key}" to "${value}". The UI will now reflect this change.`,
      };
    } catch (error) {
      return {
        status: "error",
        message: `❌ An unexpected error occurred: ${(error as Error).message}`,
      };
    }
  },
};
