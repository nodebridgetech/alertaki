import { FirebaseTimestamp } from './user';

export type InviteStatus = 'pending' | 'accepted' | 'rejected';

export interface Invite {
  id: string;
  fromUid: string;
  fromEmail: string;
  fromDisplayName: string;
  fromPhotoURL: string | null;
  toUid: string;
  toEmail: string;
  status: InviteStatus;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
}
