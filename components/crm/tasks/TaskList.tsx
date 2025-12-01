'use client';

import { Task } from '@/lib/constants/types';

interface TaskListProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onCompleteTask?: (task: Task) => void;
}

export default function TaskList({ tasks, onSelectTask, onCompleteTask }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-slate-300">
        <p className="text-4xl mb-2">🗂️</p>
        <p>No tasks yet. Add a new task using the form.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs uppercase text-white/70 border-b border-white/5">
          <tr>
            <th className="py-3">Title</th>
            <th className="py-3">Status</th>
            <th className="py-3">Due Date</th>
            <th className="py-3">Assigned To</th>
            {onCompleteTask && <th className="py-3 text-center">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => (
            <tr
              key={task.id}
              onClick={() => onSelectTask(task)}
              className="border-b border-white/5 hover:bg-white/5 transition cursor-pointer"
            >
              <td className="py-3 font-semibold text-white">{task.title}</td>
              <td className="py-3">
                <span className="px-2 py-1 rounded-full bg-white/10 text-white/80 text-xs">
                  {task.status}
                </span>
              </td>
              <td className="py-3 text-slate-300">
                {new Date(task.due_date).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                })}
              </td>
              <td className="py-3 text-slate-300">{task.assigned_to}</td>
              {onCompleteTask && (
                <td className="py-3 text-center">
                  <button
                    onClick={event => {
                      event.stopPropagation();
                      onCompleteTask(task);
                    }}
                    disabled={task.status === 'Completed'}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                      task.status === 'Completed'
                        ? 'bg-green-500/20 text-green-200 cursor-not-allowed'
                        : 'bg-premium-gold/20 text-white hover:bg-premium-gold/40'
                    }`}
                  >
                    {task.status === 'Completed' ? 'Completed' : 'Mark Done'}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
