// Task model for data validation and structure
// Since we're using Airtable, this serves as a schema definition and validation layer

import Joi from 'joi';

// Task status enum
export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
  CANCELLED: 'cancelled'
};

// Task priority enum
export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// Task validation schema
export const taskSchema = Joi.object({
  name: Joi.string().required().min(1).max(255).trim(),
  description: Joi.string().allow('').max(2000),
  owner_id: Joi.string().required(),
  status: Joi.string().valid(...Object.values(TASK_STATUS)).default(TASK_STATUS.PENDING),
  priority: Joi.string().valid(...Object.values(TASK_PRIORITY)).default(TASK_PRIORITY.MEDIUM),
  deadline: Joi.date().iso().allow(null),
  team: Joi.string().allow(''),
  source_meeting: Joi.string().allow(''),
});

// Task update validation schema
export const taskUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(255).trim(),
  description: Joi.string().allow('').max(2000),
  status: Joi.string().valid(...Object.values(TASK_STATUS)),
  priority: Joi.string().valid(...Object.values(TASK_PRIORITY)),
  deadline: Joi.date().iso().allow(null),
  team: Joi.string().allow(''),
}).min(1); // At least one field must be provided

// Task status update validation schema
export const taskStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(TASK_STATUS)).required()
});

// Task query filters validation schema
export const taskFiltersSchema = Joi.object({
  status: Joi.string().valid(...Object.values(TASK_STATUS)),
  priority: Joi.string().valid(...Object.values(TASK_PRIORITY)),
  team: Joi.string(),
  assignee: Joi.string(),
  project: Joi.string(),
  overdue: Joi.boolean(),
  due_soon: Joi.boolean(),
  days: Joi.number().integer().min(1).max(365).default(7)
});

// Bulk operations validation schema
export const bulkTaskUpdateSchema = Joi.object({
  task_ids: Joi.array().items(Joi.string()).min(1).max(50).required(),
  status: Joi.string().valid(...Object.values(TASK_STATUS)).required()
});

// Task creation from action items schema
export const actionItemSchema = Joi.object({
  task: Joi.string().required().min(1).max(255),
  assignee: Joi.string().default('Not specified'),
  deadline: Joi.string().default('Not specified'),
  priority: Joi.string().valid(...Object.values(TASK_PRIORITY)).default(TASK_PRIORITY.MEDIUM),
  category: Joi.string().default('General')
});

export const actionItemsArraySchema = Joi.array().items(actionItemSchema);

// Helper functions for task validation
export const validateTask = (taskData) => {
  return taskSchema.validate(taskData, { abortEarly: false });
};

export const validateTaskUpdate = (updateData) => {
  return taskUpdateSchema.validate(updateData, { abortEarly: false });
};

export const validateTaskStatus = (statusData) => {
  return taskStatusSchema.validate(statusData, { abortEarly: false });
};

export const validateTaskFilters = (filters) => {
  return taskFiltersSchema.validate(filters, { abortEarly: false });
};

export const validateBulkTaskUpdate = (bulkData) => {
  return bulkTaskUpdateSchema.validate(bulkData, { abortEarly: false });
};

export const validateActionItems = (actionItems) => {
  return actionItemsArraySchema.validate(actionItems, { abortEarly: false });
};

// Task data transformation helpers
export const transformTaskForAirtable = (taskData) => {
  return {
    name: taskData.name,
    description: taskData.description || '',
    owner_id: taskData.owner_id,
    status: taskData.status || TASK_STATUS.PENDING,
    priority: taskData.priority || TASK_PRIORITY.MEDIUM,
    deadline: taskData.deadline || null,
    team: taskData.team || '',
    source_meeting: taskData.source_meeting || '',
    created_at: new Date().toISOString()
  };
};

export const transformTaskFromAirtable = (airtableRecord) => {
  return {
    id: airtableRecord.id,
    name: airtableRecord.fields.name,
    description: airtableRecord.fields.description,
    owner_id: airtableRecord.fields.owner_id,
    status: airtableRecord.fields.status,
    priority: airtableRecord.fields.priority,
    deadline: airtableRecord.fields.deadline,
    team: airtableRecord.fields.team,
    source_meeting: airtableRecord.fields.source_meeting,
    created_at: airtableRecord.fields.created_at
  };
};

// Task statistics calculation helpers
export const calculateTaskStats = (tasks) => {
  const stats = {
    total: tasks.length,
    pending: 0,
    in_progress: 0,
    done: 0,
    cancelled: 0,
    overdue: 0,
    due_soon: 0,
    high_priority: 0
  };

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  tasks.forEach(task => {
    // Count by status
    stats[task.status] = (stats[task.status] || 0) + 1;

    // Count overdue tasks
    if (task.deadline && task.status !== TASK_STATUS.DONE) {
      const deadline = new Date(task.deadline);
      if (deadline < now) {
        stats.overdue++;
      } else if (deadline <= weekFromNow) {
        stats.due_soon++;
      }
    }

    // Count high priority tasks
    if ([TASK_PRIORITY.HIGH, TASK_PRIORITY.URGENT].includes(task.priority)) {
      stats.high_priority++;
    }
  });

  return stats;
};

// Task sorting helpers
export const sortTasks = (tasks, sortBy = 'created_at', sortOrder = 'desc') => {
  return tasks.sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];

    // Handle date fields
    if (sortBy === 'deadline' || sortBy === 'created_at') {
      aValue = aValue ? new Date(aValue) : new Date(0);
      bValue = bValue ? new Date(bValue) : new Date(0);
    }

    // Handle priority sorting (urgent > high > medium > low)
    if (sortBy === 'priority') {
      const priorityOrder = {
        [TASK_PRIORITY.URGENT]: 4,
        [TASK_PRIORITY.HIGH]: 3,
        [TASK_PRIORITY.MEDIUM]: 2,
        [TASK_PRIORITY.LOW]: 1
      };
      aValue = priorityOrder[aValue] || 0;
      bValue = priorityOrder[bValue] || 0;
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });
};

export default {
  TASK_STATUS,
  TASK_PRIORITY,
  validateTask,
  validateTaskUpdate,
  validateTaskStatus,
  validateTaskFilters,
  validateBulkTaskUpdate,
  validateActionItems,
  transformTaskForAirtable,
  transformTaskFromAirtable,
  calculateTaskStats,
  sortTasks
};
