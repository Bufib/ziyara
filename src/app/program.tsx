import { RequireAuth } from '@/features/auth/RequireAuth';
import { DailyProgramWeek } from '@/features/daily-program/DailyProgramWeek';

export default function ProgramScreen() {
  return (
    <RequireAuth returnTo="/program">
      <DailyProgramWeek />
    </RequireAuth>
  );
}
