# Role Creator Swappable Integration

## Overview
The Role Creator (AgentDNAlab) has been integrated as a new 'dna-lab' view mode within the SwappableCard component. This allows it to be used in the AgentWorkbench and any other place where SwappableCard is employed, making it adaptable to various screen real estate sizes, including as small as 1/4 of the screen width. The UI is condensed without removing any features or backend functionality.

## Key Changes

### 1. SwappableCard Integration
- Added a new view mode `'dna-lab'` to the `viewMode` state type.
- Imported `AgentDNAlab` from `../../features/dna-lab/AgentDNAlab.js`.
- Added a Dna icon button in the header toolbar after the role selector button.
- When clicked, switches to 'dna-lab' mode.
- In the content area, renders `<AgentDNAlab embeddedMode roleId={agentConfig.roleId} onRoleChange={(roleId) => updateCard(id, { roleId })} />`.
- Role changes sync back to the card's roleId, updating the agentConfig.

### 2. AgentDNAlab Enhancements
- Added props: `roleId?: string`, `onRoleChange?: (roleId: string) => void`.
- Calls `onRoleChange` when selecting or creating a role.
- Added useEffect to initial load from prop roleId.
- Model filtering: Fetches providers via `trpc.providers.list.useQuery()` and filters models to only those from enabled providers (`p.isEnabled`).
- Responsiveness:
  - Sidebar: `hidden lg:block` to hide on small screens.
  - Identity tab grid: `grid-cols-1 lg:grid-cols-2`.
  - Identity section: `flex-1 space-y-2 flex flex-col` for full height.
  - Textarea: `flex-1 min-h-[300px]` instead of fixed height.
  - Tools tab container: `flex gap-2 lg:gap-6 flex-1` instead of fixed height.
  - RoleToolSelector: `w-full lg:w-80`.

### 3. OrgWorkflow Adaptation
- Changed the right panel div from fixed `w-[420px] min-w-[320px]` to `flex-1 min-w-[25vw]` for adaptive sizing (half screen default, min 1/4).
- The Role Creator now adapts to the container size, and with the swappable integration, can be used in card layouts.

### 4. Model Selector Functionality
- The ModelFilter now only displays models from enabled providers.
- Updates role criteria (min/max context, preferences) on change.
- For hard selection (viewMode='HARD_SELECTION'), it supports overriding to a specific model, but in DNA lab, it's used for capability filtering.
- No backend changes; saves via existing trpc roles upsert/create.

## Usage
- In AgentWorkbench: Spawn a card, click the Dna button in the card header to enter role editing mode.
- Edit the role DNA, save syncs globally and updates the card's roleId.
- In OrgWorkflow: The right panel is now responsive and uses the embedded AgentDNAlab, which benefits from the responsive changes.
- The UI is condensed: reduced paddings, stacked layouts on small screens, no wasted space.

## Verification
- All UI features preserved (tabs, tools, tuning, etc.).
- Backend functionality intact (role CRUD via trpc).
- Test in browser dev tools with widths 300px+ to verify adaptation.
- Model list updates dynamically with provider enables/disables.

## Future
- Full replacement of OrgWorkflow right panel with SwappableCard for complete unification (optional, current responsive layout works).
- Add default model selection to role form if needed.