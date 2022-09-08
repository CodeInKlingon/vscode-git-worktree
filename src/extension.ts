// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { simpleGit, SimpleGit, CleanOptions } from 'simple-git';
import { WorktreeProvider } from './Worktree';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	const rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
	? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;

// Setup tree view
	const worktreeProvider = new WorktreeProvider(rootPath);
	vscode.window.registerTreeDataProvider('worktreeDependencies', worktreeProvider);

//register commands

	//open
	const openWorktreeCommand = 'git-worktree-menu.open-worktree';
	const openWorktreeCommandHandler = async (args: any) => {
		console.log(args)
		// vscode.window.showInformationMessage("received open command " + args );
		const uri = vscode.Uri.file(args);
		let success = await vscode.commands.executeCommand('vscode.openFolder', uri);
	};
	vscode.commands.registerCommand(openWorktreeCommand, openWorktreeCommandHandler);

//refresh
	vscode.commands.registerCommand('git-worktree-menu.refreshList', () => worktreeProvider.refresh() );

//add
	vscode.commands.registerCommand('git-worktree-menu.addWorktree', () => worktreeProvider.create() );
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('git-worktree-menu.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		const commands = ['worktree', 'list'];
		simpleGit("./").raw(...commands).then( (e) => {
			console.log(e)
		});
		vscode.window.showInformationMessage('Hello World from Git Worktree Menu!');

	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
