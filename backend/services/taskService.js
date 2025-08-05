import { getTable, TABLES, FIELDS, TASK_STATUS, TASK_PRIORITY, isAirtableConfigured } from '../../config/airtableConfig.js';
import logger from '../utils/logger.js';
import { AppError } from '../utils/errorHandler.js';

// Create a new task
export const createTask = async (taskData) => {
  try {
    if (!isAirtableConfigured()) {
      throw new AppError('Airtable not configured', 500);
    }

    const tasksTable = getTable(TABLES.TASKS);
    
    const record = await tasksTable.create([
      {
        fields: {
          [FIELDS.TASKS.NAME]: taskData.name,
          [FIELDS.TASKS.OWNER_ID]: taskData.owner_id,
          [FIELDS.TASKS.STATUS]: taskData.status || TASK_STATUS.PENDING,
          [FIELDS.TASKS.DEADLINE]: taskData.deadline,
          [FIELDS.TASKS.SOURCE_MEETING]: taskData.source_meeting ? [taskData.source_meeting] : undefined,
          [FIELDS.TASKS.TEAM]: taskData.team,
          [FIELDS.TASKS.DESCRIPTION]: taskData.description,
          [FIELDS.TASKS.PRIORITY]: taskData.priority || TASK_PRIORITY.MEDIUM,
          [FIELDS.TASKS.CREATED_AT]: new Date().toISOString(),
        }
      }
    ]);

    logger.info(`Task created: ${record[0].id}`);
    return formatTaskRecord(record[0]);
  } catch (error) {
    logger.error('Error creating task:', error);
    throw new AppError('Failed to create task', 500);
  }
};

// Create multiple tasks from action items
export const createTasksFromActionItems = async (actionItems, meetingId, projectId) => {
  try {
    if (!isAirtableConfigured()) {
      throw new AppError('Airtable not configured', 500);
    }

    if (!actionItems || actionItems.length === 0) {
      return [];
    }

    const tasksTable = getTable(TABLES.TASKS);
    
    const records = actionItems.map(item => ({
      fields: {
        [FIELDS.TASKS.NAME]: item.task,
        [FIELDS.TASKS.OWNER_ID]: item.assignee !== 'Not specified' ? item.assignee : null,
        [FIELDS.TASKS.STATUS]: TASK_STATUS.PENDING,
        [FIELDS.TASKS.DEADLINE]: item.deadline !== 'Not specified' ? item.deadline : null,
        [FIELDS.TASKS.SOURCE_MEETING]: meetingId ? [meetingId] : undefined,
        [FIELDS.TASKS.TEAM]: projectId,
        [FIELDS.TASKS.DESCRIPTION]: `Auto-generated from meeting action item: ${item.task}`,
        [FIELDS.TASKS.PRIORITY]: item.priority || TASK_PRIORITY.MEDIUM,
        [FIELDS.TASKS.CREATED_AT]: new Date().toISOString(),
      }
    }));

    const createdRecords = await tasksTable.create(records);
    
    logger.info(`Created ${createdRecords.length} tasks from action items`);
    return createdRecords.map(formatTaskRecord);
  } catch (error) {
    logger.error('Error creating tasks from action items:', error);
    throw new AppError('Failed to create tasks from action items', 500);
  }
};

// Get tasks for a user
export const getUserTasks = async (userId, filters = {}) => {
  try {
    if (!isAirtableConfigured()) {
      throw new AppError('Airtable not configured', 500);
    }

    const tasksTable = getTable(TABLES.TASKS);
    
    let filterFormula = `{${FIELDS.TASKS.OWNER_ID}} = '${userId}'`;
    
    // Add additional filters
    if (filters.status) {
      filterFormula += ` AND {${FIELDS.TASKS.STATUS}} = '${filters.status}'`;
    }
    
    if (filters.priority) {
      filterFormula += ` AND {${FIELDS.TASKS.PRIORITY}} = '${filters.priority}'`;
    }

    if (filters.team) {
      filterFormula += ` AND {${FIELDS.TASKS.TEAM}} = '${filters.team}'`;
    }

    const records = await tasksTable.select({
      filterByFormula: filterFormula,
      sort: [
        { field: FIELDS.TASKS.DEADLINE, direction: 'asc' },
        { field: FIELDS.TASKS.CREATED_AT, direction: 'desc' }
      ]
    }).all();

    return records.map(formatTaskRecord);
  } catch (error) {
    logger.error('Error getting user tasks:', error);
    throw new AppError('Failed to retrieve tasks', 500);
  }
};

// Get tasks for a project
export const getProjectTasks = async (projectId, filters = {}) => {
  try {
    if (!isAirtableConfigured()) {
      throw new AppError('Airtable not configured', 500);
    }

    const tasksTable = getTable(TABLES.TASKS);
    
    let filterFormula = `{${FIELDS.TASKS.TEAM}} = '${projectId}'`;
    
    // Add additional filters
    if (filters.status) {
      filterFormula += ` AND {${FIELDS.TASKS.STATUS}} = '${filters.status}'`;
    }
    
    if (filters.assignee) {
      filterFormula += ` AND {${FIELDS.TASKS.OWNER_ID}} = '${filters.assignee}'`;
    }

    const records = await tasksTable.select({
      filterByFormula: filterFormula,
      sort: [
        { field: FIELDS.TASKS.PRIORITY, direction: 'desc' },
        { field: FIELDS.TASKS.DEADLINE, direction: 'asc' }
      ]
    }).all();

    return records.map(formatTaskRecord);
  } catch (error) {
    logger.error('Error getting project tasks:', error);
    throw new AppError('Failed to retrieve project tasks', 500);
  }
};

