import { BaseDocument } from "./common";

export enum PromotionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
}

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export interface Promotion extends BaseDocument {
  name: string;
  description?: string;
  productsIds?: string[];
  servicesIds?: string[];
  slug?:string;
  image?: string;
  startDate: Date;
  endDate: Date;
  status: PromotionStatus;
  discount: number;
  discountType: DiscountType;
}
