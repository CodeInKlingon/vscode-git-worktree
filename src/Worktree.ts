import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { simpleGit, SimpleGit, CleanOptions } from 'simple-git';

export class WorktreeProvider implements vscode.TreeDataProvider<Worktree> {

	private _onDidChangeTreeData: vscode.EventEmitter<Worktree | undefined | void> = new vscode.EventEmitter<Worktree | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<Worktree | undefined | void> = this._onDidChangeTreeData.event;

	constructor(private workspaceRoot: string | undefined) {
        vscode.window.showInformationMessage("construct worktree treedata provider");
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: Worktree): vscode.TreeItem {
		return element;
	}

	getChildren(element?: Worktree): Thenable<Worktree[]> {
		if (!this.workspaceRoot) {
			vscode.window.showInformationMessage('No dependency in empty workspace');
			return Promise.resolve([]);
		}

        return Promise.resolve(this.getWoktrees(this.workspaceRoot));

	}

	/**
	 * Given the path to package.json, read all its dependencies and devDependencies.
	 */
	private async getWoktrees(path: string): Promise<Worktree[]> {
		const commands = ['worktree', 'list'];
        let e = await simpleGit(path).raw(...commands);

        vscode.window.showInformationMessage("get worktrees function");
        
        let worktrees: Worktree[] = [];
        let lines = e.split("\n");
        
        lines.forEach(element => {
            let line = element.split(" ");
            // console.log(Object.values(line))

            if(Object.values(line).length === 1) { return; }
            
            let openCommand: vscode.Command = {
                title: "open",
                command: "git-worktree-menu.open-worktree",
                arguments: [line[0]]
            };

            worktrees.push(
                new Worktree(
                    line[3], 
                    line[0], 
                    line[2], 
                    vscode.TreeItemCollapsibleState.None,
                    openCommand
                )
            );
                // {
            //     path: line[0],
            //     commit: line[2],
            //     branch: line[3],
            // })

        });

        return worktrees;
        
	}

}

export class Worktree extends vscode.TreeItem {

	constructor(
		public readonly label: string,
		private readonly version: string,
        id: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command
	) {
		super(label, collapsibleState);

		this.tooltip = `${this.label}-${this.version}`;
		this.description = this.version;
	}


	contextValue = 'worktree';
}
