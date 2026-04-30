import * as fs from 'fs';

const filePath = 'apps/api/prisma/schema.prisma';
let code = fs.readFileSync(filePath, 'utf-8');

if (!code.includes('isCalibrated')) {
    // We add to model Model
    code = code.replace(/costPer1k\s+Float\?/, 'costPer1k          Float?\n  isCalibrated       Boolean          @default(false)\n  trialsCode         Int              @default(0)\n  shadowScore        Float            @default(0)');
    fs.writeFileSync(filePath, code);
    console.log('Patched schema.prisma');
}
