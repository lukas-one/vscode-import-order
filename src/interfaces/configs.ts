import { ImportNode } from "./import-node";

export enum SortingType {
    basic = "Basic",
    none = "None"
}

export interface ImportOrderConfig {
    general: ImportOrderConfigGeneral;
    grouping: ImportOrderGroup[]
}

export interface ImportOrderConfigGeneral {
    matchImportRegex: string;
    matchPathRegex: string;
    pathSanitisers: PathSanitiser[];
    blankLinesBeforeGroup: number;
    miscGroupIndex: number;
    sorting: SortingType;
}

export interface ImportOrderGroup {
    index: number;
    regex: string;
    nodes: ImportNode[];
    blankLinesBefore?: number;
}

export interface PathSanitiser {
    search: string;
    replace: string;
    flags: string
}