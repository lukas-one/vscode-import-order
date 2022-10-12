# vscode-import-order README

Take control over your imports with the power of regex

## Features

- Describe how imports are matched
- Describe how they are grouped
- Describe how those groups are sorted
- Describe where any outlying or miscellaneous imports should also end up

## How To Use

Imports are sorted into groups, stages of doing this are as follows:

- Match imports using regex defined in `orderImports.general.matchImportRegex`
- Match import paths using regex defined in `orderImports.general.matchPathRegex`
- Sanitise paths using array of regexes `orderImports.general.pathSanitisers`
- Organise imports into groups defined in `orderImports.grouping` (regex: string, index: number, blankLinesBefore: number)
- Specify which group index to place any remaining import matches `orderImports.general.miscGroupIndex`
- Choose sorting `orderImports.general.sorting`
- Specify spacing between groups `orderImports.general.blankLinesBeforeGroup` (this can be overridden in group with `blankLinesBefore` property)

## Requirements

Knowledge of regular expressions

## Release Notes

### 0.0.1

Proof of concept
### 0.0.2

Bug Fix: Some import patterns leave trailing lines expanding whitespace

**Enjoy!**
