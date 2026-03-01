import { ipcMain } from 'electron';
import { schedulerService, type ScheduledTask } from '../managers/SchedulerService';

/**
 * 定时测试调度 IPC handlers
 */
export function registerSchedulerIpc(): void {
  ipcMain.handle('scheduler-add-task', async (_event, task: ScheduledTask) => {
    return await schedulerService.addTask(task);
  });

  ipcMain.handle('scheduler-remove-task', async (_event, taskId: string) => {
    return await schedulerService.removeTask(taskId);
  });

  ipcMain.handle('scheduler-toggle-task', async (_event, taskId: string, enabled: boolean) => {
    return await schedulerService.toggleTask(taskId, enabled);
  });

  ipcMain.handle('scheduler-list-tasks', async () => {
    return schedulerService.listTasks();
  });
}
