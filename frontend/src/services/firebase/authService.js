import { getFirebaseServices } from './config';
// Reserved integration boundary. Forms deliberately perform validation only.
// Server-authorized roles and token verification must precede live account creation.
export function getAuthClient() {
  return getFirebaseServices()?.auth ?? null;
}
