'use client';

import { useState } from 'react';

export interface TaskFormValues {
  title: string;
  description: string;
  due_date: string;
  assigned_to: string;
}

interface TaskFormProps {
  onCreateTask: (values: TaskFormValues) => void;
}

const defaultForm: TaskFormValues = {
  title: '',
  description: '',
  due_date: '',
  assigned_to: '',
};

export default function TaskForm({ onCreateTask }: TaskFormProps) {
  const [values, setValues] = useState<TaskFormValues>(defaultForm);

  const handleChange = (field: keyof TaskFormValues, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!values.title.trim()) return;
    onCreateTask(values);
    setValues(defaultForm);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="text-xs uppercase tracking-widest text-white/60 mb-1 block">
          Task Title
        </label>
        <input
          type="text"
          value={values.title}
          onChange={(e) => handleChange('title', e.target.value)}
          className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
          placeholder="Example: Follow up with client"
          required
        />
      </div>

      <div>
        <label className="text-xs uppercase tracking-widest text-white/60 mb-1 block">
          Description
        </label>
        <textarea
          value={values.description}
          onChange={(e) => handleChange('description', e.target.value)}
          className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
          placeholder="Add a tiny description"
          rows={3}
        />
      </div>

      <div>
        <label className="text-xs uppercase tracking-widest text-white/60 mb-1 block">
          Due Date
        </label>
        <input
          type="date"
          value={values.due_date}
          onChange={(e) => handleChange('due_date', e.target.value)}
          className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
        />
      </div>

      <div>
        <label className="text-xs uppercase tracking-widest text-white/60 mb-1 block">
          Assigned To
        </label>
        <input
          type="text"
          value={values.assigned_to}
          onChange={(e) => handleChange('assigned_to', e.target.value)}
          className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
          placeholder="Employee name"
        />
      </div>

      <button
        type="submit"
        className="w-full py-3 rounded-2xl bg-gradient-to-r from-premium-gold to-dark-gold text-white font-semibold shadow-lg hover:shadow-premium-gold/50 transition"
      >
        Add Task
      </button>
    </form>
  );
}
