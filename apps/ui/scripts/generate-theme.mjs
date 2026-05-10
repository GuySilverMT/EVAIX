import fs from "fs/promises";
import path from "path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const themeJsonPath = path.resolve(__dirname, "../src/theme/theme.json");
const globalCssPath = path.resolve(__dirname, "../src/theme/global.css");

async function generateTheme() {
  try {
    // Check if theme.json exists
    try {
      await fs.access(themeJsonPath);
    } catch (error) {
      console.log("📝 theme.json not found, skipping theme generation");
      return;
    }

    // Read the theme JSON file
    const themeJsonContent = await fs.readFile(themeJsonPath, "utf-8");
    const theme = JSON.parse(themeJsonContent);

    // Construct the CSS variables block
    let cssVariables = ":root {\n";
    for (const [key, value] of Object.entries(theme)) {
      // For numeric values without units, we don't add 'px' or anything by default.
      // The JSON should contain the unit if needed (e.g., "13px").
      cssVariables += `  --${key}: ${value};\n`;
    }
    cssVariables += "}";

    // Read the existing global.css file
    const globalCssContent = await fs.readFile(globalCssPath, "utf-8");

    // Replace the existing :root block with the new one
    const updatedCssContent = globalCssContent.replace(
      /:root\s*{[^}]*}/,
      cssVariables
    );

    // Write the updated content back to global.css
    await fs.writeFile(globalCssPath, updatedCssContent, "utf-8");

    console.log("✅ Theme generated successfully from theme.json");
  } catch (error) {
    console.error("❌ Error generating theme:", error);
    process.exit(1);
  }
}

generateTheme();
