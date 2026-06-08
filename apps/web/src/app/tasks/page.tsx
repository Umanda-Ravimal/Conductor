import { TaskHistory } from '../../components/TaskHistory/TaskHistory';

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Task History</h1>
      <TaskHistory />
    </div>
  );
}
