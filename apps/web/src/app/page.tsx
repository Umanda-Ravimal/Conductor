import { TaskInput } from '../components/TaskInput/TaskInput';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          AI-Powered Browser Automation
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Describe your goal in plain English. Conductor plans the steps, runs a
          real browser with Puppeteer, and streams live screenshots and logs.
        </p>
      </section>
      <Card>
        <CardHeader>
          <CardTitle>New Task</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskInput />
        </CardContent>
      </Card>
    </div>
  );
}
