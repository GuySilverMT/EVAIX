# Basetool Integration & Headless UI

This document describes the Basetool integration with headless UI architecture and visual query builder for the domore.ai project.

## Overview

The system replaces direct database access with Basetool, enabling all data operations through a unified abstraction layer. The UI is completely headless - all components are "dumb" shells driven entirely by JSON schema definitions.

## Architecture

### 1. Backend - Basetool Service Layer

**Location:** `apps/api/src/services/basetool.service.ts`

The Basetool service provides a clean abstraction over the Basetool API:

```typescript
// Core operations
- getTableSchemas() - Fetch all table schemas
- getTableSchema(tableName) - Get schema for a specific table
- getTableData(tableName, filters) - Query table data with filters
- createRow(tableName, values) - Insert new records
- updateRow(tableName, rowId, values) - Update existing records
- deleteRow(tableName, rowId) - Delete records
- runSQL(query, params) - Execute custom SQL queries
- batchCreateRows(tableName, rows) - Bulk insert operations
```

**Configuration:**

Set the following environment variables in `.env`:

```bash
BASETOOL_API_URL=http://localhost:3000/api  # or your Basetool instance URL
BASETOOL_API_KEY=your-api-key-here
```

### 2. tRPC Router

**Location:** `apps/api/src/routers/basetool.router.ts`

Exposes Basetool operations through type-safe tRPC endpoints:

```typescript
// Available endpoints
basetool.getTableSchemas()
basetool.getTableSchema({ tableName })
basetool.listTables()
basetool.getTableData({ tableName, filters })
basetool.createRow({ tableName, values })
basetool.updateRow({ tableName, rowId, values })
basetool.deleteRow({ tableName, rowId })
basetool.executeSQL({ query, params })
basetool.generateSQL({ tables, relationships, ... })
basetool.validateSQL({ query })
```

### 3. AI SQL Generator

**Location:** `apps/api/src/services/aiSqlGenerator.service.ts`

Converts visual relationship mappings into SQL queries:

```typescript
// Generate SQL from visual mappings
generateSQL(request, schemas)

// Validate SQL for safety (prevents DROP, DELETE, etc.)
validateSQL(sql)

// Explain SQL in natural language
explainSQL(sql)
```

## Headless UI System

### Schema Types

**Location:** `apps/ui/src/schemas/types.ts`

Defines the structure for JSON-driven UI components:

- **FormSchema** - Dynamic form definitions
- **TableSchema** - Data table configurations
- **DetailViewSchema** - Record detail views

### Component Architecture

#### 1. HeadlessForm Component

**Location:** `apps/ui/src/components/HeadlessForm.tsx`

A completely dynamic form component that renders based on JSON schema:

```tsx
<HeadlessForm
  schema={formSchema}
  onSubmit={(data) => console.log(data)}
  onCancel={() => navigate(-1)}
  initialData={existingRecord}
/>
```

**Supported Field Types:**
- text, email, password
- number
- boolean (checkbox)
- textarea
- select, multiselect
- date, datetime
- json

**Features:**
- Client-side validation
- Required field handling
- Custom validation patterns
- Error display
- Create/Edit modes

#### 2. HeadlessTable Component

**Location:** `apps/ui/src/components/HeadlessTable.tsx`

Dynamic data table with sorting, filtering, and pagination:

```tsx
<HeadlessTable
  schema={tableSchema}
  onRowClick={(row) => navigate(`/view/${row.id}`)}
  onAction={(action, row) => handleAction(action, row)}
/>
```

**Features:**
- Column sorting
- Field filtering
- Pagination
- Row actions (view, edit, delete)
- Custom cell rendering (badges, dates, booleans, JSON)

### Creating JSON-Driven Pages

#### Example 1: User Form

**File:** `apps/ui/src/schemas/example-user-form.json`

```json
{
  "type": "form",
  "title": "Create User",
  "description": "Add a new user to the system",
  "table": "users",
  "fields": [
    {
      "name": "email",
      "label": "Email Address",
      "type": "email",
      "required": true,
      "validation": {
        "pattern": "^[^@]+@[^@]+\\.[^@]+$",
        "message": "Please enter a valid email address"
      }
    },
    {
      "name": "name",
      "label": "Full Name",
      "type": "text",
      "required": true
    },
    {
      "name": "role",
      "label": "Role",
      "type": "select",
      "required": true,
      "options": [
        { "label": "Admin", "value": "admin" },
        { "label": "User", "value": "user" }
      ]
    }
  ],
  "submitLabel": "Create User",
  "mode": "create"
}
```

#### Example 2: User Table

**File:** `apps/ui/src/schemas/example-user-table.json`

```json
{
  "type": "table",
  "title": "Users",
  "table": "users",
  "columns": [
    {
      "name": "email",
      "label": "Email",
      "type": "email",
      "sortable": true,
      "filterable": true
    },
    {
      "name": "name",
      "label": "Name",
      "type": "text",
      "sortable": true
    },
    {
      "name": "role",
      "label": "Role",
      "type": "text",
      "render": "badge"
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
  },
  "filters": {
    "enabled": true,
    "fields": ["email", "name", "role"]
  }
}
```

