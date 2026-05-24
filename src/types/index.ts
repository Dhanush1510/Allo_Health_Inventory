export type User = {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
};

export type WarehouseStock = {
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  city: string;
  total: number;
  reserved: number;
  available: number;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string | null;
  category?: string | null;
  packSize?: string | null;
  ingredients?: string | null;
  material?: string | null;
  highlights?: string[];
  stocks: WarehouseStock[];
};

export type Reservation = {
  id: string;
  productId: string;
  warehouseId: string;
  units: number;
  status: 'PENDING' | 'CONFIRMED' | 'RELEASED';
  expiresAt: string;
  createdAt: string;
  product: {
    id: string;
    sku: string;
    name: string;
    description: string;
    price: number;
    imageUrl?: string | null;
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
    city: string;
  };
};

export type TabId = 'shop' | 'reserved' | 'orders';
