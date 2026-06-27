import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductCategory = 'supplements' | 'drinks' | 'apparel' | 'accessories' | 'equipment' | 'other';
export type PaymentMethod   = 'cash' | 'card';
export type DiscountType    = 'fixed' | 'percent';

export interface Product {
  _id:               string;
  tenantId:          string;
  name:              string;
  description?:      string;
  category:          ProductCategory;
  price:             number;
  stock:             number;
  lowStockThreshold: number;
  archivedAt?:       string;
  createdAt:         string;
  updatedAt:         string;
}

export interface OrderItem {
  productId:   string;
  productName: string;
  category:    string;
  price:       number;
  quantity:    number;
  subtotal:    number;
}

export interface PosOrder {
  _id:            string;
  tenantId:       string;
  orderNumber:    string;
  items:          OrderItem[];
  subtotal:       number;
  discountType?:  DiscountType;
  discountValue?: number;
  discountAmount: number;
  total:          number;
  paymentMethod:  PaymentMethod;
  memberId?:      string;
  memberName?:    string;
  cashierId:      string;
  cashierName:    string;
  note?:          string;
  createdAt:      string;
  updatedAt:      string;
}

export interface PosSummary {
  period:     'today' | 'week' | 'month';
  revenue:    number;
  orders:     number;
  cashOrders: number;
  cardOrders: number;
  bestSellers: { _id: string; name: string; category: string; qtySold: number; revenue: number }[];
  lowStock:    Pick<Product, '_id' | 'name' | 'category' | 'stock' | 'lowStockThreshold'>[];
}

// ─── Product API ──────────────────────────────────────────────────────────────

export async function listProducts(params?: { archived?: boolean; category?: string }): Promise<Product[]> {
  const res = await api.get<ApiResponse<Product[]>>('/pos/products', { params });
  return res.data.data!;
}

export async function createProduct(payload: Omit<Product, '_id' | 'tenantId' | 'archivedAt' | 'createdAt' | 'updatedAt'>): Promise<Product> {
  const res = await api.post<ApiResponse<Product>>('/pos/products', payload);
  return res.data.data!;
}

export async function updateProduct(id: string, payload: Partial<Omit<Product, '_id' | 'tenantId' | 'createdAt' | 'updatedAt'>>): Promise<Product> {
  const res = await api.patch<ApiResponse<Product>>(`/pos/products/${id}`, payload);
  return res.data.data!;
}

export async function archiveProduct(id: string): Promise<void> {
  await api.delete(`/pos/products/${id}`);
}

export async function restoreProduct(id: string): Promise<void> {
  await api.post(`/pos/products/${id}/restore`);
}

// ─── Order API ────────────────────────────────────────────────────────────────

export interface CreateOrderPayload {
  items:          { productId: string; quantity: number }[];
  discountType?:  DiscountType;
  discountValue?: number;
  paymentMethod:  PaymentMethod;
  memberId?:      string;
  note?:          string;
}

export interface OrderListParams {
  from?:          string;
  to?:            string;
  memberId?:      string;
  paymentMethod?: PaymentMethod;
  page?:          number;
  limit?:         number;
}

export interface OrderListResponse {
  data: PosOrder[];
  meta: { total: number; page: number; limit: number; pages: number };
}

export async function createOrder(payload: CreateOrderPayload): Promise<PosOrder> {
  const res = await api.post<ApiResponse<PosOrder>>('/pos/orders', payload);
  return res.data.data!;
}

export async function listOrders(params?: OrderListParams): Promise<OrderListResponse> {
  const res = await api.get<{ success: boolean; data: PosOrder[]; meta: OrderListResponse['meta'] }>('/pos/orders', { params });
  return { data: res.data.data, meta: res.data.meta };
}

export async function getOrder(id: string): Promise<PosOrder> {
  const res = await api.get<ApiResponse<PosOrder>>(`/pos/orders/${id}`);
  return res.data.data!;
}

// ─── Reports API ──────────────────────────────────────────────────────────────

export async function getPosSummary(period?: 'today' | 'week' | 'month'): Promise<PosSummary> {
  const res = await api.get<ApiResponse<PosSummary>>('/pos/reports/summary', { params: { period } });
  return res.data.data!;
}
