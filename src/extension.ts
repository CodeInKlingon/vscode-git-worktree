// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { WorktreeProvider } from './Worktree';

import { API as GitAPI, GitExtension } from './git.d'; 

async function getBuiltInGitApi(): Promise<GitAPI | undefined> {
	try {
		const extension = vscode.extensions.getExtension<GitExtension>('vscode.git');
		if (extension !== undefined) {
			const gitExtension = extension.isActive ? extension.exports : await extension.activate();

			return gitExtension.getAPI(1);
		}
	} catch {}

	return undefined;
}

const setupEvents = async (treeProvider: WorktreeProvider) => {

	const builtinGit = await getBuiltInGitApi();
	if (builtinGit) {

		builtinGit.onDidChangeState((e)=>{				
			builtinGit.repositories.forEach((repo) => {
				repo.state.onDidChange((e)=>{
					treeProvider.refresh();
				});
			});
		});

	}
};
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Setup tree view
	const worktreeProvider = new WorktreeProvider();
	vscode.window.registerTreeDataProvider('worktreeDependencies', worktreeProvider);

	//set up git events to trigger worktree provider
	setupEvents(worktreeProvider);
	
	//open worktree command
	const openWorktreeCommand = 'git-worktree-menu.open-worktree';
	const openWorktreeCommandHandler = async (args: any) => {
		//sometimes args is different depending on what calls the command
		let path = args.path ? args.path : args;

		if (!path) {
			const selectedWT = await vscode.window.showQuickPick(worktreeProvider.worktrees.map( (e, i) => { return { label: e.branch, path: e.path }; }));
			if (!selectedWT) { return; }
			path = selectedWT.path;
		}
		const uri = vscode.Uri.file(path);
		await vscode.commands.executeCommand('vscode.openFolder', uri);
	};
	vscode.commands.registerCommand(openWorktreeCommand, openWorktreeCommandHandler);

	//open worktree in new window
	const openNewWindowWorktreeCommand = 'git-worktree-menu.openWorktreeNewWindow';
	const openNewWindowWorktreeCommandHandler = async (args: any) => {
		//sometimes args is different depending on what calls the command
		let path = args.path ? args.path : undefined;
		
		if (!path) {
			const selectedWT = await vscode.window.showQuickPick(worktreeProvider.worktrees.map( (e, i) => { return { label: e.branch, path: e.path }; }));
			
			if (!selectedWT) { return; }
			
			path = selectedWT.path;
		}
		const uri = vscode.Uri.file(path);
		await vscode.commands.executeCommand('vscode.openFolder', uri, true );
	};
	vscode.commands.registerCommand(openNewWindowWorktreeCommand, openNewWindowWorktreeCommandHandler);

	//refresh worktree list command linking
	vscode.commands.registerCommand('git-worktree-menu.refreshList', () => worktreeProvider.refresh() );

	//add worktree command linking
	vscode.commands.registerCommand('git-worktree-menu.addWorktree', () => worktreeProvider.create() );

	//remove work tree command linking
	vscode.commands.registerCommand('git-worktree-menu.removeWorktree', (args) => worktreeProvider.removeWorktree(args) );
	//force remove work tree command linking
	vscode.commands.registerCommand('git-worktree-menu.forceRemoveWorktree', (args) =>  worktreeProvider.forceRemove(args) );

}

// this method is called when your extension is deactivated
export function deactivate() {}
