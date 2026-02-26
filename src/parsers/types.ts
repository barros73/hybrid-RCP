import { ParseResult } from '../types';

export interface IProjectParser {
    parse(filePath: string): Promise<ParseResult>;
}

export * from '../types';
