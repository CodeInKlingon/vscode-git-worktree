import * as vscode from 'vscode';

export namespace Config {
    export const EXTENSION_NAME = 'git-worktree-menu';

    export interface Global {
        copyPaths: string[]
    }
    export const DEFAULT_GLOBAL: Global = {
        copyPaths: ['.vscode']
    }

    export function read(): Global {
        const config = vscode.workspace.getConfiguration();
        return config.get<Global>(EXTENSION_NAME, DEFAULT_GLOBAL);
    }
}