import * as vscode from 'vscode';
import { ImportOrderConfigGeneral, ImportOrderGroup, PathSanitiser, SortingType } from './interfaces/configs';
import { ImportNode } from './interfaces/import-node';
import { EXTENSION_CONFIG_GENERAL, EXTENSION_CONFIG_GROUPING } from './constants';
import { AppExitCode } from './extension';

export async function sortImports(editor: vscode.TextEditor, configs: vscode.WorkspaceConfiguration): Promise<AppExitCode> {
    return new Promise<any>((resolve: (value?: any) => any, reject: (value?: any) => any) => {
        if (editor.document) {
            try {
                const general: ImportOrderConfigGeneral | undefined = configs.get<ImportOrderConfigGeneral>(EXTENSION_CONFIG_GENERAL);
                let grouping: ImportOrderGroup[] | undefined = JSON.parse(JSON.stringify(configs.get<ImportOrderGroup[]>(EXTENSION_CONFIG_GROUPING)));
    
                if (general && grouping) {
                    const importNodes: ImportNode[] = getImportNodes(editor.document, general);

                    if (importNodes.length > 0) {
                        grouping = groupImportNodes(importNodes, general, grouping);
        
                        removeImportSectionFromEditor(importNodes, editor).then(() => {
                            if (grouping) {
                                insertOrderedImports(grouping, editor, general).then(() => {
                                    return resolve(AppExitCode.success);
                                });
                            }
                        });
                    } else {
                        return resolve(AppExitCode.noImportsFound);
                    }
                }
    
            } catch (error) {
                console.log(`Import Order - Unhandled Error`, error);
                return resolve(AppExitCode.error);
            }
        } else {
            console.log(`Import Order - Document Error`, editor.document);
            return resolve(AppExitCode.error);
        }
    });
}

const getImportNodes = (doc: vscode.TextDocument, general: ImportOrderConfigGeneral): ImportNode[] => {
    const importMatchRegex: RegExp = new RegExp(general.matchImportRegex, "g");
    const pathMatchRegex: RegExp = new RegExp(general.matchPathRegex);

    const nodes: ImportNode[] = [];
    for (let i: number = 0; i < doc.lineCount; i++) {
        const line: vscode.TextLine = doc.lineAt(i);
        const importMatch: RegExpMatchArray | null = line.text.match(importMatchRegex);
        const pathMatch: RegExpMatchArray | null = line.text.match(pathMatchRegex);

        if (!line.isEmptyOrWhitespace && importMatch && pathMatch) {
            let sanitisedPath = pathMatch[0];
            general.pathSanitisers.forEach((sanitiser: PathSanitiser) => {
                const search = new RegExp(sanitiser.search, sanitiser.flags);
                sanitisedPath = sanitisedPath.replace(search, sanitiser.replace);
            });
            nodes.push({
                text: line.text,
                lineNo: line.lineNumber,
                path: sanitisedPath
            });
        }
    }

    return nodes;
};

const groupImportNodes = (importNodes: ImportNode[], general: ImportOrderConfigGeneral, grouping: ImportOrderGroup[]): ImportOrderGroup[] => {
    const miscGrouping: ImportOrderGroup = { index: general.miscGroupIndex, regex: '', nodes: [] };
    let miscGroupArrayIndex;

    let count: number = 0;
    importNodes.forEach((node: ImportNode) => {
        let nodeIsGrouped: boolean = false;
        grouping.forEach((group: ImportOrderGroup, i: number) => {
            if (!group.nodes) {
                group.nodes = [];
            }
            if (group.index === general.miscGroupIndex) {
                miscGroupArrayIndex= i;
            }
            const regex: RegExp = new RegExp(group.regex);
            if (regex.test(node.path)) {
                nodeIsGrouped = true;
                count++;
                group.nodes.push(node);
            }
        });
        if (!nodeIsGrouped) {
            count++;
            miscGrouping.nodes.push(node);
        }
    });

    if (miscGroupArrayIndex) {
        grouping[miscGroupArrayIndex].nodes.push(...miscGrouping.nodes);
    } else {
        grouping.push(miscGrouping);
    }

    if (count) {
        sortGroupings(grouping, general);
    }

    return grouping;
};

