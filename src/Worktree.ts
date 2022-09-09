import * as vscode from 'vscode';

import { simpleGit, SimpleGit, CleanOptions } from 'simple-git';

export class WorktreeProvider implements vscode.TreeDataProvider<Worktree> {

    _rootPath: string | undefined = undefined;

    public worktrees: Worktree[];
	private _onDidChangeTreeData: vscode.EventEmitter<Worktree | undefined | void> = new vscode.EventEmitter<Worktree | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<Worktree | undefined | void> = this._onDidChangeTreeData.event;

    public get workspaceRoot() {
		return (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0)) ? vscode.workspace.workspaceFolders[0].uri.fsPath : this._rootPath;
	}

	public set workspaceRoot(path){
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
                {label:"Are you sure you want to force remove this worktree?", id: 0},
                {label: "Cancel", id: 1}
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
            ...(force? ["-f"] : [] ),
            args.path
        ];
        let gitPath = vscode.workspace.workspaceFolders?vscode.workspace.workspaceFolders[0].uri.fsPath: "./";
        try {
            let e = await simpleGit(gitPath).raw(...commands);
        } catch (error: any) {
            vscode.window.showInformationMessage(error.message);
        }
        

        this.refresh();
    }

    async create() {

        this.refresh();

        const pick = await vscode.window.showQuickPick(
            [{label:"Select the parent folder for the new worktree", id: 0},{label: "Cancel", id: 1}],
            {
                title: "Create a new worktree",
            }
        );
        
        if(pick?.id === 1) {return;}

        //select path
        let fileUri = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: 'Select parent path for new worktree',
            canSelectFiles: false,
            canSelectFolders: true    
        });
        if (!fileUri) { return; }

        vscode.window.showInformationMessage('Selected file: ' + fileUri[0].fsPath);

        let folderName = await vscode.window.showInputBox({
            title: "Enter the folder name you would like for this worktree"
        });

        if (!folderName || folderName == "") { return; }

        vscode.window.showInformationMessage('Entered folder name: ' + folderName);

        let branches = await this.getBranches();

        let filteredBranches = branches.all.filter( (e:string, i) => !this.worktrees.some( w => w.branch === e) );

        let availableBranchesQuickPickItems = filteredBranches.map( (e) => { return {label: "$(source-control) "+e, id: 0}; });

        let newBranch = false;
        //select branch
        let branch = await vscode.window.showQuickPick([ 
            ...(availableBranchesQuickPickItems.length>0 ? [{label: "Available Branches", kind: vscode.QuickPickItemKind.Separator, id: "0"}] : [] ),
            ...availableBranchesQuickPickItems, 
            {label:"$(plus) Create New Branch", id: -1}
        ], {
            title: "Select the branch to initialize this worktree with"
        });

        if (!branch) { return; }

        if (branch.id === -1) {
            let branchName = await vscode.window.showInputBox({
                title: "Enter the name for the new branch",
                validateInput: text => {
                    let branchNameRegex = /^(?!\.| |-|\/)((?!\.\.)(?!.*\/\.)(\/\*|\/\*\/)*(?!@\{)[^\~\:\^\\\ \?*\[])+(?<!\.|\/)(?<!\.lock)$/
                    if (!branchNameRegex.test(text)) {
                        return "Not a valid branch name";
                    } else if (branches.all.includes(text)) {
                        return "A branch with this name already exists";
                    }
                    return null; // return null if validates
                }
            });

            if(!branchName) {return;}
            newBranch = true;

            branch.label = branchName;
        }

        vscode.window.showInformationMessage('Selected branch: ' + branch.label);

		const commands = [
            'worktree', 
            'add', 
            fileUri[0].fsPath + folderName, 
            ...(newBranch? ["-b"] : [] ),
            branch.label.split(" ")[1]
        ];

        let e = await simpleGit(this.workspaceRoot).raw(...commands);
        vscode.window.showInformationMessage( e );

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

    async getBranches() {
        vscode.window.showInformationMessage('workspaceRoot' + this.workspaceRoot);

        return simpleGit(this.workspaceRoot).branch(["-l"]);
    }


	private async getWoktrees(path: string): Promise<Worktree[]> {
		const commands = ['worktree', 'list'];
        let e = await simpleGit(path).raw(...commands);
        
        let worktrees: Worktree[] = [];
        let lines = e.split("\n");
        
        lines.forEach(element => {
            let line = element.trim().split(/\s+/);
            // console.log(Object.values(line))

            if(Object.values(line).length === 1) { return; }
            
            let openCommand: vscode.Command = {
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

        const currentPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
	? vscode.workspace.workspaceFolders[0].uri.path : "";

    let isThisWorktreeOpen = this.path.substring(this.path.indexOf(":") + 1) === currentPath.substring(currentPath.indexOf(":") + 1)
        
        if(isThisWorktreeOpen){
            this.contextValue = "current-worktree";
            // this.label = "$(primitive-dot) " + this.branch;
            this.iconPath = new vscode.ThemeIcon("check");
        }else{
            this.contextValue = "other-worktree";
            this.iconPath = new vscode.ThemeIcon("git-branch");

        }
		this.tooltip = `Click to switch this window to this worktree`;
		this.description = this.path;
	}


	contextValue = 'worktree';
}

function getBranches(): any[]{
    
    
    return []
}