import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";

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
}

export function AgendaView({ events }: AgendaViewProps) {
  return (
    <div className="h-[75vh] bg-white p-4 rounded-lg shadow">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        culture="pt-BR"
        messages={messages}
        defaultView={Views.WEEK} // A visão padrão será a da semana
        views={[Views.WEEK, Views.DAY, Views.AGENDA]} // Visões disponíveis
        style={{ height: "100%" }}
        eventPropGetter={(event) => {
          // Aqui você pode customizar o estilo de cada evento.
          // Ex: mudar a cor com base no barbeiro (event.resource)
          return { style: { backgroundColor: "#3174ad", border: "none" } };
        }}
      />
    </div>
  );
}
