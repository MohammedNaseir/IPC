import { requirePageUser } from '@/server/auth/session';
import {
  listTrainings,
  listTrainingTemplates,
  listTrashedTrainings,
  listTrashedTrainingTemplates,
} from '@/server/queries/trainings';
import { listHospitals } from '@/server/queries/hospitals';
import { TrainingsView } from '@/components/views/TrainingsView';

export default async function TrainingsPage() {
  const user = await requirePageUser();
  const isCentral = user.role === 'central';
  const [trainings, hospitals, trashedTrainings, templates, trashedTemplates] = await Promise.all([
    listTrainings(user),
    listHospitals(user),
    isCentral ? listTrashedTrainings() : Promise.resolve([]),
    isCentral ? listTrainingTemplates() : Promise.resolve([]),
    isCentral ? listTrashedTrainingTemplates() : Promise.resolve([]),
  ]);

  return (
    <TrainingsView
      user={user}
      trainings={trainings}
      hospitals={hospitals}
      trashedTrainings={trashedTrainings}
      templates={templates}
      trashedTemplates={trashedTemplates}
    />
  );
}
