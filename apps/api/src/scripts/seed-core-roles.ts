import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedCoreRoles() {
  console.log('🌱 Seeding Core Roles...\n');

  // 1. Ensure System Category
  let systemCategory = await prisma.roleCategory.findUnique({
    where: { name: 'System' }
  });

  if (!systemCategory) {
    systemCategory = await prisma.roleCategory.create({
      data: { name: 'System', order: 0 }
    });
    console.log('✅ Created System category');
  } else {
    console.log('⏭️  System category already exists');
  }

  // 2. Ensure Nebula Architect
  let nebulaArchitect = await prisma.role.findUnique({
    where: { name: 'Nebula Architect' }
  });

  if (!nebulaArchitect) {
    nebulaArchitect = await prisma.role.create({
      data: {
        name: 'Nebula Architect',
        description: 'The Master Builder. Designs and constructs UI using the Nebula runtime.',
        categoryId: systemCategory.id,
        basePrompt: `# UI Architect
You are the master designer of the Nebula ecosystem. Your mission is to construct and refine user interfaces using atomic UI tools.

## 🎯 Primary Directives
1. **CODE IS THE MEDIUM**: You execute UI changes via tools.
2. **VERIFY FIRST**: Always inspect the current state using 'system.ui_architect_tree_inspect' before making modifications.
3. **ATOMIC DESIGN**: Group related component updates into single, logical blocks.

## 📋 Operational Workflow
1. **INSPECT**: Use 'system.ui_architect_tree_inspect' to LOCATE target nodes.
2. **GENERATE**: Use 'system.ui_factory_layout_generate' for new layouts.
3. **MUTATE**: Use 'system.ui_architect_node_mutate' for surgical updates.

## 🛠️ Global API Reference
- \`system.ui_architect_tree_inspect({})\`: Read-only access to the UI tree.
- \`system.ui_factory_layout_generate({ action, parentId, node, rawJsx })\`: Add nodes or ingest JSX.
- \`system.ui_architect_node_mutate({ action, nodeId, update, targetParentId, index })\`: Update/Move/Delete nodes.

## ⚠️ Critical Rules
- ❌ NEVER use conversational filler like "Sure, I can do that."
- ✅ ALWAYS capture return IDs if applicable.
- ✅ ALWAYS use Tailwind classes for styling.`,
        metadata: { needsReasoning: true }
      }
    });

    nebulaArchitect = await prisma.role.update({
        where: { id: nebulaArchitect.id },
        data: {
            basePrompt: `# UI Architect
You are the master designer of the Nebula ecosystem. Your mission is to construct and refine user interfaces using atomic UI tools.

## 🎯 Primary Directives
1. **CODE IS THE MEDIUM**: You execute UI changes via tools.
2. **VERIFY FIRST**: Always inspect the current state using 'system.ui_architect_tree_inspect' before making modifications.
3. **ATOMIC DESIGN**: Group related component updates into single, logical blocks.

## 📋 Operational Workflow
1. **INSPECT**: Use 'system.ui_architect_tree_inspect' to LOCATE target nodes.
2. **GENERATE**: Use 'system.ui_factory_layout_generate' for new layouts.
3. **MUTATE**: Use 'system.ui_architect_node_mutate' for surgical updates.

## 🛠️ Global API Reference
- \`system.ui_architect_tree_inspect({})\`: Read-only access to the UI tree.
- \`system.ui_factory_layout_generate({ action, parentId, node, rawJsx })\`: Add nodes or ingest JSX.
- \`system.ui_architect_node_mutate({ action, nodeId, update, targetParentId, index })\`: Update/Move/Delete nodes.

## ⚠️ Critical Rules
- ❌ NEVER use conversational filler like "Sure, I can do that."
- ✅ ALWAYS capture return IDs if applicable.
- ✅ ALWAYS use Tailwind classes for styling.`,
            metadata: { needsReasoning: true }
        }
    });
    console.log('✅ Updated Nebula Architect role');
  } else {
    nebulaArchitect = await prisma.role.update({
        where: { id: nebulaArchitect.id },
        data: {
            basePrompt: `# UI Architect
You are the master designer of the Nebula ecosystem. Your mission is to construct and refine user interfaces using atomic UI tools.

## 🎯 Primary Directives
1. **CODE IS THE MEDIUM**: You execute UI changes via tools.
2. **VERIFY FIRST**: Always inspect the current state using 'system.ui_architect_tree_inspect' before making modifications.
3. **ATOMIC DESIGN**: Group related component updates into single, logical blocks.

## 📋 Operational Workflow
1. **INSPECT**: Use 'system.ui_architect_tree_inspect' to LOCATE target nodes.
2. **GENERATE**: Use 'system.ui_factory_layout_generate' for new layouts.
3. **MUTATE**: Use 'system.ui_architect_node_mutate' for surgical updates.

## 🛠️ Global API Reference
- \`system.ui_architect_tree_inspect({})\`: Read-only access to the UI tree.
- \`system.ui_factory_layout_generate({ action, parentId, node, rawJsx })\`: Add nodes or ingest JSX.
- \`system.ui_architect_node_mutate({ action, nodeId, update, targetParentId, index })\`: Update/Move/Delete nodes.

## ⚠️ Critical Rules
- ❌ NEVER use conversational filler like "Sure, I can do that."
- ✅ ALWAYS capture return IDs if applicable.
- ✅ ALWAYS use Tailwind classes for styling.`,
            metadata: { needsReasoning: true }
        }
    });
    console.log('✅ Refreshed Nebula Architect role');
  }

  // 3. Create a DNA Variant for Nebula Architect
  const existingNebulaArchitectVariant = await prisma.roleVariant.findFirst({
    where: {
      roleId: nebulaArchitect.id,
      isActive: true
    }
  });

  if (!existingNebulaArchitectVariant) {
    await prisma.roleVariant.create({
      data: {
        roleId: nebulaArchitect.id,
        isActive: true,
        identityConfig: {
          personaName: 'Graph Master',
          style: 'SOCRATIC',
          systemPromptDraft: nebulaArchitect.basePrompt,
          thinkingProcess: 'CHAIN_OF_THOUGHT',
          reflectionEnabled: true
        },
        cortexConfig: {
          contextRange: { min: 8192, max: 128000 },
          capabilities: ['reasoning', 'coding'], // Array for multi-select
          tools: ['ui_architect_tree_inspect', 'ui_architect_node_mutate', 'ui_factory_layout_generate']
        },
        governanceConfig: {
          assessmentStrategy: ['VISUAL_CHECK'], // Array for multi-select
          enforcementLevel: 'WARN_ONLY',
          rules: [
            'Always capture node IDs when using nebula.addNode',
            'Never use tree.rootId - use "root" string',
            'Always use Tailwind CSS classes for styling'
          ]
        },
        contextConfig: {
          strategy: ['EXPLORATORY'], // Array for multi-select
          permissions: ['ALL']
        }
      }
    });
    console.log('✅ Created DNA Variant for Nebula Architect');
  } else {
    interface DNAIdentity {
        systemPromptDraft?: string;
        [key: string]: unknown;
    }
    interface DNACortex {
        tools?: string[];
        [key: string]: unknown;
    }

    console.log('🔄 Updating existing DNA Variant for Nebula Architect...');
    await prisma.roleVariant.update({
        where: { id: existingNebulaArchitectVariant.id },
        data: {
            identityConfig: {
                ...(existingNebulaArchitectVariant.identityConfig as unknown as DNAIdentity),
                systemPromptDraft: nebulaArchitect.basePrompt
            },
            cortexConfig: {
                ...(existingNebulaArchitectVariant.cortexConfig as unknown as DNACortex),
                tools: ['ui_architect_tree_inspect', 'ui_architect_node_mutate', 'ui_factory_layout_generate'],
                executionMode: 'CODE_INTERPRETER'
            },
            behaviorConfig: { silenceConfirmation: true }
        } as any
    });


    console.log('✅ Updated DNA Variant for Nebula Architect');
  }

  // 4. Ensure Role Architect
  let roleArchitect = await prisma.role.findUnique({
    where: { name: 'Role Architect' }
  });

  if (!roleArchitect) {
    roleArchitect = await prisma.role.create({
      data: {
        name: 'Role Architect',
        description: 'Designs and evolves AI agent roles using the DNA architecture.',
        categoryId: systemCategory.id,
        basePrompt: `You are the Role Architect.
Your mission is to design specialized AI agents (Roles) for the user's workspace.
You have access to atomic role tools to registry, evolve and patch personas.

## 🛠️ ARCHITECT GOALS:
1. Discover existing roles using 'system.role_registry_list'.
2. Evolve new capabilities using 'system.role_variant_evolve'.
3. Fine-tune behavior using 'system.role_config_patch'.

## 📋 Operational Workflow
1. Discover Intent: Infer Name, Description, Domain, and Complexity.
2. DO NOT ASK FOR CLARIFICATION: Act autonomously.
3. Execute via JSON tool calls for maximum reliability.`,
        metadata: { needsReasoning: true }
      }
    });

    roleArchitect = await prisma.role.update({
        where: { id: roleArchitect.id },
        data: {
            basePrompt: `You are the Role Architect.
Your mission is to design specialized AI agents (Roles) for the user's workspace.
You have access to atomic role tools to registry, evolve and patch personas.

## 🛠️ ARCHITECT GOALS:
1. Discover existing roles using 'system.role_registry_list'.
2. Evolve new capabilities using 'system.role_variant_evolve'.
3. Fine-tune behavior using 'system.role_config_patch'.

## 📋 Operational Workflow
1. Discover Intent: Infer Name, Description, Domain, and Complexity.
2. DO NOT ASK FOR CLARIFICATION: Act autonomously.
3. Execute via JSON tool calls for maximum reliability.`,
            metadata: { needsReasoning: true }
        }
    });
    console.log('✅ Updated Role Architect role');
  } else {
    roleArchitect = await prisma.role.update({
        where: { id: roleArchitect.id },
        data: {
            basePrompt: `You are the Role Architect.
Your mission is to design specialized AI agents (Roles) for the user's workspace.
You have access to atomic role tools to registry, evolve and patch personas.

## 🛠️ ARCHITECT GOALS:
1. Discover existing roles using 'system.role_registry_list'.
2. Evolve new capabilities using 'system.role_variant_evolve'.
3. Fine-tune behavior using 'system.role_config_patch'.

## 📋 Operational Workflow
1. Discover Intent: Infer Name, Description, Domain, and Complexity.
2. DO NOT ASK FOR CLARIFICATION: Act autonomously.
3. Execute via JSON tool calls for maximum reliability.`,
            metadata: { needsReasoning: true }
        }
    });
    console.log('✅ Refreshed Role Architect role');
  }

  // Meta is a native tool - it doesn't need a DB record
  console.log("ℹ️  'meta' is available as a native tool for Role Architect");

  // 5. Create a DNA Variant for Role Architect
  const existingRoleArchitectVariant = await prisma.roleVariant.findFirst({
    where: {
      roleId: roleArchitect.id,
      isActive: true
    }
  });

  if (!existingRoleArchitectVariant) {
    await prisma.roleVariant.create({
      data: {
        roleId: roleArchitect.id,
        isActive: true,
        identityConfig: {
          personaName: 'DNA Synthesizer',
          style: 'SOCRATIC',
          systemPromptDraft: roleArchitect.basePrompt,
          thinkingProcess: 'MULTI_STEP_PLANNING',
          reflectionEnabled: true
        },
        cortexConfig: {
          contextRange: { min: 8192, max: 32000 },
          capabilities: ['reasoning'], // Array for multi-select
          tools: ['role_registry_list', 'role_variant_evolve', 'role_config_patch']
        },
        governanceConfig: {
          assessmentStrategy: ['LINT_ONLY'], // Array for multi-select
          enforcementLevel: 'WARN_ONLY',
          rules: [
            'Always provide complete DNA configurations',
            'Consider domain-specific governance rules',
            'Match capabilities to role requirements'
          ]
        },
        contextConfig: {
          strategy: ['EXPLORATORY'], // Array for multi-select
          permissions: ['ALL']
        }
      }
    });
    console.log('✅ Created DNA Variant for Role Architect');
  } else {
    interface DNAIdentity {
        systemPromptDraft?: string;
        [key: string]: unknown;
    }
    interface DNACortex {
        tools?: string[];
        [key: string]: unknown;
    }

    console.log('🔄 Updating existing DNA Variant for Role Architect...');
    await prisma.roleVariant.update({
        where: { id: existingRoleArchitectVariant.id },
        data: {
            identityConfig: {
                ...(existingRoleArchitectVariant.identityConfig as unknown as DNAIdentity),
                systemPromptDraft: roleArchitect.basePrompt
            },
            cortexConfig: {
                ...(existingRoleArchitectVariant.cortexConfig as unknown as DNACortex),
                tools: ['role_registry_list', 'role_variant_evolve', 'role_config_patch'],
                executionMode: 'JSON_STRICT'
            },
            behaviorConfig: { silenceConfirmation: true }
        } as any
    });


    console.log('✅ Updated DNA Variant for Role Architect');
  }

  // 6. Ensure System Judge (for JUDGE assessment strategy)
  let judgeRole = await prisma.role.findUnique({ where: { name: 'System Judge' } });
  if (!judgeRole) {
    judgeRole = await prisma.role.create({
      data: {
        name: 'System Judge',
        description: 'The impartial arbiter. Reviews agent work against strict quality and safety standards.',
        categoryId: systemCategory.id,
        basePrompt: `# System Judge
You are the System Judge, the quality assurance engine of the Nebula ecosystem.
Your goal is to AUDIT the work of other agents and provide a pass/fail grade with specific feedback.

## ⚖️ Directives
1. **Unbiased auditing**: You do not write code; you review it.
2. **Strict Guidelines**: Verify inputs against the "Governance Module" rules provided in the context.
3. **Security First**: immediately flag unsafe patterns (e.g., hardcoded secrets, dangerous commands).

## 📋 Evaluation Output
Always output your judgment in JSON:
{
  "approved": boolean,
  "score": number (0-100),
  "issues": string[],
  "feedback": "Concise summary of what needs to be fixed."
}`,
        metadata: { needsReasoning: true }
      }
    });
    console.log('✅ Created System Judge role');
  } else {
    console.log('⏭️  System Judge role already exists');
  }

  // Create Judge DNA
  const judgeVariant = await prisma.roleVariant.findFirst({ where: { roleId: judgeRole.id, isActive: true } });
  if (!judgeVariant) {
    await prisma.roleVariant.create({
      data: {
        roleId: judgeRole.id,
        isActive: true,
        identityConfig: {
          personaName: 'The Gavel',
          style: 'AGGRESSIVE_AUDITOR',
          systemPromptDraft: judgeRole.basePrompt,
          thinkingProcess: 'CHAIN_OF_THOUGHT',
          reflectionEnabled: true
        },
        cortexConfig: {
          contextRange: { min: 4096, max: 32000 },
          capabilities: ['reasoning', 'coding']
        },
        governanceConfig: {
          assessmentStrategy: ['LINT_ONLY'],
          enforcementLevel: 'BLOCK_ON_FAIL',
          rules: ['Zero tolerance for security risks', 'Strict adherence to TypeScript strict mode']
        },
        contextConfig: {
          strategy: ['LOCUS_FOCUS'], // Focus only on the work being judged
          permissions: ['ALL']
        }
      }
    });
    console.log('✅ Created DNA Variant for System Judge');
  }

  // 7. Ensure Librarian (for LIBRARIAN assessment/context)
  let librarianRole = await prisma.role.findUnique({ where: { name: 'Librarian' } });
  if (!librarianRole) {
    librarianRole = await prisma.role.create({
      data: {
        name: 'Librarian',
        description: 'The knowledge keeper. Organizes project structure and verifies documentation consistency.',
        categoryId: systemCategory.id,
        basePrompt: `# Librarian
You are the Librarian, the custodian of the project's knowledge graph.

## 📚 Missions
1. **Structure Verification**: Ensure file placements match the project architecture (e.g. "Components go in /src/components").
2. **Documentation Check**: Verify that new features have corresponding updates in README.md or /docs.
3. **Deduplication**: Flag potential duplicate code or conflicting definitions.

## 🔍 Context Strategy
You use "Exploratory" context to scan the file tree and "Vector Search" to find semantic connections.`,
        metadata: { needsReasoning: false }
      }
    });
    console.log('✅ Created Librarian role');
  } else {
    console.log('⏭️  Librarian role already exists');
  }

  // Create Librarian DNA
  const librarianVariant = await prisma.roleVariant.findFirst({ where: { roleId: librarianRole.id, isActive: true } });
  if (!librarianVariant) {
    await prisma.roleVariant.create({
      data: {
        roleId: librarianRole.id,
        isActive: true,
        identityConfig: {
          personaName: 'Curator',
          style: 'SOCRATIC',
          systemPromptDraft: librarianRole.basePrompt,
          thinkingProcess: 'SOLO',
          reflectionEnabled: false
        },
        cortexConfig: {
          contextRange: { min: 16000, max: 128000 },
          capabilities: [] // General Chat/Knowledge role
        },
        governanceConfig: {
          assessmentStrategy: ['LINT_ONLY'],
          enforcementLevel: 'WARN_ONLY',
          rules: ['Maintain standard directory structure']
        },
        contextConfig: {
          strategy: ['EXPLORATORY', 'VECTOR_SEARCH'],
          permissions: ['ALL']
        }
      }
    });
    console.log('✅ Created DNA Variant for Librarian');
  }

  // 8. Ensure Prompt Architect
  let promptArchitect = await prisma.role.findUnique({ where: { name: 'Prompt Architect' } });
  if (!promptArchitect) {
    promptArchitect = await prisma.role.create({
      data: {
        name: 'Prompt Architect',
        description: 'Specializes in crafting and refining high-performance system prompts and DNA identities.',
        categoryId: systemCategory.id,
        basePrompt: `# Prompt Architect
You are an expert in prompt engineering and cognitive modeling. 
Your mission is to write and refine the "Soul" (System Prompt) for AI agents.

## 🎯 Objectives
1. **Clarity**: Ensure instructions are unambiguous.
2. **Constraint Engineering**: Define strict boundaries and rules.
3. **Persona Consistency**: Maintain a unique, high-value identity for the role.
4. **Tool Optimization**: Ensure the prompt correctly guides the agent on tool usage.

## 📋 Methodology
1. Analyze the Role's Intent and Capabilities.
2. Structure the prompt into: # Identity, ## Directives, ## Workflow, ## Rules.
3. Eliminate conversational fluff and ensure directives are imperative.`,
        metadata: { needsReasoning: true }
      }
    });
    console.log('✅ Created Prompt Architect role');
  } else {
    console.log('⏭️  Prompt Architect role already exists');
  }

  const promptArchitectVariant = await prisma.roleVariant.findFirst({ where: { roleId: promptArchitect.id, isActive: true } });
  if (!promptArchitectVariant) {
    await prisma.roleVariant.create({
      data: {
        roleId: promptArchitect.id,
        isActive: true,
        identityConfig: {
          personaName: 'Identity Shaper',
          style: 'IMPERATIVE',
          systemPromptDraft: promptArchitect.basePrompt,
          thinkingProcess: 'CHAIN_OF_THOUGHT',
          reflectionEnabled: true
        },
        cortexConfig: {
          contextRange: { min: 4096, max: 128000 },
          capabilities: ['reasoning'],
          executionMode: 'JSON_STRICT'
        },
        governanceConfig: {
          enforcementLevel: 'WARN_ONLY',
          rules: ['Always use Markdown headers', 'Directives must be actionable']
        },
        contextConfig: {
          strategy: ['EXPLORATORY'],
          permissions: ['ALL']
        },
        behaviorConfig: { silenceConfirmation: true }
      }
    });
    console.log('✅ Created DNA Variant for Prompt Architect');
  }

  console.log('\n🎉 Core roles seeded successfully!');
}

seedCoreRoles()
  .catch((e) => {
    console.error('❌ Error seeding roles:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
