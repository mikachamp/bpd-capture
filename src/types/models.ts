export type OrderStatus = 'in_process' | 'completed';

/** 0 Sample, 1 Production, 2 Packed, 3 Installed — see utils/stages.ts. */
export type Stage = 0 | 1 | 2 | 3;
export type PhotoSide = 'before' | 'after';

export type Order = {
  id: number;
  ceNumber: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  /** ISO date (yyyy-MM-dd), or null when no due date has been set. */
  dueDate: string | null;
  notes: string | null;
  clientName: string | null;
  projectName: string | null;
  /** Where the order is in Sample → Production → Packed → Installed. */
  stage: Stage;
  /** The order's first photo (by capture order), for list-row thumbnails. Not a stored column — computed by a subquery in every listing/search query in db/orders.ts. */
  coverImage?: string | null;
};

export type Client = {
  id: number;
  name: string;
  createdAt: string;
};

export type MediaType = 'photo' | 'video';

export type MediaItem = {
  id: number;
  orderId: number;
  type: MediaType;
  filePath: string;
  fileName: string;
  createdAt: string;
  /** The stage the photo/video was taken in. */
  stage: Stage;
  /** Installation photos only: before or after fitting. */
  side: PhotoSide | null;
};
