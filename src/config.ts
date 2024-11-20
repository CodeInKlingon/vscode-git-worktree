import * as vscode from 'vscode';
import { ConfigurationTarget } from 'vscode';

export namespace Config {
    export const EXTENSION_NAME = 'git-worktree-menu';

    export interface WorktreeDir {
        workspaceFolder: string | null,
        workspace: string | null,
        global: string | null
    }
    export const DEFAULT_WORKTREE_DIR: WorktreeDir = {
        workspaceFolder: null,
        workspace: null,
        global: null
    }

    export interface Global {
        copyPaths: string[],
        worktreeDir: WorktreeDir
    }
    export const DEFAULT_GLOBAL: Global = {
        copyPaths: ['.vscode'],
        worktreeDir: DEFAULT_WORKTREE_DIR
    }

    interface Package {
        copyPaths: string[],
        worktreeDir: string | null
    }

    export function read(): Global {
        const config = vscode.workspace.getConfiguration();
        const global = config.inspect<Package>(EXTENSION_NAME);
        if (global === undefined) {
            return DEFAULT_GLOBAL;
        }

        let result: Global = {
            copyPaths: [],
            worktreeDir: DEFAULT_WORKTREE_DIR
        };

        if (global.workspaceFolderValue !== undefined) {
            global.workspaceFolderValue.copyPaths?.forEach((path: string) => {
                result.copyPaths.push(path);
            });
            if (global.workspaceFolderValue.worktreeDir !== undefined) {
                result.worktreeDir.workspaceFolder = global.workspaceFolderValue.worktreeDir;
            }
        }

        if (global.workspaceValue !== undefined) {
            global.workspaceValue.copyPaths?.forEach((path: string) => {
                if (result.copyPaths.indexOf(path) == -1) {
                    result.copyPaths.push(path);
                }
            });
            if (global.workspaceValue.worktreeDir !== undefined) {
                result.worktreeDir.workspace = global.workspaceValue.worktreeDir;
            }
        }

        if (global.globalValue !== undefined) {
            if (result.copyPaths.length == 0) {
                global.globalValue.copyPaths?.forEach((path: string) => {
                    result.copyPaths.push(path);
                });
            }
            if (global.globalValue.worktreeDir !== undefined) {
                result.worktreeDir.global = global.globalValue.worktreeDir;
            }
        }

        return result;
    }
}