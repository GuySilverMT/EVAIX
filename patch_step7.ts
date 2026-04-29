import * as fs from 'fs';

const filePath = 'apps/api/src/services/AssessmentService.ts';
let code = fs.readFileSync(filePath, 'utf-8');

const shadowAssessment = `
    /**
     * Grades shadow assessments for rookie models without using an LLM.
     */
    async gradeShadowAssessment(modelId: string, cleanOutput: string, auditData: string | null) {
        let score = 0;

        // 1. Audit Data JSON Check
        if (!auditData) {
            score = 0;
        } else {
            try {
                JSON.parse(auditData);
                score = 100; // Passed JSON parse
            } catch (e) {
                score = 0;
            }
        }

        // 2. Code Block Syntax Check
        if (score > 0) {
            const { LanguageServerService } = await import("./LanguageServerService.js");
            const lsp = new LanguageServerService();
            const codeBlockRegex = /\`\`\`(?:[a-zA-Z0-9]+)?\\s*\\n?([\\s\\S]*?)\`\`\`/g;
            let match;
            const blocks = [];
            while ((match = codeBlockRegex.exec(cleanOutput)) !== null) {
                if (match[1].trim()) blocks.push(match[1].trim());
            }

            if (blocks.length > 0) {
                const combinedCode = blocks.join('\\n\\n');
                const validation = await lsp.validateTypeScript(combinedCode);
                if (!validation.isValid) {
                    score = 0;
                }
            } else {
                // If no code blocks but it was a code task, we might score 0, but for simplicity we keep 100 if parse passed
            }
        }

        // 3. Moving Average Logic & State Update
        const model = await prisma.model.findUnique({ where: { id: modelId } });
        if (model) {
            const oldScore = model.shadowScore || 0;
            const oldTrials = model.trialsCode || 0;

            const newScore = ((oldScore * oldTrials) + score) / (oldTrials + 1);
            const newTrials = oldTrials + 1;

            let isCalibrated = model.isCalibrated;
            if (newTrials >= 5) {
                isCalibrated = true;
            }

            let isActive = model.isActive;
            // Expulsion Rule
            if (isCalibrated && model.providerId !== 'FREE_UNLIMITED' && newScore < 80) {
                isActive = false;
            }

            await prisma.model.update({
                where: { id: modelId },
                data: {
                    shadowScore: newScore,
                    trialsCode: newTrials,
                    isCalibrated,
                    isActive
                }
            });
        }
    }
`;

if (!code.includes('gradeShadowAssessment')) {
    code = code.replace(/}\s*$/, shadowAssessment + '\n}\n');
    fs.writeFileSync(filePath, code);
    console.log('Patched AssessmentService.ts');
} else {
    console.log('gradeShadowAssessment already exists');
}
