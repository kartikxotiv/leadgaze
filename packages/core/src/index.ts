export * from './apis';
export * from './lib/email';
export * from './pages';
export * from './services';
export * from './reminders';
export * from './meetings';
export * from './documents';
export * from './notes';
export {
  type CoreEntityRef,
  type CoreRelation,
  type CoreNote,
  type CoreEmail,
  type CoreDocument,
  type CoreActivity,
  type CoreReminder,
} from './types';
export * from './utils';

export const name = 'core';
