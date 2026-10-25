import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const excluded = new Set(['node_modules', '.git', '.angular', 'dist', 'coverage', 'test-results', 'playwright-report', '.vercel']);
const signatures = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
    /\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
    /\bsk_(?:live|test)_[A-Za-z0-9]{20,}\b/,
    /https?:\/\/[^/\s:@]+:[^/\s@]+@/,
    /\b(?:192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/
];
const findings = [];
async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (excluded.has(entry.name)) continue;
        const file = path.join(directory, entry.name);
        if (entry.isSymbolicLink()) {
            findings.push({ file, reason: 'Symbolic link requires review' });
            continue;
        }
        if (entry.isDirectory()) {
            await walk(file);
            continue;
        }
        if (/^\.env(?:\.|$)/.test(entry.name) && entry.name !== '.env.example') {
            findings.push({ file, reason: 'Local environment file in publication tree' });
            continue;
        }
        if (/\.(pem|key|pfx|p12|sql|bak)$/i.test(entry.name)) {
            findings.push({ file, reason: 'Private key or data export requires review' });
            continue;
        }
        if (!/\.(ts|js|mjs|json|html|scss|css|md|svg|yml|yaml|txt|example)$/.test(entry.name)) continue;
        const content = await readFile(file, 'utf8');
        if (signatures.some((pattern) => pattern.test(content))) findings.push({ file, reason: 'Potential secret or internal endpoint' });
    }
}
await walk('.');
for (const finding of findings) console.error(finding.file + ': ' + finding.reason);
if (findings.length) process.exitCode = 1;
else console.log('Source scan passed: no configured secret/internal-network signatures or local data exports found.');