#### Using Schemas in Your Pages

```tsx
import { HeadlessForm } from '../components/HeadlessForm';
import formSchema from '../schemas/example-user-form.json';

export const CreateUserPage = () => {
  return (
    <HeadlessForm
      schema={formSchema}
      onSubmit={(data) => {
        console.log('User created:', data);
        // Navigate or show success message
      }}
    />
  );
};
```

## Visual Query Builder

**Location:** `apps/ui/src/pages/VisualQueryBuilder.tsx`

An interactive interface for building SQL queries by visually mapping table relationships.

### Features

1. **Table Selection**
   - Browse available tables in sidebar
   - Add tables to canvas
   - View table columns and types

2. **Relationship Drawing**
   - Drag and drop columns to create relationships
   - Choose join type (INNER, LEFT, RIGHT, FULL)
   - Visual representation of relationships

3. **AI SQL Generation**
   - Automatically generates SQL from visual mappings
   - Validates SQL for safety
   - Preview generated query

4. **Query Execution**
   - Execute generated SQL with user approval
   - View results in data table
   - Export results

### Usage Flow

1. **Add Tables:** Click tables from sidebar to add to canvas
2. **Create Relationships:** Drag columns from one table to another
3. **Generate SQL:** Click "Generate SQL with AI" button
4. **Review SQL:** Check the generated query
5. **Execute:** Click "Execute Query" to run
6. **View Results:** See results in the results panel

### Example Workflow

```
1. Add "orders" table to canvas
2. Add "users" table to canvas
3. Drag orders.user_id to users.id
4. Select INNER JOIN relationship type
5. Click "Generate SQL with AI"
6. Review generated SQL:
   SELECT orders.*, users.*
   FROM orders
   INNER JOIN users ON orders.user_id = users.id
7. Click "Execute Query"
8. View joined results
```

## Adding New Pages

### Step 1: Create JSON Schema

Create a new JSON file in `apps/ui/src/schemas/`:

```bash
apps/ui/src/schemas/my-new-page.json
```

### Step 2: Define Schema

```json
{
  "type": "form",  // or "table" or "detail"
  "title": "My New Page",
  "table": "my_table",
  "fields": [...]  // or "columns" for table
}
```

### Step 3: Create Page Component

```tsx
// apps/ui/src/pages/MyNewPage.tsx
import { HeadlessForm } from '../components/HeadlessForm';
import schema from '../schemas/my-new-page.json';

export const MyNewPage = () => {
  return <HeadlessForm schema={schema} />;
};
```

### Step 4: Add Route

Add to your router configuration:

```tsx
<Route path="/my-new-page" element={<MyNewPage />} />
```

## Best Practices

### 1. Schema Design

- Keep schemas focused and single-purpose
- Use descriptive field names and labels
- Provide helpful descriptions and placeholders
- Define appropriate validation rules
- Use correct field types for data

### 2. Component Usage

- Always validate schemas before use
- Handle loading and error states
- Provide user feedback for actions
- Implement proper error handling
- Use TypeScript for type safety

### 3. Security

- SQL queries are validated before execution
- Only SELECT queries are allowed through visual builder
- Dangerous keywords (DROP, DELETE, etc.) are blocked
- User approval required for SQL execution
- Parameterized queries for user input

### 4. Performance

- Use pagination for large datasets
- Implement filtering on the server side
- Cache schema definitions
- Lazy load table data
- Optimize SQL queries

## Migration from Direct Database Access

To migrate existing pages to use Basetool:

1. **Replace Direct Queries:**
   ```tsx
   // Before
   const data = await prisma.user.findMany();
   
   // After
   const data = await trpc.basetool.getTableData.useQuery({
     tableName: 'users'
   });
   ```

2. **Create JSON Schema:**
   - Extract UI structure into JSON schema
   - Define fields, columns, validation

3. **Replace Components:**
   - Use HeadlessForm instead of custom forms
   - Use HeadlessTable instead of custom tables

4. **Update Business Logic:**
   - Move to tRPC endpoints
   - Use Basetool service for data operations

## Troubleshooting

### Issue: "Failed to fetch table schemas"
- Check BASETOOL_API_URL is correct
- Verify BASETOOL_API_KEY is valid
- Ensure Basetool instance is running
- Check network connectivity

### Issue: "Invalid SQL query"
- Review generated SQL in visual builder
- Check for syntax errors
- Ensure tables and columns exist
- Verify relationship mappings

### Issue: "Schema validation failed"
- Check JSON schema structure
- Ensure required fields are present
- Validate field types match schema types
- Use `validatePageSchema()` utility

## Future Enhancements

- [ ] Visual query builder with canvas lines
- [ ] LLM integration for natural language SQL
- [ ] Schema versioning and migration
- [ ] Real-time data updates
- [ ] Export/import page definitions
- [ ] Schema templates library
- [ ] Advanced filtering UI
- [ ] Batch operations
- [ ] Audit logging

## Support

For issues or questions:
1. Check this documentation
2. Review example schemas in `apps/ui/src/schemas/`
3. Check console for error messages
4. Review tRPC endpoints in API router

## License

See main project LICENSE file.
