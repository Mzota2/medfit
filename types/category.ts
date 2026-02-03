import { BaseDocument } from "./common";

export interface Category extends BaseDocument {
  name: string;
  description?: string;
  slug: string;
  icon?: string;
  image?: string; // Cloudinary image URL
  type: 'product' | 'service' | 'both';
}