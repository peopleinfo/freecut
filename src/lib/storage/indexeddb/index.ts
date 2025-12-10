/**
 * IndexedDB storage module.
 *
 * Split into domain-specific modules for maintainability:
 * - schema.ts: Database schema types and constants
 * - connection.ts: DB initialization, connection management, quota checks
 * - projects.ts: Project CRUD operations
 * - media.ts: Media CRUD operations
 * - thumbnails.ts: Thumbnail operations
 * - content.ts: Content-addressable storage (reference counting)
 * - project-media.ts: Project-media associations
 * - filmstrips.ts: Video filmstrip thumbnails
 * - waveforms.ts: Audio waveform data
 * - gif-frames.ts: GIF frame data
 */

// Schema exports
export type {
  VideoEditorDB,
  VideoEditorDBInstance,
} from './schema';
export { DB_NAME, DB_VERSION } from './schema';

// Connection exports
export {
  getDB,
  closeDB,
  reconnectDB,
  hasRequiredStores,
  checkStorageQuota,
  hasEnoughSpace,
} from './connection';

// Project exports
export {
  getAllProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  searchProjects,
  getProjectsSorted,
  clearAllProjects,
  getDBStats,
} from './projects';

// Media exports
export {
  getAllMedia,
  getMedia,
  createMedia,
  updateMedia,
  deleteMedia,
  searchMedia,
  getMediaByType,
  batchDeleteMedia,
} from './media';

// Thumbnail exports
export {
  saveThumbnail,
  getThumbnail,
  getThumbnailByMediaId,
  deleteThumbnail,
  deleteThumbnailsByMediaId,
} from './thumbnails';

// Content exports
export {
  getContentByHash,
  hasContentWithSize,
  createContent,
  incrementContentRef,
  decrementContentRef,
  deleteContent,
  findMediaByContentHash,
} from './content';

// Project-media association exports
export {
  associateMediaWithProject,
  removeMediaFromProject,
  getProjectMediaIds,
  getProjectsUsingMedia,
  getMediaForProject,
  removeAllMediaFromProject,
  isMediaInProject,
} from './project-media';

// Filmstrip exports
export {
  saveFilmstrip,
  getFilmstrip,
  getFilmstripByMediaAndDensity,
  getFilmstripByMediaId,
  getFilmstripsByMediaId,
  deleteFilmstrip,
  deleteFilmstripsByMediaId,
} from './filmstrips';

// Waveform exports
export {
  saveWaveform,
  getWaveform,
  deleteWaveform,
} from './waveforms';

// GIF frames exports
export {
  saveGifFrames,
  getGifFrames,
  deleteGifFrames,
  clearAllGifFrames,
} from './gif-frames';
