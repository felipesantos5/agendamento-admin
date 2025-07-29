import { useEffect, useState, useMemo } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { format, isPast, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Phone,
  PlusCircle,
  Scissors,
  User,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import apiClient from "@/services/api";
import { toast } from "sonner";
import { AgendaView } from "@/components/AgendaView";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

// Contexto do AdminLayout
interface AdminOutletContext {
  barbershopId: string;
  barbershopName: string;
}

// Tipo para os dados do agendamento
interface Booking {
  _id: string;
  customer: {
    name: string;
    phone?: string;
    whatsapp?: string;
  };
  barber: {
    _id: string;
    name: string;
  };
  service: {
    _id: string;
    name: string;
    price: number;
    duration: number;
  };
  time: string;
  status: string;
}

// Tipo para os dados do barbeiro (para o filtro)
interface Barber {
  _id: string;
  name: string;
}

interface PopulatedBooking {
  _id: string;
  time: string; // Vem como string no formato ISO da API
  status: "booked" | "confirmed" | "completed" | "canceled";
  review?: string; // ID da avaliação, se houver

  // Campos que foram populados e podem ser nulos se o item original foi deletado
  customer: {
    _id: string;
    name: string;
    phone: string;
  } | null;

  barber: {
    _id: string;
    name: string;
  } | null;

  service: {
    _id: string;
    name: string;
    price: number;
    duration: number;
  } | null;

  barbershop: {
    _id: string;
    name: string;
    slug: string;
  } | null;
}

interface TimeBlock {
  _id: string;
  title: string;
  startTime: string;
  endTime: string;
  barber: string; // ID do barbeiro
}

const BARBER_COLORS = [
  "#1f77b4",
  "#ff7f0e",
  "#2ca02c",
  "#000000",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#7f7f7f",
  "#bcbd22",
  "#17becf",
];

export function AgendamentosPage() {
  const { barbershopId } = useOutletContext<AdminOutletContext>();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBarbers, setAllBarbers] = useState<Barber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bookingToDelete, setBookingToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBarberId, setSelectedBarberId] = useState<string>(() => {
    // Tenta ler o valor salvo. Se não houver, usa 'all' como padrão.
    return localStorage.getItem("agendaBarberFilter") || "all";
  });
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [newBlockData, setNewBlockData] = useState({
    title: "",
    startTime: null as Date | null,
    endTime: null as Date | null,
    barberId: "",
  });
  const [isCreatingBlock, setIsCreatingBlock] = useState(false);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  const [isBlockDeleteModalOpen, setIsBlockDeleteModalOpen] = useState(false);
  const [isDeletingBlock, setIsDeletingBlock] = useState(false);

  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    // Sempre que 'selectedBarberId' mudar, salva o novo valor no localStorage.
    localStorage.setItem("agendaBarberFilter", selectedBarberId);
  }, [selectedBarberId]);

  const fetchPageData = async () => {
    if (!barbershopId) return;
    setIsLoading(true);
    try {
      const [bookingsRes, barbersRes, timeBlocksRes] = await Promise.all([
        apiClient.get(`/barbershops/${barbershopId}/bookings`),
        apiClient.get(`/barbershops/${barbershopId}/barbers`),
        apiClient.get(`/api/barbershops/${barbershopId}/time-blocks`),
      ]);
      setBookings(bookingsRes.data);
      setAllBarbers(barbersRes.data);
      setTimeBlocks(timeBlocksRes.data);
    } catch (err: any) {
      console.error("Erro ao buscar dados da página:", err);
      toast.error(
        err.response?.data?.error || "Não foi possível carregar os dados."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!barbershopId) return;

    fetchPageData();
  }, [barbershopId]);

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      setIsDeleting(true);
      await apiClient.delete(
        `/barbershops/${barbershopId}/bookings/${bookingId}`
      );
      setBookings(bookings.filter((booking) => booking._id !== bookingId));
      toast.success("Agendamento excluído com sucesso!");
    } catch (error: any) {
      console.error("Erro ao excluir agendamento:", error);
      toast.error(error.response?.data?.error || "Erro ao excluir agendamento");
    } finally {
      setIsDeleting(false);
      setBookingToDelete(null);
    }
  };

  const handleSelectEvent = (event: any) => {
    // O evento da agenda tem o nosso agendamento original no campo 'resource'
    const fullBookingData = event.resource;

    if (!fullBookingData) {
      console.error("Evento não contém dados completos do agendamento.");
      return;
    }

    if (fullBookingData.type === "block") {
      setSelectedBlock(fullBookingData);
      setIsBlockDeleteModalOpen(true);
      return;
    }

    setSelectedBooking(fullBookingData);
    setIsModalOpen(true);
  };

  // 3. Formata os eventos para a agenda, agora usando o mapa de cores
  const agendaEvents = useMemo(() => {
    const barberColorMap = new Map<string, string>();
    allBarbers.forEach((barber, index) => {
      const colorIndex = index % BARBER_COLORS.length;
      barberColorMap.set(barber._id, BARBER_COLORS[colorIndex]);
    });

    const filteredBookings = bookings.filter(
      (b) => selectedBarberId === "all" || b.barber?._id === selectedBarberId
    );
    const bookingEvents = filteredBookings
      .map((booking) => {
        if (!booking.customer || !booking.service) return null;
        const startTime = parseISO(booking.time);
        const serviceDuration = booking.service?.duration || 60;
        const endTime = new Date(startTime.getTime() + serviceDuration * 60000);
        const eventColor = barberColorMap.get(booking.barber?._id) || "#333";

        const now = new Date();
        const isPast = endTime < now;

        return {
          _id: booking._id,
          title: `${booking.customer.name} - ${booking.service.name}`,
          start: startTime,
          end: endTime,
          resource: { ...booking, color: eventColor, type: "booking", isPast },
        };
      })
      .filter((event): event is NonNullable<typeof event> => event !== null);

    const filteredBlocks = timeBlocks.filter(
      (b) => selectedBarberId === "all" || b.barber === selectedBarberId
    );
    const blockEvents = filteredBlocks.map((block) => {
      // Encontra o barbeiro correspondente para pegar o nome e a cor
      const barber = allBarbers.find((b) => b._id === block.barber);
      const eventColor = barber ? barberColorMap.get(barber._id) : "#888888";
      const startTimeBlock = new Date(block.startTime);
      const endTimeBlock = new Date(block.endTime);

      const now = new Date();
      const isPast = endTimeBlock < now;

      return {
        _id: block._id,
        title: block.title,
        start: startTimeBlock,
        end: new Date(block.endTime),
        // Adiciona o nome do barbeiro ao resource para ser usado no componente do evento
        resource: {
          ...block,
          barberName: barber?.name,
          color: eventColor,
          type: "block",
          isPast,
        },
      };
    });

    return [...bookingEvents, ...blockEvents];
  }, [bookings, timeBlocks, selectedBarberId, allBarbers]);

  const handleUpdateBookingStatus = async (
    bookingId: string,
    status: "completed" | "canceled"
  ) => {
    setIsUpdatingStatus(true);
    const originalBookings = [...bookings];

    // Atualização otimista da UI
    setBookings((prev) =>
      prev.map((b) => (b._id === bookingId ? { ...b, status } : b))
    );

    try {
      await apiClient.put(
        `/barbershops/${barbershopId}/bookings/${bookingId}/status`,
        { status }
      );
      toast.success(
        `Agendamento atualizado para "${
          status === "completed" ? "Concluído" : "Cancelado"
        }"!`
      );
      setIsModalOpen(false); // Fecha o modal após a ação
    } catch (error) {
      setBookings(originalBookings); // Reverte em caso de erro
      toast.error("Falha ao atualizar o status do agendamento.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCreateBlock = (slotInfo: { start: Date; end: Date }) => {
    // 1. A biblioteca da agenda nos entrega o objeto 'slotInfo'.
    //    Ele contém as datas de início e fim exatas que você selecionou na grade.
    const { start, end } = slotInfo;

    const initialBarberId = selectedBarberId !== "all" ? selectedBarberId : "";

    // 2. O react-big-calendar trabalha com datas locais, mas quando convertemos para ISO string
    // elas são convertidas para UTC. Precisamos garantir que o horário local seja preservado.
    // Exemplo: se o usuário selecionou 9h no calendário, queremos que seja 9h no horário de Brasília
    const startTime = new Date(start);
    const endTime = new Date(end);

    // 3. Nós salvamos essas datas diretamente no nosso estado 'newBlockData'.
    //    Aqui garantimos que startTime e endTime terão os valores corretos.
    setNewBlockData({
      startTime: startTime,
      endTime: endTime,
      title: "",
      barberId: initialBarberId,
    });

    // 4. Abrimos o modal, que já estará pré-preenchido com esses horários.
    setIsBlockModalOpen(true);
  };

  const handleSaveBlock = async () => {
    if (!newBlockData.title || !newBlockData.barberId) {
      toast.error("O motivo e o profissional são obrigatórios.");
      return;
    }
    setIsCreatingBlock(true);
    try {
      // Garantir que as datas sejam enviadas corretamente
      // Se o usuário selecionou 9h no calendário, queremos que seja 9h no horário de Brasília
      const startTime = newBlockData.startTime;
      const endTime = newBlockData.endTime;

      if (!startTime || !endTime) {
        toast.error("Horários inválidos.");
        return;
      }

      const payload = {
        title: newBlockData.title,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        barberId: newBlockData.barberId,
      };
      await apiClient.post(
        `/api/barbershops/${barbershopId}/time-blocks`,
        payload
      );
      toast.success("Horário bloqueado com sucesso!");
      setIsBlockModalOpen(false);
      fetchPageData();
    } catch (error) {
      toast.error("Ocorreu um erro ao salvar o bloqueio.");
    } finally {
      setIsCreatingBlock(false);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    setIsDeletingBlock(true);
    try {
      await apiClient.delete(
        `/api/barbershops/${barbershopId}/time-blocks/${blockId}`
      );
      toast.success("Bloqueio removido com sucesso!");
      setIsBlockDeleteModalOpen(false);
      setSelectedBlock(null);
      fetchPageData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erro ao remover bloqueio");
    } finally {
      setIsDeletingBlock(false);
    }
  };

  const getStatusInfo = (booking: PopulatedBooking) => {
    // 1. Verifica se a data do agendamento já passou
    const bookingIsPast = isPast(new Date(booking.time));

    // 2. Lógica de status
    // Se o agendamento já passou E o status ainda é "booked",
    // consideramos ele como "Ocorrido" (pendente de confirmação)
    if (bookingIsPast && booking.status === "booked") {
      return {
        text: "Ocorrido",
        className: "bg-yellow-100 text-yellow-800 border-yellow-200",
      };
    }

    // A lógica para os outros status continua a mesma
    switch (booking.status) {
      case "completed":
        return {
          text: "Concluído",
          className: "bg-green-100 text-green-800 border-green-200",
        };
      case "canceled":
        return {
          text: "Cancelado",
          className: "bg-red-100 text-red-800 border-red-200",
        };
      case "confirmed":
        return {
          text: "Confirmado",
          className: "bg-blue-100 text-blue-800 border-blue-200",
        };
      case "booked":
      default:
        return {
          text: "Agendado",
          className: "bg-gray-200 text-gray-800 border-gray-300",
        };
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const getDaysInMonth = (y: number, m: number) =>
    new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) =>
    new Date(y, m, 1).getDay();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = getFirstDayOfMonth(year, month);
  const days = Array(firstDayOfMonth)
    .fill(null)
    .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleDateSelect = (day: number) =>
    setCurrentDate(new Date(year, month, day));

  const isToday = (day: number) =>
    isSameDay(new Date(), new Date(year, month, day));

  const isDateInPast = (day: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zera a hora para comparar apenas o dia
    return new Date(year, month, day) < today;
  };

  if (isLoading && bookings.length === 0 && allBarbers.length === 0)
    return (
      <p className="text-center p-10">Carregando agendamentos e barbeiros...</p>
    );

  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <CardTitle>Agendamentos</CardTitle>

        <Link to="novo-agendamento">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Agendamento
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="w-full sm:w-64 mb-4">
          <Label className="text-sm font-medium">
            Filtrar por Profissional
          </Label>
          <Select value={selectedBarberId} onValueChange={setSelectedBarberId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Ver todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Profissionais</SelectItem>
              {allBarbers.map((barber) => (
                <SelectItem key={barber._id} value={barber._id}>
                  {barber.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full rounded-lg border shadow-sm bg-background mt-4 mb-4 md:hidden">
          <div className="flex items-center justify-between p-3 border-b">
            <span className="text-lg font-semibold">
              {monthNames[month]} {year}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevMonth}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextMonth}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground p-2 border-t">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day, index) => {
              // --- 1. LÓGICA DE ESTILO CENTRALIZADA AQUI ---
              const isSelected = isSameDay(
                currentDate,
                new Date(year, month, day)
              );
              const isPast = isDateInPast(day);

              return (
                <div
                  key={index}
                  className={`p-1 flex items-center justify-center h-12 border-t ${
                    index % 7 !== 0 ? "border-l" : ""
                  }`}
                >
                  {day && (
                    <button
                      type="button"
                      // O botão não é mais desabilitado
                      onClick={() => handleDateSelect(day)}
                      className={`
                                flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors
                                ${/* --- 2. NOVA LÓGICA DE CLASSES --- */ ""}
                                ${
                                  isSelected
                                    ? "bg-primary text-primary-foreground ring-2 ring-ring ring-offset-2" // Prioridade 1: Dia selecionado
                                    : isPast
                                    ? "text-muted-foreground opacity-75 hover:bg-accent" // Prioridade 2: Dia passado
                                    : isToday(day)
                                    ? "bg-accent text-accent-foreground" // Prioridade 3: Dia de hoje
                                    : "hover:bg-accent"
                                }
                              `}
                    >
                      {day}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {/* </div> */}
        <AgendaView
          events={agendaEvents}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleCreateBlock}
          currentDate={currentDate}
          onNavigate={setCurrentDate}
        />

        <Dialog open={isBlockModalOpen} onOpenChange={setIsBlockModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bloquear Horário na Agenda</DialogTitle>
              <DialogDescription>
                Defina um período e um motivo para o bloqueio. Nenhum
                agendamento poderá ser feito neste intervalo.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="blockTitle">Motivo do Bloqueio</Label>
                <Input
                  id="blockTitle"
                  placeholder="Ex: Almoço, Consulta Médica"
                  value={newBlockData.title}
                  onChange={(e) =>
                    setNewBlockData({ ...newBlockData, title: e.target.value })
                  }
                />
              </div>
              {selectedBarberId === "all" && (
                <div className="space-y-2">
                  <Label htmlFor="blockBarber">Profissional</Label>
                  <Select
                    value={newBlockData.barberId}
                    onValueChange={(value) =>
                      setNewBlockData({ ...newBlockData, barberId: value })
                    }
                  >
                    <SelectTrigger id="blockBarber">
                      <SelectValue placeholder="Selecione um profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      {allBarbers.map((barber) => (
                        <SelectItem key={barber._id} value={barber._id}>
                          {barber.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="text-sm text-muted-foreground pt-2">
                <p>
                  <strong>Período:</strong>{" "}
                  {newBlockData.startTime && newBlockData.endTime
                    ? `${format(newBlockData.startTime, "HH:mm")} - ${format(
                        newBlockData.endTime,
                        "HH:mm"
                      )}`
                    : ""}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setIsBlockModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveBlock} disabled={isCreatingBlock}>
                {isCreatingBlock && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar Bloqueio
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            {selectedBooking && (
              <>
                <DialogHeader>
                  <DialogTitle>Detalhes do Agendamento</DialogTitle>
                  <DialogDescription>
                    {format(
                      new Date(selectedBooking.time),
                      "EEEE, dd/MM/yyyy 'às' HH:mm",
                      { locale: ptBR }
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Cliente</p>{" "}
                      <p className="font-semibold">
                        {selectedBooking.customer?.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Telefone</p>
                      <a
                        href={`https://wa.me/55${selectedBooking.customer?.phone}`}
                        target="_blank"
                        className="font-semibold underline"
                      >
                        {selectedBooking.customer?.phone}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Scissors className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Serviço</p>{" "}
                      <p className="font-semibold">
                        {selectedBooking.service?.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Profissional
                      </p>{" "}
                      <p className="font-semibold">
                        {selectedBooking.barber?.name}
                      </p>
                    </div>
                  </div>
                </div>
                {/* Rodapé com o Status e os Botões de Ação */}
                <DialogFooter className="flex flex-col sm:flex-row sm:justify-between items-center gap-2">
                  <Badge className={getStatusInfo(selectedBooking).className}>
                    {getStatusInfo(selectedBooking).text}
                  </Badge>

                  {/* Botões só aparecem se o agendamento estiver 'booked' ou 'confirmed' */}
                  {(selectedBooking.status === "booked" ||
                    selectedBooking.status === "confirmed") && (
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        onClick={() =>
                          handleUpdateBookingStatus(
                            selectedBooking._id,
                            "canceled"
                          )
                        }
                        disabled={isUpdatingStatus}
                      >
                        {isUpdatingStatus ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="mr-2 h-4 w-4" />
                        )}
                        Cancelar
                      </Button>
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() =>
                          handleUpdateBookingStatus(
                            selectedBooking._id,
                            "completed"
                          )
                        }
                        disabled={isUpdatingStatus}
                      >
                        {isUpdatingStatus ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="mr-2 h-4 w-4" />
                        )}
                        Concluir
                      </Button>
                    </div>
                  )}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={!!bookingToDelete}
          onOpenChange={() => setBookingToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este agendamento? Esta ação não
                pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  bookingToDelete && handleDeleteBooking(bookingToDelete)
                }
                disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600"
              >
                {isDeleting ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* Modal para deletar bloqueio */}
        <AlertDialog
          open={isBlockDeleteModalOpen}
          onOpenChange={() => setIsBlockDeleteModalOpen(false)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover bloqueio de horário</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover este bloqueio?
                <br />
                <strong>{selectedBlock?.title}</strong>
                {selectedBlock?.barberName && (
                  <>
                    <br />
                    Profissional: <strong>{selectedBlock.barberName}</strong>
                  </>
                )}
                <br />
                Período:{" "}
                {selectedBlock?.startTime && selectedBlock?.endTime
                  ? `${format(
                      new Date(selectedBlock.startTime),
                      "dd/MM/yyyy HH:mm"
                    )} - ${format(new Date(selectedBlock.endTime), "HH:mm")}`
                  : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={isDeletingBlock}
                onClick={() => setIsBlockDeleteModalOpen(false)}
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  selectedBlock && handleDeleteBlock(selectedBlock._id)
                }
                disabled={isDeletingBlock}
                className="bg-red-500 hover:bg-red-600"
              >
                {isDeletingBlock ? "Removendo..." : "Remover bloqueio"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
