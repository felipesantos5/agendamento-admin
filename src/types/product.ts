// types/product.ts
export interface Product {
  _id: string;
  name: string;
  description?: string;
  category: string;
  brand?: string;
  barcode?: string;
  price: {
    purchase: number;
    sale: number;
  };
  stock: {
    current: number;
    minimum: number;
    maximum?: number;
  };
  unit: string;
  supplier?: {
    name?: string;
    contact?: string;
    phone?: string;
  };
  image?: string;
  status: "ativo" | "inativo" | "descontinuado";
  isLowStock: boolean;
  profitMargin: number;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  _id: string;
  type: "entrada" | "saida" | "ajuste" | "perda" | "venda";
  quantity: number;
  reason: string;
  previousStock: number;
  newStock: number;
  unitCost?: number;
  totalCost?: number;
  notes?: string;
  createdAt: string;
}
