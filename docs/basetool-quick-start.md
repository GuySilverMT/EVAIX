# Basetool Headless UI - Quick Start Guide

This guide shows you how to quickly start using the new Basetool-powered headless UI system.

## Step 1: Adding Routes

Add the new pages to your application routing in `apps/ui/src/App.tsx`:

```tsx
import { Routes, Route } from "react-router-dom";
import { HeadlessUIDemo } from "./pages/HeadlessUIDemo";
import { VisualQueryBuilder } from "./pages/VisualQueryBuilder";
// ... other imports

function App() {
  return (
    <Routes>
      {/* ... existing routes ... */}
      
      {/* Basetool Headless UI Routes */}
      <Route path="/headless-demo" element={<HeadlessUIDemo />} />
      <Route path="/query-builder" element={<VisualQueryBuilder />} />
    </Routes>
  );
}
```

## Step 2: Configure Basetool

Create a `.env.local` file in the root directory:

```bash
# Copy from .env.example
BASETOOL_API_URL=http://localhost:3000/api
BASETOOL_API_KEY=your-basetool-api-key-here
```

If you don't have Basetool running yet, the system will work in mock mode.

## Step 3: Access the Pages

Start your development server:

```bash
pnpm dev
```

Then visit:
- **Headless UI Demo**: http://localhost:5173/headless-demo
- **Visual Query Builder**: http://localhost:5173/query-builder

## Creating Your First Headless Page

### Option 1: Using a Form

1. Create a schema file `apps/ui/src/schemas/my-entity-form.json`:

```json
{
  "type": "form",
  "title": "Create My Entity",
  "table": "my_entities",
  "fields": [
    {
      "name": "name",
      "label": "Name",
      "type": "text",
      "required": true
    },
    {
      "name": "description",
      "label": "Description",
      "type": "textarea"
    },
    {
      "name": "isActive",
      "label": "Active",
      "type": "boolean",
      "defaultValue": true
    }
  ],
  "submitLabel": "Create",
  "mode": "create"
}
```

2. Create a page component `apps/ui/src/pages/MyEntityForm.tsx`:

```tsx
import React from 'react';
import { HeadlessForm } from '../components/HeadlessForm';
import schema from '../schemas/my-entity-form.json';
import { FormSchema } from '../schemas/types';

export const MyEntityForm = () => {
  const handleSubmit = (data: Record<string, unknown>) => {
    console.log('Created:', data);
    // Navigate or show success message
  };

  return (
    <div className="container mx-auto py-8">
      <HeadlessForm
        schema={schema as FormSchema}
        onSubmit={handleSubmit}
      />
    </div>
  );
};
```

3. Add route in `App.tsx`:

```tsx
<Route path="/my-entity/create" element={<MyEntityForm />} />
```

### Option 2: Using a Table

1. Create a schema file `apps/ui/src/schemas/my-entity-table.json`:

```json
{
  "type": "table",
  "title": "My Entities",
  "table": "my_entities",
  "columns": [
    {
      "name": "id",
      "label": "ID",
      "type": "text",
      "width": "100px"
    },
    {
      "name": "name",
      "label": "Name",
      "type": "text",
      "sortable": true,
      "filterable": true
    },
    {
      "name": "description",
      "label": "Description",
      "type": "text"
    },
    {
      "name": "isActive",
      "label": "Status",
      "type": "boolean",
      "render": "boolean"
    }
  ],
  "actions": {
    "create": true,
    "edit": true,
    "delete": true
  },
  "pagination": {
    "enabled": true,
    "pageSize": 20
  }
}
```

2. Create a page component `apps/ui/src/pages/MyEntityTable.tsx`:

```tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HeadlessTable } from '../components/HeadlessTable';
import schema from '../schemas/my-entity-table.json';
import { TableSchema } from '../schemas/types';

export const MyEntityTable = () => {
  const navigate = useNavigate();

  const handleAction = (action: string, row: Record<string, unknown>) => {
    switch (action) {
      case 'create':
        navigate('/my-entity/create');
        break;
      case 'edit':
        navigate(`/my-entity/edit/${row.id}`);
        break;
      case 'view':
        navigate(`/my-entity/view/${row.id}`);
        break;
    }
  };

  return (
    <div className="container mx-auto py-8">
      <HeadlessTable
        schema={schema as TableSchema}
        onAction={handleAction}
      />
    </div>
  );
};
```

3. Add route in `App.tsx`:

```tsx
<Route path="/my-entities" element={<MyEntityTable />} />
```

