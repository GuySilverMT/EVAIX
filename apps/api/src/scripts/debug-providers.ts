
import { prisma } from '../db.js';
import dotenv from 'dotenv';
import path from 'path';

// Force load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debug() {
    console.log('🔍 DEBUG: Checking Provider Responses...');

    const providers = [
        { id: 'groq', url: 'https://api.groq.com/openai/v1/models', headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` } },
        { id: 'mistral', url: 'https://api.mistral.ai/v1/models', headers: { Authorization: `Bearer ${process.env.MISTRAL_API_KEY}` } },
        { id: 'openrouter', url: 'https://openrouter.ai/api/v1/models', headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` } }
    ];

    for (const p of providers) {
        console.log(`\n--- Testing ${p.id.toUpperCase()} ---`);
        console.log(`URL: ${p.url}`);
        console.log(`Key present: ${!!p.headers.Authorization.split(' ')[1]}`); // Don't log key

        try {
            const res = await fetch(p.url, { headers: { ...p.headers, 'Content-Type': 'application/json' } });
            console.log(`Status: ${res.status} ${res.statusText}`);
            const text = await res.text();
            try {
                const json = JSON.parse(text);
                const isArray = Array.isArray(json);
                const hasData = json.data && Array.isArray(json.data);
                const hasModels = json.models && Array.isArray(json.models);
                console.log(`Valid JSON? Yes.`);
                console.log(`Is Array? ${isArray}`);
                console.log(`Has .data? ${hasData} (Length: ${hasData ? json.data.length : 'N/A'})`);
                console.log(`Has .models? ${hasModels} (Length: ${hasModels ? json.models.length : 'N/A'})`);
                if (!hasData && !hasModels && !isArray) {
                    console.log('Raw Body Preview:', text.slice(0, 200));
                }
            } catch {
                console.log('Invalid JSON response:', text.slice(0, 200));
            }
        } catch (e) {
            console.error('Fetch error:', (e as Error).message);
        }
    }

    console.log('\n\n📊 DATABASE STATE:');
    const counts = await prisma.model.groupBy({
        by: ['providerId'],
        _count: { id: true }
    });
    console.table(counts.map(c => ({ provider: c.providerId, count: c._count.id })));
}

debug();
