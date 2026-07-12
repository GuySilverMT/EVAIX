# EVAIX Bad Builder

The `apps/badbuilder` workspace contains a static vanilla web application used for canvas-based layout generation and experimentation within the EVAIX ecosystem. It primarily tests the `Nebula` engine by mapping layout definitions (JSON) to specific node types on a canvas.

## 🚀 Getting Started

Since this is a static vanilla web application, it does not require a complex build process or Node.js to serve.

You can run it locally using Python's built-in HTTP server.

### Running the App

Navigate to the `apps/badbuilder` directory and start a local HTTP server:

```bash
cd apps/badbuilder
python3 -m http.server 8000
```

Once the server is running, you can access the application by opening your web browser and navigating to:

```text
http://localhost:8000
```

## 🛠️ Development Notes

- **Canvas Updates:** Structural changes to canvas blocks (e.g., modifying `role`, `parentId`, `grid`, or updating blocks with specific roles like `table`/`cell`) require calling `renderCanvas()` for a full canvas re-render instead of `refreshBlock()`. Always precede full renders with `saveHistory()`.
- **Integration:** The engine in the UI apps (`@repo/nebula`) maps these Bad Builder JSON layout definitions to React components via their `role` property (e.g., `role: 'cell'` becomes `type: 'Box'`).