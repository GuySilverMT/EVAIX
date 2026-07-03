# EVAIX Frontend Component Glossary

This document outlines the React components rendered within the EVAIX Spatial Window Manager. EVAIX follows an Orchestrator Paradigm: it primarily wraps external processes rather than rendering custom DOM for every application.

## Core Matrix Infrastructure
* **EvaixEngine:** The root 3D coordinate controller. Manages the display matrices (Display → Column → Row).
* **EvaixShell:** The UI instance running on a single display monitor.
* **TheGrid:** The rendering engine that executes the Progressive Stacking Algorithm for accordion-based tiling.

## AppCard & Window Management
* **AppCard:** The fundamental unit of the workspace. A standardized wrapper that encapsulates all running applications. It allows the AI to address, move, and query the window.
* **FocusStrip:** The active title bar rendered at the top of an `AppCard` when it holds user or agent focus. Contains window controls and AI context indicators.
* **StackStrip:** The condensed, tab-like representation of an `AppCard` when it is pushed to the background by the tiling algorithm.

## The Payloads (Component Registry Targets)
These components are mapped in `ComponentRegistry.ts` and injected into the `AppCard` body.

* **ProjectNavigator (`filesystem`):** The native React file tree. Used for managing workspace context and routing intents to specific directories.
* **LiteLLMConfig (`lite-llm-config`):** A native React overlay for configuring the connection to the local LiteLLM proxy router without leaving the matrix.
* **WebNode (`webnode`, `browser`, `openwebui`, `litellm-ui`):** A chromeless React `<iframe>` implementation. Used to orchestrate web applications. The AI passes a URL prop to embed OpenWebUI, local web services, or standard browsing sessions.
* **NativeNode (`nativenode`, `terminal`):** A specialized wrapper designed to reparent Linux X11/Wayland windows via PID. Used to embed native processes like the system terminal, rendering them as manipulatable tiles within the EVAIX grid.
