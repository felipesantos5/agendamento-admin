// components/ProductManagement.tsx
import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  AlertTriangle,
  MoreHorizontal,
  Edit,
  Package,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Product {
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

import { API_BASE_URL } from "@/config/BackendUrl";
import { useOutletContext } from "react-router-dom";
import apiClient from "@/services/api";

interface AdminOutletContext {
  barbershopId: string;
  barbershopName: string;
}

export const ProductManagement = () => {
  const { barbershopId } = useOutletContext<AdminOutletContext>();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    category: "all",
    status: "ativo",
    lowStock: false,
  });

  // Modals
  const [productModal, setProductModal] = useState(false);
  const [stockModal, setStockModal] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [productForm, setProductForm] = useState({
    name: "",
    brand: "",
    category: "",
    barcode: "",
    description: "",
    price: { purchase: 0, sale: 0 },
    stock: { current: 0, minimum: 5, maximum: 0 },
    unit: "unidade",
    status: "ativo",
  });

  const [stockForm, setStockForm] = useState({
    type: "entrada",
    quantity: 1,
    reason: "",
    unitCost: 0,
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  // API Calls
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.search) params.append("search", filters.search);
      if (filters.category !== "all")
        params.append("category", filters.category);
      if (filters.status !== "all") params.append("status", filters.status);
      if (filters.lowStock) params.append("lowStock", "true");

      const response = await apiClient.get(
        `${API_BASE_URL}/api/barbershops/${barbershopId}/products?${params}`,
        { headers }
      );
      setProducts(response.data.products);
    } catch (error) {
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  };

  // Validations
  const validateProduct = () => {
    const newErrors: Record<string, string> = {};

    if (!productForm.name.trim()) newErrors.name = "Nome é obrigatório";
    if (!productForm.category) newErrors.category = "Categoria é obrigatória";
    if (!productForm.unit) newErrors.unit = "Unidade é obrigatória";
    if (productForm.price.purchase < 0)
      newErrors.purchasePrice = "Preço de compra deve ser positivo";
    if (productForm.price.sale < 0)
      newErrors.salePrice = "Preço de venda deve ser positivo";
    if (productForm.stock.current < 0)
      newErrors.currentStock = "Estoque atual deve ser positivo";
    if (productForm.stock.minimum < 0)
      newErrors.minimumStock = "Estoque mínimo deve ser positivo";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStock = () => {
    const newErrors: Record<string, string> = {};

    if (stockForm.quantity <= 0)
      newErrors.quantity = "Quantidade deve ser maior que zero";
    if (!stockForm.reason.trim()) newErrors.reason = "Motivo é obrigatório";
    if (stockForm.unitCost < 0)
      newErrors.unitCost = "Custo unitário deve ser positivo";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveProduct = async () => {
    if (!validateProduct()) return;

    try {
      setSubmitting(true);

      if (selectedProduct) {
        // Atualizar produto existente
        await apiClient.put(
          `/api/barbershops/${barbershopId}/products/${selectedProduct._id}`,
          productForm
        );
        toast.success("Produto atualizado");
      } else {
        // Criar novo produto
        await apiClient.post(
          `/api/barbershops/${barbershopId}/products`,
          productForm
        );
        toast.success("Produto criado");
      }

      setProductModal(false);
      resetProductForm();
      fetchProducts();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || "Erro ao salvar produto";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteProduct = async () => {
    if (!selectedProduct) return;

    try {
      setSubmitting(true);
      const response = await apiClient.get(
        `${API_BASE_URL}/api/barbershops/${barbershopId}/products/${selectedProduct._id}`,
        {
          method: "DELETE",
          headers,
        }
      );

      // Como estamos usando Axios, a propriedade 'ok' não existe.
      // Podemos verificar o status da resposta para garantir que foi bem-sucedida.
      if (response.status < 200 || response.status >= 300)
        throw new Error("Erro ao deletar produto");

      toast.success("Produto deletado");
      setDeleteDialog(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch (error) {
      toast.error("Erro ao deletar produto");
    } finally {
      setSubmitting(false);
    }
  };

  const moveStock = async () => {
    if (!validateStock() || !selectedProduct) return;

    try {
      setSubmitting(true);
      const response = await apiClient.post(
        `${API_BASE_URL}/api/barbershops/${barbershopId}/products/${selectedProduct._id}/stock`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(stockForm),
        }
      );

      // Como estamos usando Axios, a propriedade 'ok' não existe.
      // Podemos verificar o status da resposta para garantir que foi bem-sucedida.
      if (response.status < 200 || response.status >= 300) {
        const error = response.data?.error || "Erro ao movimentar estoque";
        throw new Error(error);
      }

      toast.success("Estoque movimentado");
      setStockModal(false);
      resetStockForm();
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Form helpers
  const resetProductForm = () => {
    setProductForm({
      name: "",
      brand: "",
      category: "",
      barcode: "",
      description: "",
      price: { purchase: 0, sale: 0 },
      stock: { current: 0, minimum: 5, maximum: 0 },
      unit: "unidade",
      status: "ativo",
    });
    setSelectedProduct(null);
    setErrors({});
  };

  const resetStockForm = () => {
    setStockForm({
      type: "entrada",
      quantity: 1,
      reason: "",
      unitCost: 0,
      notes: "",
    });
    setSelectedProduct(null);
    setErrors({});
  };

  // Effects
  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 500);
    return () => clearTimeout(timer);
  }, [filters]);

  // Handlers
  const openProductModal = (product?: Product) => {
    if (product) {
      setSelectedProduct(product);
      setProductForm({
        name: product.name,
        brand: product.brand || "",
        category: product.category,
        barcode: product.barcode || "",
        description: product.description || "",
        price: product.price,
        stock: {
          current: product.stock.current,
          minimum: product.stock.minimum,
          maximum: product.stock.maximum || 0,
        },
        unit: product.unit,
        status: product.status,
      });
    } else {
      resetProductForm();
    }
    setProductModal(true);
  };

  const openStockModal = (product: Product) => {
    setSelectedProduct(product);
    setStockForm({
      type: "entrada",
      quantity: 1,
      reason: "",
      unitCost: product.price.purchase,
      notes: "",
    });
    setErrors({});
    setStockModal(true);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const lowStockCount = products.filter((p) => p.isLowStock).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie o estoque da sua barbearia
          </p>
        </div>
        <Button onClick={() => openProductModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      {/* Alerta baixo estoque */}
      {lowStockCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <span className="font-medium text-orange-800">
              {lowStockCount} produto{lowStockCount > 1 ? "s" : ""} com estoque
              baixo
            </span>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            className="pl-10"
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
          />
        </div>

        <Select
          value={filters.category}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, category: value }))
          }
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Categorias</SelectItem>
            <SelectItem value="pomada">Pomada</SelectItem>
            <SelectItem value="gel">Gel</SelectItem>
            <SelectItem value="shampoo">Shampoo</SelectItem>
            <SelectItem value="condicionador">Condicionador</SelectItem>
            <SelectItem value="minoxidil">Minoxidil</SelectItem>
            <SelectItem value="oleo">Óleo</SelectItem>
            <SelectItem value="cera">Cera</SelectItem>
            <SelectItem value="spray">Spray</SelectItem>
            <SelectItem value="outros">Outros</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.status}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, status: value }))
          }
        >
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
            <SelectItem value="descontinuado">Descontinuado</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() =>
            setFilters((prev) => ({ ...prev, lowStock: !prev.lowStock }))
          }
          className={filters.lowStock ? "bg-orange-50 border-orange-300" : ""}
        >
          <Filter className="w-4 h-4 mr-2" />
          Baixo Estoque
        </Button>
      </div>

      {/* Tabela */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>Preços</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  Nenhum produto encontrado
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product._id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{product.name}</div>
                      {product.brand && (
                        <div className="text-sm text-muted-foreground">
                          {product.brand}
                        </div>
                      )}
                      {product.barcode && (
                        <div className="text-xs text-muted-foreground">
                          {product.barcode}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{product.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {product.isLowStock ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {product.stock.current}
                        </Badge>
                      ) : (
                        <Badge variant="outline">{product.stock.current}</Badge>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Mín: {product.stock.minimum} {product.unit}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>Venda: {formatCurrency(product.price.sale)}</div>
                      <div className="text-muted-foreground">
                        Compra: {formatCurrency(product.price.purchase)}
                      </div>
                      <div className="text-xs text-green-600">
                        Margem: {product.profitMargin.toFixed(1)}%
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        product.status === "ativo" ? "default" : "secondary"
                      }
                    >
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openProductModal(product)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openStockModal(product)}
                        >
                          <Package className="w-4 h-4 mr-2" />
                          Movimentar Estoque
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedProduct(product);
                            setDeleteDialog(true);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Deletar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Produto */}
      <Dialog open={productModal} onOpenChange={setProductModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedProduct ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={productForm.name}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Nome do produto"
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Marca</Label>
                <Input
                  id="brand"
                  value={productForm.brand}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      brand: e.target.value,
                    }))
                  }
                  placeholder="Marca"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select
                  value={productForm.category}
                  onValueChange={(value) =>
                    setProductForm((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pomada">Pomada</SelectItem>
                    <SelectItem value="gel">Gel</SelectItem>
                    <SelectItem value="shampoo">Shampoo</SelectItem>
                    <SelectItem value="condicionador">Condicionador</SelectItem>
                    <SelectItem value="minoxidil">Minoxidil</SelectItem>
                    <SelectItem value="oleo">Óleo</SelectItem>
                    <SelectItem value="cera">Cera</SelectItem>
                    <SelectItem value="spray">Spray</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-red-500">{errors.category}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unidade *</Label>
                <Select
                  value={productForm.unit}
                  onValueChange={(value) =>
                    setProductForm((prev) => ({ ...prev, unit: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unidade">Unidade</SelectItem>
                    <SelectItem value="ml">ML</SelectItem>
                    <SelectItem value="g">Gramas</SelectItem>
                    <SelectItem value="kg">Kg</SelectItem>
                    <SelectItem value="litro">Litro</SelectItem>
                  </SelectContent>
                </Select>
                {errors.unit && (
                  <p className="text-sm text-red-500">{errors.unit}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={productForm.status}
                  onValueChange={(value) =>
                    setProductForm((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="descontinuado">Descontinuado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode">Código de Barras</Label>
              <Input
                id="barcode"
                value={productForm.barcode}
                onChange={(e) =>
                  setProductForm((prev) => ({
                    ...prev,
                    barcode: e.target.value,
                  }))
                }
                placeholder="Código de barras"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={productForm.description}
                onChange={(e) =>
                  setProductForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Descrição do produto"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchasePrice">Preço de Compra *</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  step="0.01"
                  value={productForm.price.purchase}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      price: {
                        ...prev.price,
                        purchase: parseFloat(e.target.value) || 0,
                      },
                    }))
                  }
                />
                {errors.purchasePrice && (
                  <p className="text-sm text-red-500">{errors.purchasePrice}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="salePrice">Preço de Venda *</Label>
                <Input
                  id="salePrice"
                  type="number"
                  step="0.01"
                  value={productForm.price.sale}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      price: {
                        ...prev.price,
                        sale: parseFloat(e.target.value) || 0,
                      },
                    }))
                  }
                />
                {errors.salePrice && (
                  <p className="text-sm text-red-500">{errors.salePrice}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentStock">Estoque Atual *</Label>
                <Input
                  id="currentStock"
                  type="number"
                  value={productForm.stock.current}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      stock: {
                        ...prev.stock,
                        current: parseInt(e.target.value) || 0,
                      },
                    }))
                  }
                />
                {errors.currentStock && (
                  <p className="text-sm text-red-500">{errors.currentStock}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="minimumStock">Estoque Mínimo *</Label>
                <Input
                  id="minimumStock"
                  type="number"
                  value={productForm.stock.minimum}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      stock: {
                        ...prev.stock,
                        minimum: parseInt(e.target.value) || 0,
                      },
                    }))
                  }
                />
                {errors.minimumStock && (
                  <p className="text-sm text-red-500">{errors.minimumStock}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="maximumStock">Estoque Máximo</Label>
                <Input
                  id="maximumStock"
                  type="number"
                  value={productForm.stock.maximum}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      stock: {
                        ...prev.stock,
                        maximum: parseInt(e.target.value) || 0,
                      },
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setProductModal(false)}
              >
                Cancelar
              </Button>
              <Button onClick={saveProduct} disabled={submitting}>
                {submitting
                  ? "Salvando..."
                  : selectedProduct
                  ? "Atualizar"
                  : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Estoque */}
      <Dialog open={stockModal} onOpenChange={setStockModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Movimentar Estoque</DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h3 className="font-medium">{selectedProduct.name}</h3>
              <p className="text-sm text-muted-foreground">
                {selectedProduct.brand}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm">Estoque atual:</span>
                <Badge variant="outline">
                  {selectedProduct.stock.current} {selectedProduct.unit}
                </Badge>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stockType">Tipo *</Label>
              <Select
                value={stockForm.type}
                onValueChange={(value) =>
                  setStockForm((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                  <SelectItem value="ajuste">Ajuste</SelectItem>
                  <SelectItem value="perda">Perda</SelectItem>
                  <SelectItem value="venda">Venda</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade *</Label>
              <Input
                id="quantity"
                type="number"
                value={stockForm.quantity}
                onChange={(e) =>
                  setStockForm((prev) => ({
                    ...prev,
                    quantity: parseInt(e.target.value) || 0,
                  }))
                }
              />
              {errors.quantity && (
                <p className="text-sm text-red-500">{errors.quantity}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo *</Label>
              <Input
                id="reason"
                value={stockForm.reason}
                onChange={(e) =>
                  setStockForm((prev) => ({ ...prev, reason: e.target.value }))
                }
                placeholder="Motivo da movimentação"
              />
              {errors.reason && (
                <p className="text-sm text-red-500">{errors.reason}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitCost">Custo Unitário</Label>
              <Input
                id="unitCost"
                type="number"
                step="0.01"
                value={stockForm.unitCost}
                onChange={(e) =>
                  setStockForm((prev) => ({
                    ...prev,
                    unitCost: parseFloat(e.target.value) || 0,
                  }))
                }
              />
              {errors.unitCost && (
                <p className="text-sm text-red-500">{errors.unitCost}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={stockForm.notes}
                onChange={(e) =>
                  setStockForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Observações"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStockModal(false)}
              >
                Cancelar
              </Button>
              <Button onClick={moveStock} disabled={submitting}>
                {submitting ? "Salvando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Delete */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar "{selectedProduct?.name}"? Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteProduct}
              className="bg-destructive hover:bg-destructive/90"
              disabled={submitting}
            >
              {submitting ? "Deletando..." : "Deletar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
