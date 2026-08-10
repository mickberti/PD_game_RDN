import { Timestamp } from '@angular/fire/firestore';

export interface PlayerProfile {
  role: string;
  profileId: string;
  createdAt: Timestamp | null;
  nickname: string;
  bannerUrl: string;
  imageUrl: string;
}
