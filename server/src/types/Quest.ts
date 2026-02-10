export interface Quest {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  location: {
    lat: number;
    lng: number;
  };
  createdAt: Date;
  expiresAt: Date;
  videoUrl?: string; // Optional for now
}
