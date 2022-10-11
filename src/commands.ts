import * as vscode from 'vscode';
import { ImportOrderConfigGeneral, ImportOrderGroup, PathSanitiser, SortingType } from './interfaces/configs';
import { ImportNode } from './interfaces/import-node';
import { EXTENSION_CONFIG_GENERAL, EXTENSION_CONFIG_GROUPING } from './constants';

export function sortImports(editor: vscode.TextEditor, configs: vscode.WorkspaceConfiguration): boolean {
    if (editor.document) {
        try {
            const general: ImportOrderConfigGeneral | undefined = configs.get<ImportOrderConfigGeneral>(EXTENSION_CONFIG_GENERAL);
            const grouping: ImportOrderGroup[] | undefined = configs.get<ImportOrderGroup[]>(EXTENSION_CONFIG_GROUPING);
            if (general && grouping) {
                const importNodes: ImportNode[] = getImportNodes(editor.document.getText(), general);
                let groupedNodes: ImportNode[][] = groupImportNodes(importNodes, general, grouping);
                groupedNodes = sortImportNodes(groupedNodes, general);
                performImportOrder(importNodes, groupedNodes, editor, general, grouping);
                return true;
            }
        } catch (error) {
            console.log(`Import Order Error`, error);
            return false;
        }
    }
    return false;
}

const getImportNodes = (text: string, general: ImportOrderConfigGeneral): ImportNode[] => {
    const matchRegex: RegExp = new RegExp(general.matchImportRegex, "g");

    const nodes: ImportNode[]  = text.split('\r\n')
        .map((text: string, lineNo: number) => ({ text, lineNo, path: '' }))
        .filter((node: ImportNode) => node.text !== '')
        .filter((node: ImportNode) => node.text.match(matchRegex)?.length || false);

    const pathRegex: RegExp = new RegExp(general.matchPathRegex);
    nodes.forEach((node: ImportNode) => {
        const match: RegExpMatchArray | null = node.text.match(pathRegex);
        if (match) {    
            let sanitisedPath = match[0];
            general.pathSanitisers.forEach((sanitiser: PathSanitiser) => {
                const search = new RegExp(sanitiser.search, sanitiser.flags);
                sanitisedPath = sanitisedPath.replace(search, sanitiser.replace);
            });
            node.path = sanitisedPath;
        }
    });
    return nodes;
};

const groupImportNodes = (importNodes: ImportNode[], general: ImportOrderConfigGeneral, grouping: ImportOrderGroup[]): ImportNode[][] => {
    let groupedNodes: ImportNode[][] = [];
    grouping.forEach((group: ImportOrderGroup) => groupedNodes[group.index] = []);
    groupedNodes[general.miscGroupIndex] = [];

    importNodes.forEach((node: ImportNode) => {
        let grouped: boolean = false;
        grouping.forEach((group: ImportOrderGroup) => {
            const regex: RegExp = new RegExp(group.regex);
            if (regex.test(node.path)) {
                grouped = true;
                groupedNodes[group.index].push(node);
            }
        });
        if (!grouped) {
            groupedNodes[general.miscGroupIndex].push(node);
        }
    });
    groupedNodes = groupedNodes.filter((arr) => arr.length);
    return groupedNodes;
};

const sortImportNodes = (groupedNodes: ImportNode[][], general: ImportOrderConfigGeneral): ImportNode[][] => {
    return groupedNodes;
};

const performImportOrder = (importNodes: ImportNode[], groupedNodes: ImportNode[][], editor: vscode.TextEditor, general: ImportOrderConfigGeneral, grouping: ImportOrderGroup[]) => {
    const descending = importNodes.reverse();

    const deletes = descending.map((node: ImportNode) => vscode.TextEdit.delete(
        new vscode.Range( node.lineNo, 0, node.lineNo + 1, 0 )
    ));

    let insertText: string = '';
    groupedNodes.forEach((group: ImportNode[], groupIndex: number) => {
        if (general.sorting === SortingType.basic) {
            group = group.sort((a: ImportNode, b: ImportNode) => a.path.localeCompare(b.path));
        }
        let blankLines = getBlankLinesForGroup(groupIndex, general, grouping);
        if (groupIndex > 0 && blankLines > 0) {
            insertText += '\r\n';
        }
        group.forEach((node: ImportNode, i) => insertText += (groupIndex > 0 || i > 0 ? '\r\n' : '') + node.text);
    });

    editor.edit((editBuilder: vscode.TextEditorEdit) => {
        deletes.forEach(d => editBuilder.delete(d.range));
        editBuilder.insert(new vscode.Position(0, 0), insertText);
    });
};

const getBlankLinesForGroup = (groupIndex: number, general: ImportOrderConfigGeneral, grouping: ImportOrderGroup[]): number => {
    let blankLines = general.blankLinesBeforeGroup;
    blankLines = grouping[groupIndex].blankLinesBefore;
    return blankLines;
};