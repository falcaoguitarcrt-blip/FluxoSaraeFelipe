export const DEFAULT_STATE = {};

export function migrateData(raw) { return raw || DEFAULT_STATE; }

export function getProfileCatalog(data, key, profileKey, includeInactive = false) { return []; }

export function getAccountsForProfile(data, profileKey, includeInactive = false) { return []; }
