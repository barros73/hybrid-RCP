
export interface BlockNode {
  id: string; // unique identifier
  name: string; // module name
  type: 'core' | 'file' | 'inline' | 'folder'; // type of block
  filePath: string | null; // path to the associated file, if any
  startLine: number; // line number where the module is declared
  endLine: number; // line number where the module declaration ends
  children: BlockNode[]; // nested modules
  imports: string[]; // list of 'use' imports detected (simple strings for now)
  depth?: number; // tree depth level
  compilationCost?: number; // Estimated compilation cost (e.g., Lines of Code)
  // New Semantic Properties
  data?: BlockData[]; // Structs owned by this block
  inputs?: BlockIO[]; // What this block consumes
  outputs?: BlockIO[]; // What this block produces
  logicHash?: string; // AST-stable identifier
  tags?: string[]; // Metadata tags like @MATRIX: 1.1
}

export interface BlockData {
  name: string;
  isPublic: boolean;
  type: string; // e.g., 'struct', 'enum'
  logicHash?: string;
}

export interface BlockIO {
  name: string; // function name or variable
  type: string; // type signature
  args?: string; // function arguments
  isMutable: boolean; // &mut T
  isReference: boolean; // &T
  logicHash?: string;
}

export interface Connection {
  from: string; // Source Block ID
  to: string; // Target Block ID
  type: 'immutable' | 'mutable' | 'ownership' | 'conflict';
  label?: string; // e.g., variable name
}

export interface BlockGraph {
  nodes: BlockNode[];
  edges: Connection[];
  conflicts?: Conflict[];
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
