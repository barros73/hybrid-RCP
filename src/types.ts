export interface BlockNode {
  id: string; // unique identifier
  name: string; // module name
  type: 'core' | 'file' | 'inline' | 'folder'; // type of block
  filePath: string | null; // path to the associated file, if any
  startLine: number; // line number where the module is declared
  endLine: number; // line number where the module declaration ends
  children: BlockNode[]; // nested modules
  imports: string[]; // list of 'use' imports detected (simple strings for now)
}

export interface Conflict {
  id: string; // unique conflict id
  description: string; // human readable description of the conflict
  location: {
    file: string;
    line: number;
  };
  severity: 'error' | 'warning' | 'info';
  category: 'missing-file' | 'ownership-conflict' | 'version-mismatch'; // Categorization for AI
  suggestedFix?: string; // Specific suggestion (e.g., 'Wrap in Arc<Mutex<T>>')
}

export interface ParseResult {
  root: BlockNode;
  conflicts: Conflict[];
}
