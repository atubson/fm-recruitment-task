import { mkdirSync, readdirSync, rmSync } from 'fs';
import { resolve } from 'path';

export function getUploadTempDir(): string {
    return resolve(process.cwd(), process.env.UPLOAD_TMP_DIR ?? './tmp/e2e-uploads');
}

export function ensureUploadTempDir(): void {
    mkdirSync(getUploadTempDir(), { recursive: true });
}

export function cleanUploadTempDir(): void {
    const uploadDir = getUploadTempDir();
    mkdirSync(uploadDir, { recursive: true });

    for (const entry of readdirSync(uploadDir, { withFileTypes: true })) {
        rmSync(resolve(uploadDir, entry.name), { recursive: true, force: true });
    }
}
