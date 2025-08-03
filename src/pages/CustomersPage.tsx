import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import apiClient from "@/services/api";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  PlusCircle,
  MoreHorizontal,
  User,
  Filter,
  Search,
} from "lucide-react";
import { PhoneFormat } from "@/helper/phoneFormater";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// Tipagens
interface Customer {
  _id: string;
  name: string;
  phone: string;
  imageUrl?: string;
  createdAt: string;
  subscriptions?: Subscription[];
}

interface Subscription {
  _id: string;
  status: "active" | "expired" | "cancelled";
  startDate: string;
  endDate: string;
  plan: Plan;
}

interface Plan {
  _id: string;
  name: string;
  description?: string;
  price: number;
  durationInDays: number;
}

interface AdminOutletContext {
  barbershopId: string;
}

export function CustomersPage() {
  const { barbershopId } = useOutletContext<AdminOutletContext>();

  // Estados de dados
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "with-plan" | "without-plan"
  >("all");

  // Estados para o modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Função para buscar todos os dados da página
  const fetchPageData = async () => {
    if (!barbershopId) return;
    setIsLoading(true);
    try {
      const [customersRes, plansRes] = await Promise.all([
        apiClient.get(`/api/barbershops/${barbershopId}/admin/customers`),
        apiClient.get(`/api/barbershops/${barbershopId}/plans`),
      ]);
      setCustomers(customersRes.data);
      setPlans(plansRes.data);
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados da página.");
    } finally {
      setIsLoading(false);
    }
  };

  // Efeito para filtrar clientes
  useEffect(() => {
    let filtered = customers;

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.phone.includes(searchTerm)
      );
    }

    // Filtro por status do plano
    if (filterStatus !== "all") {
      filtered = filtered.filter((customer) => {
        const hasActivePlan = customer.subscriptions?.some(
          (sub) => sub.status === "active"
        );
        return filterStatus === "with-plan" ? hasActivePlan : !hasActivePlan;
      });
    }

    setFilteredCustomers(filtered);
  }, [customers, searchTerm, filterStatus]);

  useEffect(() => {
    fetchPageData();
  }, [barbershopId]);

  // Funções para controlar o modal
  const handleOpenSubscribeModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedPlanId("");
    setIsModalOpen(true);
  };

  // Função para atribuir o plano ao cliente
  const handleSubscribeCustomer = async () => {
    if (!selectedCustomer || !selectedPlanId) {
      toast.error("Por favor, selecione um plano.");
      return;
    }
    setIsSubscribing(true);
    try {
      await apiClient.post(
        `/api/barbershops/${barbershopId}/admin/customers/${selectedCustomer._id}/subscribe`,
        {
          planId: selectedPlanId,
        }
      );

      toast.success(`${selectedCustomer.name} agora tem um novo plano!`);
      setIsModalOpen(false);

      // Recarrega os dados para mostrar o novo plano
      await fetchPageData();
    } catch (error: any) {
      console.error("Erro ao atribuir plano:", error);
      toast.error(error.response?.data?.error || "Falha ao atribuir o plano.");
    } finally {
      setIsSubscribing(false);
    }
  };

  // Função para formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  // Função para calcular dias restantes do plano
  const getDaysRemaining = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-10">
        <Loader2 className="animate-spin h-8 w-8" />
        <span className="ml-2">Carregando clientes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {customers.length} cliente{customers.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Busca */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filtro por status */}
            <div className="sm:w-48">
              <Select
                value={filterStatus}
                onValueChange={(value: any) => setFilterStatus(value)}
              >
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  <SelectItem value="with-plan">Com plano ativo</SelectItem>
                  <SelectItem value="without-plan">Sem plano</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Clientes */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            {filteredCustomers.length} cliente
            {filteredCustomers.length !== 1 ? "s" : ""} encontrado
            {filteredCustomers.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Plano Ativo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cliente desde</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => {
                    const activeSubscription = customer.subscriptions?.find(
                      (sub) => sub.status === "active"
                    );
                    const daysRemaining = activeSubscription
                      ? getDaysRemaining(activeSubscription.endDate)
                      : null;

                    return (
                      <TableRow key={customer._id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {customer.imageUrl ? (
                                <img
                                  src={customer.imageUrl}
                                  alt={customer.name}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                  <User className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{customer.name}</div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center">
                            <a
                              href={`https://wa.me/${customer.phone}`}
                              className="underline"
                            >
                              {PhoneFormat(customer.phone)}
                            </a>
                          </div>
                        </TableCell>

                        <TableCell>
                          {activeSubscription ? (
                            <div className="space-y-1">
                              <div className="flex items-center">
                                {/* <Crown className="mr-2 h-4 w-4 text-yellow-500" /> */}
                                <span className="font-medium">
                                  {activeSubscription.plan.name}
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                R\$ {activeSubscription.plan.price.toFixed(2)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              Nenhum plano
                            </span>
                          )}
                        </TableCell>

                        <TableCell>
                          {activeSubscription ? (
                            <div className="space-y-1">
                              <Badge
                                variant={
                                  daysRemaining && daysRemaining > 7
                                    ? "default"
                                    : "destructive"
                                }
                                className="text-xs"
                              >
                                {daysRemaining && daysRemaining > 0
                                  ? `${daysRemaining} dias restantes`
                                  : daysRemaining === 0
                                  ? "Expira hoje"
                                  : "Expirado"}
                              </Badge>
                              <div className="text-xs text-muted-foreground">
                                Até {formatDate(activeSubscription.endDate)}
                              </div>
                            </div>
                          ) : (
                            <Badge variant="outline">Sem plano</Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center text-sm text-muted-foreground">
                            {formatDate(customer.createdAt)}
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  handleOpenSubscribeModal(customer)
                                }
                              >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                {activeSubscription
                                  ? "Alterar Plano"
                                  : "Atribuir Plano"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <User className="h-8 w-8 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {searchTerm || filterStatus !== "all"
                            ? "Nenhum cliente encontrado com os filtros aplicados."
                            : "Nenhum cliente encontrado."}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal para Atribuir/Alterar Plano */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedCustomer?.subscriptions?.some(
                (sub) => sub.status === "active"
              )
                ? "Alterar Plano"
                : "Atribuir Plano"}{" "}
              para {selectedCustomer?.name}
            </DialogTitle>
            <DialogDescription>
              Selecione um dos planos cadastrados para vincular a este cliente.
              {selectedCustomer?.subscriptions?.some(
                (sub) => sub.status === "active"
              ) && (
                <span className="block mt-2 text-amber-600">
                  ⚠️ O plano atual será substituído pelo novo plano selecionado.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="planSelect">Planos Disponíveis</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger id="planSelect" className="mt-1">
                  <SelectValue placeholder="Selecione um plano..." />
                </SelectTrigger>
                <SelectContent>
                  {plans.length > 0 ? (
                    plans.map((plan) => (
                      <SelectItem key={plan._id} value={plan._id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{plan.name}</span>
                          <span className="text-sm text-muted-foreground">
                            R\$ {plan.price.toFixed(2)} • {plan.durationInDays}{" "}
                            dias
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Nenhum plano cadastrado.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Preview do plano selecionado */}
            {selectedPlanId && (
              <div className="p-3 bg-muted rounded-lg">
                {(() => {
                  const selectedPlan = plans.find(
                    (p) => p._id === selectedPlanId
                  );
                  if (!selectedPlan) return null;

                  return (
                    <div className="space-y-2">
                      <h4 className="font-medium">Resumo do Plano:</h4>
                      <div className="text-sm space-y-1">
                        <div>
                          📋 <strong>Nome:</strong> {selectedPlan.name}
                        </div>
                        <div>
                          💰 <strong>Preço:</strong> R\${" "}
                          {selectedPlan.price.toFixed(2)}
                        </div>
                        <div>
                          ⏰ <strong>Duração:</strong>{" "}
                          {selectedPlan.durationInDays} dias
                        </div>
                        {selectedPlan.description && (
                          <div>
                            �� <strong>Descrição:</strong>{" "}
                            {selectedPlan.description}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubscribeCustomer}
              disabled={isSubscribing || !selectedPlanId}
            >
              {isSubscribing && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
