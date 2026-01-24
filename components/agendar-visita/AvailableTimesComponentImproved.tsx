'use client';

import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface AvailableTimesComponentImprovedProps {
  userAccountId: number;
  selectedDate: Date | null;
  onTimeSelect: (time: string) => void;
  selectedTime?: string;
}

export default function AvailableTimesComponentImproved({
  userAccountId,
  selectedDate,
  onTimeSelect,
  selectedTime,
}: AvailableTimesComponentImprovedProps) {
  const dateString = selectedDate ? formatDate(selectedDate) : null;

  const { data: availableTimes = [], isLoading, error } = useQuery<string[]>({
    queryKey: ['available-times', userAccountId, dateString],
    queryFn: async () => {
      if (!dateString) return [];

      const response = await fetch(
        `/api/available-times/${dateString}?user_account_id=${userAccountId}`
      );

      if (!response.ok) {
        throw new Error('Error al obtener horarios disponibles');
      }

      return response.json();
    },
    enabled: !!dateString && !!userAccountId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  if (!selectedDate) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Cargando horarios disponibles...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        Error al cargar horarios disponibles. Por favor, intenta de nuevo.
      </div>
    );
  }

  if (availableTimes.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No hay horarios disponibles para esta fecha. Por favor, selecciona otra fecha.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Selecciona un horario</label>
      <Select value={selectedTime} onValueChange={onTimeSelect}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecciona un horario" />
        </SelectTrigger>
        <SelectContent>
          {availableTimes.map((time) => (
            <SelectItem key={time} value={time}>
              {time}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
