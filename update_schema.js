const fs = require('fs');

let schema = fs.readFileSync('apps/api/prisma/schema.prisma', 'utf8');

if (!schema.includes('enum ProjectType')) {
  schema += `

enum ProjectType {
  CODE
  WRITE
  RESEARCH
  DEPLOY
}
`;
}

if (!schema.includes('projectType  ProjectType')) {
  schema = schema.replace(
    /model Workspace \{[\s\S]*?\n\}/,
    (match) => {
      let updated = match.replace(
        '  rootPath     String',
        `  rootPath     String
  projectType  ProjectType @default(CODE)
  defaultModelId String?
  targetPlatform String?`
      );
      return updated;
    }
  );
}

fs.writeFileSync('apps/api/prisma/schema.prisma', schema);
console.log('Schema updated successfully');
