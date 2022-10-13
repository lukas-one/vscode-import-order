import * as vscode from 'vscode';
import { sortImports } from './commands';
import { EXTENSION_COMMAND_NAME, EXTENSION_CONFIG_NAME, EXTENSION_SLUG } from './constants';
import { workspace } from 'vscode';

export enum AppExitCode {
	success, error, noImportsFound
}

export function activate(context: vscode.ExtensionContext) {

	let disposable: vscode.Disposable = vscode.commands.registerCommand(`${EXTENSION_SLUG}.${EXTENSION_COMMAND_NAME}`, () => {
		const editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
		const configs: vscode.WorkspaceConfiguration = workspace.getConfiguration(EXTENSION_CONFIG_NAME);
		if (editor) {
			sortImports(editor, configs).then((exitCode: AppExitCode) => {
				if (exitCode === AppExitCode.success) {
					vscode.window.showInformationMessage('Successfully ordered imports');
				} else if (exitCode === AppExitCode.noImportsFound){
					vscode.window.showErrorMessage(`Import Order - No imports found.`);
				} else {
					vscode.window.showErrorMessage(`Import Order - Something went wrong. Please log a bug.`);
				}
			});
		}
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
