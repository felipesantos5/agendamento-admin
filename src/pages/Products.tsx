// components/ProductManagement.tsx
import { useState, useEffect, ChangeEvent } from "react"; // Added ChangeEvent
import {
  Plus,
  Search,
  Filter,
  AlertTriangle,
  MoreHorizontal,
  Edit,
  Package,
  Trash2,
  Loader2, // Added Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose, // Added DialogClose
  DialogDescription, // Added DialogDescription
  DialogFooter, // Added DialogFooter
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
import { ImageUploader } from "./ImageUploader"; // Import ImageUploader

import { API_BASE_URL } from "@/config/BackendUrl";
import { useOutletContext } from "react-router-dom";
import apiClient from "@/services/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Product } from "@/types/product";

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
  const [isUploadingImage, setIsUploadingImage] = useState(false); // State for image upload status

  // Form states
  interface ProductForm {
    name: string;
    brand: string;
    category: string;
    description: string;
    price: { purchase: number; sale: number };
    stock: { current: number; minimum: number; maximum?: number };
    status: "ativo" | "inativo" | "descontinuado";
    image: string;
  }

  const [productForm, setProductForm] = useState<ProductForm>({
    name: "",
    brand: "",
    category: "",
    description: "",
    price: { purchase: 0, sale: 0 },
    stock: { current: 0, minimum: 5, maximum: 0 },
    status: "ativo",
    image: "",
  });
  const [productImageFile, setProductImageFile] = useState<File | null>(null); // State for the selected image file

  const [stockForm, setStockForm] = useState({
    type: "entrada",
    quantity: 1,
    reason: "",
    unitCost: 0,
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // API Calls
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.search) params.append("search", filters.search);
      if (filters.category !== "all") params.append("category", filters.category);
      if (filters.status !== "all") params.append("status", filters.status);
      if (filters.lowStock) params.append("lowStock", "true");

      const response = await apiClient.get(`${API_BASE_URL}/api/barbershops/${barbershopId}/products?${params}`);
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
    if (productForm.price.purchase < 0) newErrors.purchasePrice = "Preço de compra deve ser positivo";
    if (productForm.price.sale < 0) newErrors.salePrice = "Preço de venda deve ser positivo";
    if (productForm.stock.current < 0) newErrors.currentStock = "Estoque atual deve ser positivo";
    if (productForm.stock.minimum < 0) newErrors.minimumStock = "Estoque mínimo deve ser positivo";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStock = () => {
    const newErrors: Record<string, string> = {};

    if (stockForm.quantity <= 0) newErrors.quantity = "Quantidade deve ser maior que zero";
    if (stockForm.unitCost < 0) newErrors.unitCost = "Custo unitário deve ser positivo";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- MODIFIED saveProduct FUNCTION ---
  const saveProduct = async () => {
    if (!validateProduct()) return;

    setSubmitting(true);
    let finalImageUrl = productForm.image || ""; // Start with existing or empty URL

    try {
      // Step 1: Upload Image if a new file is selected
      if (productImageFile) {
        setIsUploadingImage(true);
        const imageFormData = new FormData();
        imageFormData.append("productImageFile", productImageFile); // Match backend field name

        try {
          const uploadResponse = await apiClient.post(
            `${API_BASE_URL}/api/upload/product-image`, // Your image upload endpoint
            imageFormData,
            { headers: { "Content-Type": "multipart/form-data" } } // Important for file uploads
          );
          finalImageUrl = uploadResponse.data.imageUrl; // Get URL from backend response
          setProductImageFile(null); // Clear file state after successful upload
        } catch (uploadError: any) {
          console.error("Erro no upload da imagem:", uploadError);
          toast.error(uploadError.response?.data?.error || "Falha ao fazer upload da imagem.");
          setIsUploadingImage(false);
          setSubmitting(false);
          return; // Stop if image upload fails
        } finally {
          setIsUploadingImage(false);
        }
      }

      // Step 2: Prepare product data with the final image URL
      const productDataPayload = {
        ...productForm,
        image: finalImageUrl, // Use the uploaded URL or the existing one
        _id: selectedProduct?._id, // Add _id if editing an existing product
      };
      // Remove _id if it exists, as it shouldn't be in the payload for creation/update body
      const { _id, ...payloadWithoutId } = productDataPayload;

      if (selectedProduct) {
        // Update existing product
        await apiClient.put(
          `${API_BASE_URL}/api/barbershops/${barbershopId}/products/${selectedProduct._id}`,
          payloadWithoutId // Send payload without _id
        );
        toast.success("Produto atualizado");
      } else {
        // Create new product
        await apiClient.post(
          `${API_BASE_URL}/api/barbershops/${barbershopId}/products`,
          payloadWithoutId // Send payload without _id
        );
        toast.success("Produto criado");
      }

      setProductModal(false);
      resetProductForm();
      fetchProducts(); // Refresh the product list
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Erro ao salvar produto";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };
  // --- END OF MODIFIED saveProduct FUNCTION ---

  const deleteProduct = async () => {
    if (!selectedProduct) return;

    try {
      setSubmitting(true);
      await apiClient.delete(
        // Changed to use apiClient.delete directly
        `${API_BASE_URL}/api/barbershops/${barbershopId}/products/${selectedProduct._id}`
      );

      toast.success("Produto deletado");
      setDeleteDialog(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erro ao deletar produto");
    } finally {
      setSubmitting(false);
    }
  };

  const moveStock = async () => {
    if (!validateStock() || !selectedProduct) return;

    try {
      setSubmitting(true);
      // Correctly use apiClient.post for stock movement
      await apiClient.post(
        `${API_BASE_URL}/api/barbershops/${barbershopId}/products/${selectedProduct._id}/stock`,
        stockForm // Send stockForm data directly in the body
      );

      toast.success("Estoque movimentado");
      setStockModal(false);
      resetStockForm();
      fetchProducts();
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || "Erro ao movimentar estoque";
      toast.error(message);
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
      description: "",
      price: { purchase: 0, sale: 0 },
      stock: { current: 0, minimum: 5, maximum: 0 },
      status: "ativo",
      image: "", // Reset image field
    });
    setProductImageFile(null); // Reset image file state
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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (barbershopId) fetchProducts();
    }, 500);
    return () => clearTimeout(timer);
  }, [filters, barbershopId]);

  const openProductModal = (product?: Product) => {
    if (product) {
      setSelectedProduct(product);
      setProductForm({
        name: product.name,
        brand: product.brand || "",
        category: product.category,
        description: product.description || "",
        price: product.price,
        stock: {
          current: product.stock.current,
          minimum: product.stock.minimum,
          maximum: product.stock.maximum || 0,
        },
        status: product.status,
        image: product.image || "",
      });
      setProductImageFile(null);
    } else {
      resetProductForm();
    }
    setErrors({});
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Produtos</h1>
          <p className="text-muted-foreground">Gerencie o estoque da sua barbearia</p>
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
              {lowStockCount} produto{lowStockCount > 1 ? "s" : ""} com estoque baixo
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
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          />
        </div>

        <Select value={filters.category} onValueChange={(value) => setFilters((prev) => ({ ...prev, category: value }))}>
          <SelectTrigger className="w-full sm:w-48">
            {/* Changed placeholder to SelectValue for correct display */}
            <SelectValue placeholder="Todas Categorias" />
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

        <Select value={filters.status} onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Status" />
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
          onClick={() => setFilters((prev) => ({ ...prev, lowStock: !prev.lowStock }))}
          className={filters.lowStock ? "bg-orange-50 border-orange-300" : ""}
        >
          <Filter className="w-4 h-4 mr-2" />
          Baixo Estoque
        </Button>
      </div>

      {/* Tabela */}
      <div className="border rounded-lg overflow-x-auto">
        {" "}
        {/* Added overflow-x-auto */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>Preços</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12 text-right"></TableHead> {/* Added text-right */}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" /> {/* Use Loader2 */}
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum produto encontrado
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {/* Add Product Image */}
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-muted-foreground">
                          <Package className="h-5 w-5" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{product.name}</div>
                        {product.brand && <div className="text-sm text-muted-foreground">{product.brand}</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-center sm:text-left">
                      {" "}
                      {/* Centered on small screens */}
                      {product.isLowStock ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {product.stock.current}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{product.stock.current}</Badge>
                      )}
                      <div className="text-xs text-muted-foreground">Mín: {product.stock.minimum}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-right sm:text-left">
                      {" "}
                      {/* Right aligned on small screens */}
                      <div>Venda: {formatCurrency(product.price.sale)}</div>
                      <div className="text-muted-foreground">Compra: {formatCurrency(product.price.purchase)}</div>
                      <div className="text-xs text-green-600">
                        Margem: {product.profitMargin ? product.profitMargin.toFixed(1) + "%" : "--"} {/* Added check for profitMargin */}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center sm:text-left">
                    {" "}
                    {/* Centered on small screens */}
                    <Badge
                      variant={
                        product.status === "ativo" ? "default" : product.status === "inativo" ? "secondary" : "outline" // Use outline for descontinuado
                      }
                      className={product.status === "ativo" ? "bg-green-100 text-green-800 border-green-200" : ""} // Custom active style
                    >
                      {product.status.charAt(0).toUpperCase() + product.status.slice(1)} {/* Capitalize status */}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {" "}
                    {/* Ensure actions are right-aligned */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          {" "}
                          {/* Use icon size */}
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openProductModal(product)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openStockModal(product)}>
                          <Package className="w-4 h-4 mr-2" />
                          Movimentar Estoque
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedProduct(product);
                            setDeleteDialog(true);
                          }}
                          className="text-red-600 focus:bg-red-50 focus:text-red-700" // Destructive style
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
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle>
            <DialogDescription>{selectedProduct ? "Atualize os detalhes do produto." : "Preencha as informações do novo produto."}</DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-grow pr-6 -mr-6 overflow-y-scroll">
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label>Imagem do Produto</Label>
                <ImageUploader initialImageUrl={productForm.image || null} onFileSelect={setProductImageFile} aspectRatio="square" label="" />
                {isUploadingImage && <p className="text-sm text-blue-500">Enviando imagem...</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria *</Label>
                  <Select value={productForm.category} onValueChange={(value) => setProductForm((prev) => ({ ...prev, category: value }))}>
                    <SelectTrigger className="w-full">
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
                  {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={productForm.status}
                    onValueChange={(value: "ativo" | "inativo" | "descontinuado") => setProductForm((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione" />
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
                  rows={3} // Increased rows
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Preço de Compra *</Label>
                  <Input
                    id="purchasePrice"
                    type="number"
                    step="0.01"
                    min="0" // Added min attribute
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
                  {errors.purchasePrice && <p className="text-sm text-red-500">{errors.purchasePrice}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salePrice">Preço de Venda *</Label>
                  <Input
                    id="salePrice"
                    type="number"
                    step="0.01"
                    min="0" // Added min attribute
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
                  {errors.salePrice && <p className="text-sm text-red-500">{errors.salePrice}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentStock">Estoque Atual *</Label>
                  <Input
                    id="currentStock"
                    type="number"
                    min="0" // Added min attribute
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
                  {errors.currentStock && <p className="text-sm text-red-500">{errors.currentStock}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minimumStock">Estoque Mínimo *</Label>
                  <Input
                    id="minimumStock"
                    type="number"
                    min="0" // Added min attribute
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
                  {errors.minimumStock && <p className="text-sm text-red-500">{errors.minimumStock}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maximumStock">Estoque Máximo</Label>
                  <Input
                    id="maximumStock"
                    type="number"
                    min="0" // Added min attribute
                    value={productForm.stock.maximum || ""} // Handle potentially undefined value
                    onChange={(e) =>
                      setProductForm((prev) => ({
                        ...prev,
                        stock: {
                          ...prev.stock,
                          // Use null if empty, otherwise parse int
                          maximum: e.target.value === "" ? undefined : parseInt(e.target.value) || 0,
                        },
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Sticky Footer */}
          <DialogFooter className="pt-4 border-t flex-shrink-0">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button onClick={saveProduct} disabled={submitting || isUploadingImage}>
              {(submitting || isUploadingImage) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isUploadingImage ? "Enviando Imagem..." : submitting ? "Salvando..." : selectedProduct ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Estoque */}
      <Dialog open={stockModal} onOpenChange={setStockModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Movimentar Estoque</DialogTitle>
            <DialogDescription>Ajuste a quantidade em estoque do produto selecionado.</DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="bg-muted/50 p-4 rounded-lg my-4 border">
              <div className="flex items-center gap-3">
                {selectedProduct.image ? (
                  <img src={selectedProduct.image} alt={selectedProduct.name} className="h-12 w-12 rounded object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded bg-muted flex items-center justify-center text-muted-foreground">
                    <Package className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <h3 className="font-medium">{selectedProduct.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedProduct.brand}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm">Estoque atual:</span>
                    <Badge variant="outline">{selectedProduct.stock.current}</Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="stockType">Tipo *</Label>
              <Select
                value={stockForm.type}
                onValueChange={(value: "entrada" | "saida" | "ajuste" | "perda" | "venda") => setStockForm((prev) => ({ ...prev, type: value }))}
              >
                <SelectTrigger id="stockType" className="w-full">
                  <SelectValue placeholder="Selecione o tipo" />
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
                min="1"
                value={stockForm.quantity}
                onChange={(e) =>
                  setStockForm((prev) => ({
                    ...prev,
                    quantity: parseInt(e.target.value) || 1,
                  }))
                }
              />
              {errors.quantity && <p className="text-sm text-red-500">{errors.quantity}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo *</Label>
              <Input
                id="reason"
                value={stockForm.reason}
                onChange={(e) => setStockForm((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Ex: Compra de fornecedor, Venda balcão"
              />
              {errors.reason && <p className="text-sm text-red-500">{errors.reason}</p>}
            </div>
            {(stockForm.type === "entrada" || stockForm.type === "ajuste") && (
              <div className="space-y-2">
                <Label htmlFor="unitCost">Custo Unitário (R$)</Label>
                <Input
                  id="unitCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={stockForm.unitCost}
                  onChange={(e) =>
                    setStockForm((prev) => ({
                      ...prev,
                      unitCost: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
                {errors.unitCost && <p className="text-sm text-red-500">{errors.unitCost}</p>}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={stockForm.notes}
                onChange={(e) => setStockForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Alguma nota adicional?"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button onClick={moveStock} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Movimentação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Delete */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar "{selectedProduct?.name}"? Esta ação não pode ser desfeita e removerá o produto permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteProduct} className="bg-destructive hover:bg-destructive/90" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
