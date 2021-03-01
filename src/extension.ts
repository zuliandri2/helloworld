// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { resourceUsage } from 'process';
import * as vscode from 'vscode';
import {subscribeToDocumentChanges, EMOJI_MENTION} from './diagnostics';
import {ExtensionContext, languages, commands, Disposable, workspace, window} from 'vscode';
import {CodelensProvider} from './CodelensProvider';

const COMMAND = 'code-actions-sample.command';

let disposables: Disposable[] = [];

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	/**
	 * Hover
	 */
	const providerHover1 = vscode.languages.registerHoverProvider('plaintext', {
		provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
			return new vscode.Hover("Hi");
		}
	})

	context.subscriptions.push(providerHover1);

	/**
	 * Completions
	 */
	const provided1 = vscode.languages.registerCompletionItemProvider('plaintext', {
		provideCompletionItems(dpcument: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
			const simpleCompletion = new vscode.CompletionItem("Hello world");

			const snippetCompletion = new vscode.CompletionItem("Good part of the day");
			snippetCompletion.insertText = new vscode.SnippetString("Good ${1|morning, afternoon, evening|}. It is ${1}, right?");
			snippetCompletion.documentation = new vscode.MarkdownString("Insert a snippet that lets you select the _appropriate_part of the day for your greeting.");

			const commitCharacterCompletion = new vscode.CompletionItem('console');
			commitCharacterCompletion.commitCharacters = ["."];
			commitCharacterCompletion.documentation = new vscode.MarkdownString("Press '.' to get console");

			const commandCompletion = new vscode.CompletionItem('new');
			commandCompletion.insertText = 'new ';
			commandCompletion.command = {command: 'editor.action.triggerSuggest',title: 'Re-trigger completions...'};

			return [
				simpleCompletion,
				snippetCompletion,
				commitCharacterCompletion,
				commandCompletion,
			];
		}
	});

	const provided2 = vscode.languages.registerCompletionItemProvider('plaintext', {
		provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

			const linePrefix = document.lineAt(position).text.substr(0, position.character);
			console.log(linePrefix);
			if (!linePrefix.endsWith('console')) {
				return undefined;
			}

			return [
				new vscode.CompletionItem("log", vscode.CompletionItemKind.Method),
				new vscode.CompletionItem("warn", vscode.CompletionItemKind.Method),
				new vscode.CompletionItem("error", vscode.CompletionItemKind.Method),
			];
		}
	});

	context.subscriptions.push(provided1, provided2);

	const codelensProvider =  new CodelensProvider();

	languages.registerCodeLensProvider("*", codelensProvider);

	commands.registerCommand("codelens-sample.enableCodelens", () => {
		workspace.getConfiguration("codelens-sample").update("enableCodelens", true, true);
	});

	commands.registerCommand("codelens-sample.disableCodelens", () => {
		workspace.getConfiguration("codelens-sample").update("enableCodelens", false, true);
	});

	commands.registerCommand("codelens-sample.codelensAction", (args: any) => {
		window.showInformationMessage('Codelens action clicked with args = ${args}');
	});

	context.subscriptions.push(vscode.languages.registerCodeActionsProvider('markdown', new Emojizer(), {
		providedCodeActionKinds: Emojizer.providedCodeActionKinds
	}));

	const emojiDiagnostics = vscode.languages.createDiagnosticCollection('emoji');

	context.subscriptions.push(emojiDiagnostics);

	subscribeToDocumentChanges(context, emojiDiagnostics);

	context.subscriptions.push(vscode.languages.registerCodeActionsProvider('markdown', new Emojiinfo(), {
		providedCodeActionKinds: Emojiinfo.providedCodeActionKinds
	}));

	context.subscriptions.push(vscode.commands.registerCommand(COMMAND, () => vscode.env.openExternal(vscode.Uri.parse('https://unicode.org/emoji/charts-12.0/full-emoji-list.html'))));

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "helloworld" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('helloworld.helloWorld', () => {
		// The code you place here will be executed every time your command is executed

		const messages = 'Hello World Ext Andri!';
		// Display a message box to the user
		vscode.window.showInformationMessage(messages);
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
	if (disposables) {
		disposables.forEach(item => item.dispose());
	}

	disposables = [];
}

export class Emojizer implements vscode.CodeActionProvider {

	public static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

	public provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] | undefined {
		if (!this.isAtStartOfEmpty(document, range)) {
			return;
		}

		const replaceWithSmileCatFix = this.createFix(document, range, '😺');

		const replaceWithSmileFix = this.createFix(document, range, '😀');

		replaceWithSmileFix.isPreferred = true;

		const replaceWithSmileHankyFix = this.createFix(document, range, '💩');

		const commandAction = this.createCommand();

		return [
			replaceWithSmileCatFix,
			replaceWithSmileFix,
			replaceWithSmileHankyFix,
			commandAction
		];
	}

	private isAtStartOfEmpty(document: vscode.TextDocument, range: vscode.Range) {
		const start = range.start;
		const line = document.lineAt(start.line);
		return line.text[start.character] === ':' && line.text[start.character + 1] === ')';
	}

	private createFix(document: vscode.TextDocument, range: vscode.Range, emoji: string): vscode.CodeAction {
		const fix = new vscode.CodeAction('Convert to ${emoji}', vscode.CodeActionKind.QuickFix);
		fix.edit = new vscode.WorkspaceEdit();
		fix.edit.replace(document.uri, new vscode.Range(range.start, range.start.translate(0, 2)), emoji);
		return fix;
	}

	private createCommand(): vscode.CodeAction {
		const action = new vscode.CodeAction('Learn more...', vscode.CodeActionKind.Empty);
		action.command = { command: COMMAND, title: 'Learn more about emoji', tooltip: 'This will open the unicode emoji page' };
		return action;
	}
}


export class Emojiinfo implements vscode.CodeActionProvider {
	
	public static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

	provideCodeActions(document: vscode.TextDocument, range: vscode.Range |vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.CodeAction[] {
		return context.diagnostics
		.filter(diagnostics => diagnostics.code === EMOJI_MENTION)
		.map(diagnostics => this.createCommandCodeAction(diagnostics));
	}

	private createCommandCodeAction(diagnostic: vscode.Diagnostic): vscode.CodeAction {
		const action = new vscode.CodeAction('Learn more...', vscode.CodeActionKind.QuickFix);
		action.command = {command: COMMAND, title: 'Learn more about emojis', tooltip: 'This will open unicode emoji page.'};
		action.diagnostics = [diagnostic];
		action.isPreferred = true;
		return action;
	}
}