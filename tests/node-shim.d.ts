// Minimal typings for the Node built-ins used by tests (avoids a @types/node dependency).
declare module 'node:fs' {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string): { readUInt32BE(offset: number): number };
}
declare module 'node:path' {
  export function join(...parts: string[]): string;
}
