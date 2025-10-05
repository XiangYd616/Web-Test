/**
 * interfaces.ts - 共享接口定义
 */

export interface BaseInterface {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Identifiable {
  id: string;
}

export interface Timestamped {
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftDeletable extends Timestamped {
  deletedAt?: Date;
}

