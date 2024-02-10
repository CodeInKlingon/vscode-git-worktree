import * as vscode from 'vscode';
import * as fs from 'fs';
import { join as join_path } from 'path';

import { simpleGit } from 'simple-git';
import path = require('node:path');

export class WorktreeProvider implements vscode.TreeDataProvider<Worktree> {

    _rootPath: string | undefined = undefined;

    public worktrees: Worktree[];
    private _onDidChangeTreeData: vscode.EventEmitter<Worktree | undefined | void> = new vscode.EventEmitter<Worktree | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<Worktree | undefined | void> = this._onDidChangeTreeData.event;

    public get workspaceRoot() {
        return (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0)) ? vscode.workspace.workspaceFolders[0].uri.fsPath : this._rootPath;
    }

    public set workspaceRoot(path) {
        this._rootPath = path;
    }

    constructor() {
        this.worktrees = [];
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    async forceRemove(args: any) {
        const pick = await vscode.window.showQuickPick(
            [
                { label: "Are you sure you want to force remove this worktree?", id: 0 },
                { label: "Cancel", id: 1 }
            ],
            {
                title: "Force remove worktree",

            }
        );

        if (pick && pick.id === 0) {
            this.removeWorktree(args, true);
        }
    }

    async removeWorktree(args: any, force = false) {
        console.log(args);
        const commands = [
            'worktree',
            'remove',
            ...(force ? ["-f"] : []),
            args.path
        ];
        const gitPath = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : "./";
        try {
            await simpleGit(gitPath).raw(...commands);
        } catch (error: any) {
            vscode.window.showInformationMessage(error.message);
        }

        this.refresh();
    }

    async create() {

        this.refresh();

        const pick = await vscode.window.showQuickPick(
            [{ label: "Select the parent folder for the new worktree", id: 0 }, { label: "Cancel", id: 1 }],
            {
                title: "Create a new worktree",
            }
        );

        if (pick?.id === 1) { return; }

        //select path
        let fileUri = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: 'Select parent path for new worktree',
            canSelectFiles: false,
            canSelectFolders: true
        });
        if (!fileUri) { return; }

        vscode.window.showInformationMessage('Selected parent folder: ' + fileUri[0].fsPath);

        const folderName = await vscode.window.showInputBox({
            title: "Enter the folder name you would like for this worktree"
        });

        if (!folderName || folderName === "") { return; }

        vscode.window.showInformationMessage('Entered folder name: ' + folderName);

        const branches = await this.getBranches();
        const remoteBranches = await this.getBranches(true);

        const filteredBranches = branches.all.filter((e: string, i) => !this.worktrees.some(w => w.branch === e));
        const filteredRemoteBranches = remoteBranches.all.filter((e: string, i) => !this.worktrees.some(w => w.branch === e.replace('origin/', '')));

        const availableBranchesQuickPickItems = [
            ...filteredBranches.map((e) => { return { label: "$(source-control) " + e, id: 0 }; }),
            ...filteredRemoteBranches.map((e) => { return { label: "$(cloud) " + e, id: 1 }; }),
        ];

        let newBranch = false;
        let remoteBranch = false;
        //select branch
        const branch = await vscode.window.showQuickPick([
            { label: "$(plus) Create New Branch", id: -1 },
            ...(availableBranchesQuickPickItems.length > 0 ? [{ label: "Available Branches", kind: vscode.QuickPickItemKind.Separator, id: "0" }] : []),
            ...availableBranchesQuickPickItems
        ], {
            title: "Select the branch to initialize this worktree with"
        });

        //user selected cancel
        if (!branch) { return; }

        //user wants to specify a new branch
        if (branch.id === -1) {
            const branchName = await vscode.window.showInputBox({
                title: "Enter the name for the new branch",
                validateInput: text => {
                    let branchNameRegex = /^(?!\.| |-|\/)((?!\.\.)(?!.*\/\.)(\/\*|\/\*\/)*(?!@\{)[^\~\:\^\\\ \?*\[])+(?<!\.|\/)(?<!\.lock)$/;
                    if (!branchNameRegex.test(text)) {
                        return "Not a valid branch name";
                    } else if (branches.all.includes(text)) {
                        return "A branch with this name already exists";
                    }
                    return null; // return null if validates
                }
            });

            if (!branchName) { return; }
            newBranch = true;

            branch.label = branchName;
        } else {

            if (branch.id === 1) {

                remoteBranch = true;
                branch.label = branch.label.split(" ")[1].replace('origin/', '');


            } else {
                branch.label = branch.label.split(" ")[1];
            }
        }

        vscode.window.showInformationMessage('Selected branch: ' + branch.label);

        const pathForBranch = path.join(fileUri[0].fsPath, folderName);

        const commands = [
            'worktree',
            'add',
            pathForBranch,
            ...(newBranch || remoteBranch ? ["-b"] : []),
            branch.label,
            ...(remoteBranch ? ['origin/' + branch.label] : [])
        ];

        vscode.window.showInformationMessage('Running git command ' + commands.join(" "));

        let e = await simpleGit(this.workspaceRoot).raw(...commands);
        vscode.window.showInformationMessage(e);

        this.refresh();

    }

    getTreeItem(element: Worktree): vscode.TreeItem {
        return element;
    }

    getChildren(element?: Worktree): Thenable<Worktree[]> {
        if (!this.workspaceRoot) {
            return Promise.resolve([]);
        }

        return Promise.resolve(this.getWoktrees(this.workspaceRoot));

    }

    async getBranches(remote = false) {
        let options = ["-l"];
        if (remote) {
            options = ["-l", "-r"];
        }
        return simpleGit(this.workspaceRoot).branch(options);
    }


    private async getWoktrees(path: string): Promise<Worktree[]> {
        const commands = ['worktree', 'list'];
        const e = await simpleGit(path).raw(...commands);

        const worktrees: Worktree[] = [];
        const lines = e.split("\n");

        lines.forEach(element => {
            const line = element.trim().split(/\s+/);
            // console.log(Object.values(line))

            if (Object.values(line).length === 1 || line.at(1) === '(bare)') { return; }

            if (!fs.existsSync(join_path(line[0], ".git"))) { return; }

            const openCommand: vscode.Command = {
                title: "open",
                command: "git-worktree-menu.open-worktree",
                arguments: [line[0]]
            };

            worktrees.push(
                new Worktree(
                    line[2].slice(1, -1),
                    line[0],
                    line[1],
                    vscode.TreeItemCollapsibleState.None,
                    openCommand
                )
            );
        });

        this.worktrees = worktrees;

        return worktrees;

    }

}

export class Worktree extends vscode.TreeItem {

    constructor(
        public branch: string,
        // public readonly label: string,
        public path: string,
        id: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command,
    ) {
        super(branch, collapsibleState);
        this.branch = branch;

        const currentPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0)) ? vscode.workspace.workspaceFolders[0].uri.path : "";

        const isThisWorktreeOpen = this.path.substring(this.path.indexOf(":") + 1) === currentPath.substring(currentPath.indexOf(":") + 1);

        if (isThisWorktreeOpen) {
            this.contextValue = "current-worktree";
            this.iconPath = new vscode.ThemeIcon("check");
        } else {
            this.contextValue = "other-worktree";
            this.iconPath = new vscode.ThemeIcon("git-branch");

        }
        this.tooltip = `Click to switch this window to this worktree`;
        this.description = this.path;
    }

    contextValue = 'worktree';
}