const sortGroupings = (grouping: ImportOrderGroup[], general: ImportOrderConfigGeneral) => {
    grouping?.sort((a, b) => a.index - b.index);
    if (general.sorting === SortingType.basic) {
        grouping.forEach((group: ImportOrderGroup) => group.nodes?.sort((a: ImportNode, b: ImportNode) => a.path.localeCompare(b.path)));
    }
};

const removeImportSectionFromEditor = async (nodes: ImportNode[], editor: vscode.TextEditor): Promise<boolean> => {
    return new Promise<any>((resolve: (value?: any) => any) => {
        const highestLineNo: number = Math.max(...nodes.map((node: ImportNode) => node.lineNo));
        const del: vscode.TextEdit = vscode.TextEdit.delete( new vscode.Range( 0, 0, highestLineNo + 1, 0 ));
        editor.edit((editBuilder: vscode.TextEditorEdit) => {
            editBuilder.delete(del.range);
        }).then(() => resolve(true));
    });
};

const insertOrderedImports = async(grouping: ImportOrderGroup[], editor: vscode.TextEditor, general: ImportOrderConfigGeneral): Promise<boolean> => {
    return new Promise<any>((resolve: (value?: any) => any) => {
        let writeText: string = '';
        grouping?.forEach((group: ImportOrderGroup, i: number) => {
            if (i > 0) {
                let blankLines = general.blankLinesBeforeGroup;
                if (group.blankLinesBefore !== undefined) {
                    blankLines = group.blankLinesBefore;
                }
                if (blankLines > 0) {
                    writeText += new Array(blankLines).fill('\n').join('');
                }
            }
            group.nodes.forEach((node: ImportNode) => writeText += node.text + '\n');
        });
        editor.edit((editBuilder: vscode.TextEditorEdit) => {
            editBuilder.insert(new vscode.Position(0, 0), writeText);
        }).then(() => resolve(true));
    });
};




















// const getImportNodes = (text: string, general: ImportOrderConfigGeneral): ImportNode[] => {
//     const matchRegex: RegExp = new RegExp(general.matchImportRegex, "g");

//     const nodes: ImportNode[]  = text.split(general.newlineDelimiter)
//         .map((text: string, lineNo: number) => ({ text, lineNo, path: '' }))
//         .filter((node: ImportNode) => node.text !== '')
//         .filter((node: ImportNode) => node.text.match(matchRegex)?.length || false);

//     const pathRegex: RegExp = new RegExp(general.matchPathRegex);
//     nodes.forEach((node: ImportNode) => {
//         const match: RegExpMatchArray | null = node.text.match(pathRegex);
//         if (match) {    
//             let sanitisedPath = match[0];
//             general.pathSanitisers.forEach((sanitiser: PathSanitiser) => {
//                 const search = new RegExp(sanitiser.search, sanitiser.flags);
//                 sanitisedPath = sanitisedPath.replace(search, sanitiser.replace);
//             });
//             node.path = sanitisedPath;
//         }
//     });
//     return nodes;
// };

// export function sortImports(editor: vscode.TextEditor, configs: vscode.WorkspaceConfiguration): boolean {
//     if (editor.document) {
//         try {
//             const general: ImportOrderConfigGeneral | undefined = configs.get<ImportOrderConfigGeneral>(EXTENSION_CONFIG_GENERAL);
//             const grouping: ImportOrderGroup[] | undefined = configs.get<ImportOrderGroup[]>(EXTENSION_CONFIG_GROUPING);
//             if (general && grouping) {
//                 const importNodes: ImportNode[] = getImportNodes(editor.document.getText(), general);
//                 const groupedNodes: ImportNode[][] = groupImportNodes(importNodes, general, grouping);
//                 const sortedGroupNodes: ImportNode[][] = sortImportNodes(groupedNodes, general);

