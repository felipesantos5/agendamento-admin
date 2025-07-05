import { Calendar, dateFnsLocalizer, Views, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import useMediaQuery from "@/hooks/useMediaQuery";
import { useEffect, useState } from "react";

// Tipagem para os agendamentos que vêm da sua API
interface BookingEvent {
  _id: string;
  title: string; // Ex: "João Silva - Corte"
  start: Date;
  end: Date;
  resource?: any; // Pode usar para associar o agendamento a um barbeiro
}

// Configuração do localizador para usar date-fns com português do Brasil
const locales = {
  "pt-BR": ptBR,
};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: ptBR }),
  getDay,
  locales,
});

// Mensagens da agenda em português
const messages = {
  allDay: "Dia todo",
  previous: "Anterior",
  next: "Próximo",
  today: "Hoje",
  month: "Mês",
  week: "Semana",
  day: "Dia",
  agenda: "Agenda",
  date: "Data",
  time: "Hora",
  event: "Evento",
  noEventsInRange: "Não há agendamentos neste período.",
  showMore: (total: number) => `+ ver mais (${total})`,
};

interface AgendaViewProps {
  events: BookingEvent[];
  onSelectEvent: (event: BookingEvent) => void;
}

export function AgendaView({ events, onSelectEvent }: AgendaViewProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  const minTime = new Date();
  minTime.setHours(5, 0, 0);

  const maxTime = new Date();
  maxTime.setHours(23, 0, 0);

  const [currentView, setCurrentView] = useState<View>(Views.WEEK);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (isMobile) {
      setCurrentView(Views.DAY);
    } else {
      setCurrentView(Views.WEEK);
    }
  }, [isMobile]);

  return (
    <div className="h-[75vh] bg-white p-2 md:p-4 rounded-lg shadow">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        culture="pt-BR"
        messages={messages}
        onSelectEvent={onSelectEvent}
        view={currentView}
        onView={(view) => setCurrentView(view)}
        //views={isMobile ? [Views.DAY] : [Views.WEEK, Views.DAY, Views.AGENDA]}
        scrollToTime={new Date()}
        style={{ height: "100%" }}
        min={minTime}
        max={maxTime}
        date={currentDate}
        onNavigate={(newDate) => setCurrentDate(newDate)}
        eventPropGetter={(event) => {
          const eventColor = event.resource?.color;

          const style = {
            backgroundColor: eventColor || "#333333",
          };

          return { style };
        }}
      />
    </div>
  );
}
