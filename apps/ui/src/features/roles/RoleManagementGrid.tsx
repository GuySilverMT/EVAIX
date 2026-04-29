import { trpc } from "../../utils/trpc.js";
import { CooperativeGrid } from "../../components/cooperative/primitives/CooperativeGrid.js";

export const RoleManagementGrid = () => {
  // 1. Fetch Data (The Soul)
  const { data: roles } = trpc.roles.list.useQuery();

  // 2. Define Configuration for the Primitive
  const columns = [
    { key: "name", label: "Role Name" },
    { key: "description", label: "Description" },
    { key: "updatedAt", label: "Last Active" }
  ];

  // 3. Render the Primitive with the Data
  return (
    <CooperativeGrid 
      title="System Roles"
      columns={columns}
      data={roles || []} // Inject Data
    />
  );
};
