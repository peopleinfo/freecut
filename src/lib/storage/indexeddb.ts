/**
 * IndexedDB storage - backward compatibility re-exports.
 *
 * The implementation has been split into domain-specific modules under ./indexeddb/
 * This file re-exports everything for backward compatibility with existing imports.
 *
 * New code should import from '@/lib/storage/indexeddb' (the folder with index.ts)
 * or from specific modules like '@/lib/storage/indexeddb/projects'.
 */

export * from './indexeddb/index';
