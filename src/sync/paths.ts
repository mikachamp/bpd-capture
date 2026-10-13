// Same file in BPD_Capture_Desktop/src/shared/sync/paths.ts — keep identical.
// Layout of the `data` branch in the GitHub repo. One small JSON file per record
// (so two devices editing different jobs never touch the same file) plus each
// photo/video as its own binary next to a JSON sidecar.

export const DATA_BRANCH = 'data';

/** Rows whose uuid starts with this are demo/sample data and never sync. */
export const DEMO_UUID_PREFIX = 'demo-';

export const jobPath = (jobUuid: string) => `jobs/${jobUuid}.json`;
export const clientPath = (clientUuid: string) => `clients/${clientUuid}.json`;
export const jobMediaPrefix = (jobUuid: string) => `media/${jobUuid}/`;
export const mediaPrefix = (jobUuid: string, mediaUuid: string) => `media/${jobUuid}/${mediaUuid}.`;
export const mediaMetaPath = (jobUuid: string, mediaUuid: string) => `media/${jobUuid}/${mediaUuid}.json`;
export const mediaBinaryPath = (jobUuid: string, mediaUuid: string, extension: string) =>
  `media/${jobUuid}/${mediaUuid}.${extension.replace(/^\./, '').toLowerCase() || 'bin'}`;

/** SQL expression that generates a new random record id (32 hex chars). */
export const NEW_UUID_SQL = 'lower(hex(randomblob(16)))';
