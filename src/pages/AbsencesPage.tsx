import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import apiClient from "@/services/api";
import { API_BASE_URL } from "@/config/BackendUrl";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2 } from "lucide-react";

interface BlockedDay {
  _id: string;
  date: string;
}

interface AdminOutletContext {
  barbershopId: string;
}

export function AbsencesPage() {
  const { barbershopId } = useOutletContext<AdminOutletContext>();
  const [blockedDays, setBlockedDays] = useState<BlockedDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const fetchBlockedDays = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(`${API_BASE_URL}/api/barbershops/${barbershopId}/blocked-days`);
      // Ordena os dias bloqueados para exibição
      const sortedDays = response.data.sort((a: BlockedDay, b: BlockedDay) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setBlockedDays(sortedDays);
    } catch (error) {
      toast.error("Erro ao carregar os dias bloqueados.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (barbershopId) {
      fetchBlockedDays();
    }
  }, [barbershopId]);

  const blockedDates = blockedDays.map((day) => new Date(day.date));

  const handleBlockDay = async (date: Date) => {
    try {
      await apiClient.post(`${API_BASE_URL}/api/barbershops/${barbershopId}/blocked-days`, { date });
      toast.success(`Dia ${format(date, "dd/MM/yyyy")} bloqueado com sucesso!`);
      fetchBlockedDays(); // Recarrega a lista
      setSelectedDate(undefined); // Limpa a seleção
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Falha ao bloquear o dia.");
    }
  };

  const handleUnblockDay = async (dayId: string, date: Date) => {
    try {
      await apiClient.delete(`${API_BASE_URL}/api/barbershops/${barbershopId}/blocked-days/${dayId}`);
      toast.success(`Dia ${format(date, "dd/MM/yyyy")} desbloqueado com sucesso!`);
      fetchBlockedDays(); // Recarrega a lista
      setSelectedDate(undefined); // Limpa a seleção
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Falha ao desbloquear o dia.");
    }
  };

  const isDayBlocked = (date: Date) => {
    return blockedDates.some((d) => d.toDateString() === date.toDateString());
  };

  const getBlockedDayId = (date: Date): string | null => {
    const day = blockedDays.find((d) => new Date(d.date).toDateString() === date.toDateString());
    return day ? day._id : null;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Calendário de Folgas</CardTitle>
          <CardDescription>Selecione uma data no calendário e clique no botão para desativar o atendimento desse dia.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Coluna da Esquerda: Calendário e Ação */}
          <div className="md:col-span-2 flex flex-col items-center space-y-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={ptBR}
              modifiers={{ blocked: blockedDates }}
              modifiersStyles={{
                blocked: {
                  backgroundColor: "hsl(var(--destructive))",
                  color: "hsl(var(--destructive-foreground))",
                },
              }}
              className="rounded-md border shadow-sm"
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={!selectedDate} className="w-full max-w-sm">
                  Gerenciar Dia Selecionado
                </Button>
              </AlertDialogTrigger>

              {selectedDate && (
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Ação</AlertDialogTitle>
                    <AlertDialogDescription>
                      Você selecionou o dia <span className="font-bold">{format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>.
                      {isDayBlocked(selectedDate)
                        ? " Deseja DESBLOQUEAR este dia para agendamentos?"
                        : " Deseja BLOQUEAR este dia? Nenhum cliente poderá agendar horários nesta data."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setSelectedDate(undefined)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        const blockedId = getBlockedDayId(selectedDate);
                        if (blockedId) {
                          handleUnblockDay(blockedId, selectedDate);
                        } else {
                          handleBlockDay(selectedDate);
                        }
                      }}
                      className={!isDayBlocked(selectedDate) ? "bg-destructive hover:bg-destructive/90" : ""}
                    >
                      {isDayBlocked(selectedDate) ? "Sim, Desbloquear" : "Sim, Bloquear"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              )}
            </AlertDialog>
          </div>

          {/* Coluna da Direita: Lista de Dias Bloqueados */}
          <div className="md:col-span-1">
            <h3 className="text-lg font-semibold mb-2">Dias Bloqueados</h3>
            <ScrollArea className="h-72 w-full rounded-md border p-2">
              {isLoading ? (
                <p>Carregando...</p>
              ) : blockedDays.length > 0 ? (
                <div className="space-y-2">
                  {blockedDays.map((day) => (
                    <div key={day._id} className="flex items-center justify-between p-2 rounded-md bg-secondary">
                      <span className="text-sm font-medium">{format(new Date(day.date), "dd/MM/yyyy - EEEE", { locale: ptBR })}</span>
                      {/* Adicionando um AlertDialog também para o botão de deletar da lista */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação irá desbloquear o dia {format(new Date(day.date), "dd/MM/yyyy")} e ele voltará a ficar disponível para
                              agendamentos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleUnblockDay(day._id, new Date(day.date))}>Confirmar Desbloqueio</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center pt-4">Nenhum dia bloqueado.</p>
              )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
