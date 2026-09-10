export type OrderStatus = 'in_process' | 'completed';

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
};

export type MediaType = 'photo' | 'video';

export type MediaItem = {
  id: number;
  orderId: number;
  type: MediaType;
  filePath: string;
  fileName: string;
  createdAt: string;
};
