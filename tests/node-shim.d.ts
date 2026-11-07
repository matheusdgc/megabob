// Minimal typings for the Node built-ins used by tests (avoids a @types/node dependency).
declare module 'node:fs' {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string): { readUInt32BE(offset: number): number };
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function readdirSync(path: string, opts: { recursive: true }): string[];
}
declare module 'node:path' {
  export function join(...parts: string[]): string;
}
