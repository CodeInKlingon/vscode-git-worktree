import * as fs from 'fs';
import { join as join_path, dirname } from 'path';

function copyDir(src: string, dst: string) {
    if (!fs.existsSync(dst)) {
        fs.mkdirSync(dst, { recursive: true });
    }

    const files = fs.readdirSync(src);

    for (let i = 0; i < files.length; i++) {
        const filename = join_path(src, files[i]);
        const stat = fs.lstatSync(filename);

        if (stat.isDirectory()) {
            copyDir(filename, join_path(dst, files[i]));
        } else {
            fs.copyFileSync(filename, join_path(dst, files[i]));
        }
    }
}

export function copyPath(src: string, dst: string) {
    if (!fs.existsSync(src)) {
        return;
    }

    const destDir = dirname(dst);
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }

    const stat = fs.lstatSync(src);

    if (stat.isDirectory()) {
        copyDir(src, dst);
    } else {
        fs.copyFileSync(src, dst);
    }
}