## Using the Visual Query Builder

The Visual Query Builder lets you create SQL queries by drawing relationships between tables:

1. Navigate to `/query-builder`
2. Select tables from the sidebar
3. Drag columns from one table to another to create relationships
4. Click "Generate SQL with AI" to create the query
5. Review the generated SQL
6. Click "Execute Query" to run it
7. View results in the results panel

### Example Workflow

```
Goal: Get all orders with user information

1. Add "orders" table
2. Add "users" table
3. Drag orders.user_id → users.id
4. Select INNER JOIN
5. Generate SQL
6. Execute and view results
```

## Field Types Reference

The headless UI supports these field types:

| Type | Description | Use Case |
|------|-------------|----------|
| `text` | Single-line text input | Names, titles, short strings |
| `email` | Email input with validation | Email addresses |
| `password` | Password input (masked) | Passwords |
| `number` | Numeric input | Quantities, prices, counts |
| `boolean` | Checkbox | True/false flags |
| `textarea` | Multi-line text input | Descriptions, notes |
| `select` | Dropdown selection | Single choice from options |
| `multiselect` | Multiple selection | Multiple choices |
| `date` | Date picker | Dates without time |
| `datetime` | Date and time picker | Timestamps |
| `json` | JSON editor | Complex data structures |

## Render Types for Tables

Control how values are displayed in tables:

| Render Type | Description | Example |
|-------------|-------------|---------|
| `text` | Plain text (default) | "John Doe" |
| `badge` | Colored badge | 🏷️ admin |
| `boolean` | Yes/No badge | ✅ Yes |
| `date` | Formatted date | Jan 15, 2024 |
| `json` | Pretty-printed JSON | `{ "key": "value" }` |

## Best Practices

### 1. Schema Organization

```
apps/ui/src/schemas/
├── users/
│   ├── user-form.json
│   ├── user-table.json
│   └── user-detail.json
├── orders/
│   ├── order-form.json
│   └── order-table.json
└── ...
```

### 2. Validation

Always add validation to important fields:

```json
{
  "name": "email",
  "type": "email",
  "required": true,
  "validation": {
    "pattern": "^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$",
    "message": "Please enter a valid email"
  }
}
```

### 3. Default Values

Set sensible defaults:

```json
{
  "name": "status",
  "type": "select",
  "defaultValue": "active",
  "options": [
    { "label": "Active", "value": "active" },
    { "label": "Inactive", "value": "inactive" }
  ]
}
```

### 4. Error Handling

Always handle submission errors:

```tsx
const handleSubmit = async (data: Record<string, unknown>) => {
  try {
    // Submit data
    console.log('Success:', data);
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to save. Please try again.');
  }
};
```

## Common Patterns

### CRUD Operations

Create a complete CRUD interface:

```tsx
// List page
<Route path="/entities" element={<EntityTable />} />

// Create page
<Route path="/entities/create" element={<EntityForm mode="create" />} />

// Edit page
<Route path="/entities/edit/:id" element={<EntityForm mode="edit" />} />

// View page
<Route path="/entities/view/:id" element={<EntityDetail />} />
```

### Master-Detail

Show related data:

```tsx
const handleRowClick = (row: Record<string, unknown>) => {
  // Show details in a modal or navigate to detail page
  setSelectedEntity(row);
  setShowDetail(true);
};

<HeadlessTable
  schema={tableSchema}
  onRowClick={handleRowClick}
/>
```

### Filtering

Pre-filter data by passing filters:

```tsx
// Only show active users
const { data } = trpc.basetool.getTableData.useQuery({
  tableName: 'users',
  filters: {
    where: { isActive: true }
  }
});
```

## Troubleshooting

### Issue: "Module not found: Can't resolve '../utils/trpc'"

Make sure tRPC is properly configured in your UI. The import should work if tRPC client is set up.

### Issue: "Table not found"

Check that:
1. Table name in schema matches database table name
2. Basetool connection is configured correctly
3. Table exists in the database

### Issue: "Validation errors"

Check the browser console for specific validation errors. Common issues:
- Missing required fields
- Invalid email format
- Pattern mismatch

## Next Steps

- Read the full documentation: `docs/basetool-integration.md`
- Explore example schemas in `apps/ui/src/schemas/`
- Try the Visual Query Builder
- Create your own custom pages

## Support

For questions or issues:
1. Check the main documentation
2. Review example implementations
3. Check the console for error messages
4. Ensure Basetool configuration is correct