// Update task status
export const updateTaskStatus = async (taskId, status, userId) => {
  try {
    if (!isAirtableConfigured()) {
      throw new AppError('Airtable not configured', 500);
    }

    const tasksTable = getTable(TABLES.TASKS);
    
    // First, get the task to check ownership
    const task = await tasksTable.find(taskId);
    
    if (!task) {
      throw new AppError('Task not found', 404);
    }

    // Check if user owns the task or is admin (this would need role checking)
    if (task.fields[FIELDS.TASKS.OWNER_ID] !== userId) {
      // In a real implementation, you'd check if user is admin here
      throw new AppError('Not authorized to update this task', 403);
    }

    const updatedRecord = await tasksTable.update([
      {
        id: taskId,
        fields: {
          [FIELDS.TASKS.STATUS]: status,
        }
      }
    ]);

    logger.info(`Task ${taskId} status updated to ${status}`);
    return formatTaskRecord(updatedRecord[0]);
  } catch (error) {
    logger.error('Error updating task status:', error);
    throw new AppError('Failed to update task status', 500);
  }
};

// Update task details
export const updateTask = async (taskId, updates, userId) => {
  try {
    if (!isAirtableConfigured()) {
      throw new AppError('Airtable not configured', 500);
    }

    const tasksTable = getTable(TABLES.TASKS);
    
    // First, get the task to check ownership
    const task = await tasksTable.find(taskId);
    
    if (!task) {
      throw new AppError('Task not found', 404);
    }

    // Check if user owns the task or is admin
    if (task.fields[FIELDS.TASKS.OWNER_ID] !== userId) {
      throw new AppError('Not authorized to update this task', 403);
    }

    const updateFields = {};
    
    if (updates.name) updateFields[FIELDS.TASKS.NAME] = updates.name;
    if (updates.status) updateFields[FIELDS.TASKS.STATUS] = updates.status;
    if (updates.deadline) updateFields[FIELDS.TASKS.DEADLINE] = updates.deadline;
    if (updates.description) updateFields[FIELDS.TASKS.DESCRIPTION] = updates.description;
    if (updates.priority) updateFields[FIELDS.TASKS.PRIORITY] = updates.priority;

    const updatedRecord = await tasksTable.update([
      {
        id: taskId,
        fields: updateFields
      }
    ]);

    logger.info(`Task ${taskId} updated`);
    return formatTaskRecord(updatedRecord[0]);
  } catch (error) {
    logger.error('Error updating task:', error);
    throw new AppError('Failed to update task', 500);
  }
};

// Delete task
export const deleteTask = async (taskId, userId) => {
  try {
    if (!isAirtableConfigured()) {
      throw new AppError('Airtable not configured', 500);
    }

    const tasksTable = getTable(TABLES.TASKS);
    
    // First, get the task to check ownership
    const task = await tasksTable.find(taskId);
    
    if (!task) {
      throw new AppError('Task not found', 404);
    }

    // Check if user owns the task or is admin
    if (task.fields[FIELDS.TASKS.OWNER_ID] !== userId) {
      throw new AppError('Not authorized to delete this task', 403);
    }

    await tasksTable.destroy([taskId]);
    
    logger.info(`Task ${taskId} deleted`);
    return { success: true, message: 'Task deleted successfully' };
  } catch (error) {
    logger.error('Error deleting task:', error);
    throw new AppError('Failed to delete task', 500);
  }
};

// Get task statistics
export const getTaskStatistics = async (userId, projectId = null) => {
  try {
    if (!isAirtableConfigured()) {
      throw new AppError('Airtable not configured', 500);
    }

    const filters = projectId ? { team: projectId } : {};
    const tasks = await getUserTasks(userId, filters);

    const stats = {
      total: tasks.length,
      pending: tasks.filter(t => t.status === TASK_STATUS.PENDING).length,
      in_progress: tasks.filter(t => t.status === TASK_STATUS.IN_PROGRESS).length,
      done: tasks.filter(t => t.status === TASK_STATUS.DONE).length,
      overdue: tasks.filter(t => {
        if (!t.deadline) return false;
        return new Date(t.deadline) < new Date() && t.status !== TASK_STATUS.DONE;
      }).length,
      high_priority: tasks.filter(t => t.priority === TASK_PRIORITY.HIGH || t.priority === TASK_PRIORITY.URGENT).length,
    };

    return stats;
  } catch (error) {
    logger.error('Error getting task statistics:', error);
    throw new AppError('Failed to get task statistics', 500);
  }
};

// Helper function to format task record
const formatTaskRecord = (record) => {
  return {
    id: record.id,
    name: record.fields[FIELDS.TASKS.NAME],
    owner_id: record.fields[FIELDS.TASKS.OWNER_ID],
    status: record.fields[FIELDS.TASKS.STATUS],
    deadline: record.fields[FIELDS.TASKS.DEADLINE],
    source_meeting: record.fields[FIELDS.TASKS.SOURCE_MEETING],
    team: record.fields[FIELDS.TASKS.TEAM],
    description: record.fields[FIELDS.TASKS.DESCRIPTION],
    priority: record.fields[FIELDS.TASKS.PRIORITY],
    created_at: record.fields[FIELDS.TASKS.CREATED_AT],
  };
};

export default {
  createTask,
  createTasksFromActionItems,
  getUserTasks,
  getProjectTasks,
  updateTaskStatus,
  updateTask,
  deleteTask,
  getTaskStatistics,
};
