// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { simpleGit, SimpleGit, CleanOptions } from 'simple-git';
import { WorktreeProvider } from './Worktree';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	


// Setup tree view
	const worktreeProvider = new WorktreeProvider();
	vscode.window.registerTreeDataProvider('worktreeDependencies', worktreeProvider);

//register commands

//open
	const openWorktreeCommand = 'git-worktree-menu.open-worktree';
	const openWorktreeCommandHandler = async (args: any) => {
		let path = args?.path? args.path : args;

		if (!path) {
			const selectedWT = await vscode.window.showQuickPick(worktreeProvider.worktrees.map( (e, i) => { return { label: e.branch, path: e.path }; }));
			if (!selectedWT) { return; }
			path = selectedWT.path;
		}
		const uri = vscode.Uri.file(path);
		await vscode.commands.executeCommand('vscode.openFolder', uri);
	};
	vscode.commands.registerCommand(openWorktreeCommand, openWorktreeCommandHandler);

//open new window
	const openNewWindowWorktreeCommand = 'git-worktree-menu.openWorktreeNewWindow';
	const openNewWindowWorktreeCommandHandler = async (args: any) => {
		let path;
		if (args) {
			path = args.path;
		} else {
			const selectedWT = await vscode.window.showQuickPick(worktreeProvider.worktrees.map( (e, i) => { return { label: e.branch, path: e.path }; }));
			
			if (!selectedWT) { return; }
			
			path = selectedWT.path;
		}
		const uri = vscode.Uri.file(path);
		await vscode.commands.executeCommand('vscode.openFolder', uri, true );
	};
	vscode.commands.registerCommand(openNewWindowWorktreeCommand, openNewWindowWorktreeCommandHandler);



//refresh
	vscode.commands.registerCommand('git-worktree-menu.refreshList', () => worktreeProvider.refresh() );

//add
	vscode.commands.registerCommand('git-worktree-menu.addWorktree', () => worktreeProvider.create() );

//remove
	vscode.commands.registerCommand('git-worktree-menu.removeWorktree', (args) => worktreeProvider.removeWorktree(args) );
	vscode.commands.registerCommand('git-worktree-menu.forceRemoveWorktree', (args) =>  worktreeProvider.forceRemove(args) );

}

// this method is called when your extension is deactivated
export function deactivate() {}
