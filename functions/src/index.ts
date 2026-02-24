import { initializeApp } from 'firebase-admin/app';

initializeApp();

export { onAlertCreated } from './alerts/onAlertCreated';
export { onInviteCreated } from './invites/onInviteCreated';
export { onInviteAccepted } from './invites/onInviteAccepted';
export { deleteUserAccount } from './users/onAccountDeleted';
export { removeContactOf } from './contacts/removeContactOf';
