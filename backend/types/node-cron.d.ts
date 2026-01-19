declare module 'node-cron' {
  type ScheduleOptions = {
    scheduled?: boolean;
    timezone?: string;
  };

  type ScheduledTask = {
    start: () => void;
    stop: () => void;
    destroy: () => void;
  };

  const cron: {
    validate: (expression: string) => boolean;
    schedule: (
      expression: string,
      callback: () => void,
      options?: ScheduleOptions
    ) => ScheduledTask;
  };

  export default cron;
}