//                 removeImportSectionFromEditor(importNodes, editor).then(() => {
//                     performImportOrder(sortedGroupNodes, editor, general, grouping);
//                 });

//                 return true;
//             }
//         } catch (error) {
//             console.log(`Import Order Error`, error);
//             return false;
//         }
//     }
//     return false;
// }

// const groupImportNodes = (importNodes: ImportNode[], general: ImportOrderConfigGeneral, grouping: ImportOrderGroup[]): ImportNode[][] => {
//     let groupedNodes: ImportNode[][] = [];
//     grouping.forEach((group: ImportOrderGroup) => groupedNodes[group.index] = []);
//     groupedNodes[general.miscGroupIndex] = [];

//     importNodes.forEach((node: ImportNode) => {
//         let grouped: boolean = false;
//         grouping.forEach((group: ImportOrderGroup) => {
//             const regex: RegExp = new RegExp(group.regex);
//             if (regex.test(node.path)) {
//                 grouped = true;
//                 groupedNodes[group.index].push(node);
//             }
//         });
//         if (!grouped) {
//             groupedNodes[general.miscGroupIndex].push(node);
//         }
//     });
//     return groupedNodes;
// };

// const sortImportNodes = (groupedNodes: ImportNode[][], general: ImportOrderConfigGeneral): ImportNode[][] => {
//     return groupedNodes;
// };

// const removeImportSectionFromEditor = async (importNodes: ImportNode[], editor: vscode.TextEditor): Promise<boolean> => {
//     return new Promise<any>((resolve: (value?: any) => any) => {
//         // remove lines in descending order to preserve indices
//         const descending = importNodes.reverse();
//         const deletes = descending.map((node: ImportNode) => vscode.TextEdit.delete(
//             new vscode.Range( node.lineNo, 0, node.lineNo + 1, 0 )
//         ));

//         // write edits in editor
//         editor.edit((editBuilder: vscode.TextEditorEdit) => {
//             deletes.forEach(d => editBuilder.delete(d.range));
//         }).then(() => {
//             resolve(true);
//         });
//     });
// };

// const performImportOrder = (groupedNodes: ImportNode[][], editor: vscode.TextEditor, general: ImportOrderConfigGeneral, grouping: ImportOrderGroup[]) => {
//     // calc groupings with matching array indices from user configs
//     const indexAwareGrouping: ImportOrderGroup[] = [];
//     grouping.forEach((g: ImportOrderGroup) => indexAwareGrouping[g.index] = g);

//     let insertText: string = '';
//     groupedNodes.forEach((nodes: ImportNode[], groupIndex: number) => {
//         // calc some useful stuff
//         const indexAwareGroup: ImportOrderGroup = indexAwareGrouping[groupIndex];
//         const isFirstGroup: boolean = indexAwareGroup.index === grouping[0].index;

//         // do sorting
//         sortNodes(nodes, general);

//         // insert blank lines before groups
//         const blankLines = !isNaN(indexAwareGroup.blankLinesBefore) ? indexAwareGroup.blankLinesBefore : general.blankLinesBeforeGroup;
//         if (!isFirstGroup) {
//             insertText += new Array(blankLines).fill(general.newlineDelimiter).join('');
//         }

//         // write import string
//         nodes.forEach((node: ImportNode, i) => {
//             insertText += (!isFirstGroup || i > 0 ? general.newlineDelimiter : '') + node.text;
//         });
//     });

//     console.log(`Lukas - insertText:\n`, insertText, "\nFIN");

//     // write edits in editor
//     editor.edit((editBuilder: vscode.TextEditorEdit) => {
//         editBuilder.insert(new vscode.Position(0, 0), insertText);
//     });
// };

// const sortNodes = (nodes: ImportNode[], general: ImportOrderConfigGeneral) => {
//     if (general.sorting === SortingType.basic) {
//         return nodes.sort((a: ImportNode, b: ImportNode) => a.path.localeCompare(b.path));
//     }
// };
