import express from 'express';
import { protect, authorize } from '../utils/auth.js';
import { asyncHandler, AppError } from '../utils/errorHandler.js';
import {
  createTask,
  getUserTasks,
  getProjectTasks,
  updateTaskStatus,
  updateTask,
  deleteTask,
  getTaskStatistics
} from '../services/taskService.js';
import logger from '../utils/logger.js';

const router = express.Router();

// @desc    Get user's tasks
// @route   GET /api/tasks
// @access  Private
router.get('/', protect, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { status, priority, team, project } = req.query;

  const filters = {};
  if (status) filters.status = status;
  if (priority) filters.priority = priority;
  if (team) filters.team = team;

  const tasks = project 
    ? await getProjectTasks(project, filters)
    : await getUserTasks(userId, filters);

  res.json({
    success: true,
    data: { tasks }
  });
}));

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private
router.post('/', protect, asyncHandler(async (req, res) => {
  const { name, description, deadline, priority, team, assignee } = req.body;
  const userId = req.user.id;

  if (!name) {
    throw new AppError('Task name is required', 400);
  }

  const taskData = {
    name,
    description,
    deadline,
    priority,
    team,
    owner_id: assignee || userId, // Allow assigning to others if provided
  };

  const task = await createTask(taskData);

  logger.info(`Task created: ${task.id} by user: ${userId}`);

  res.status(201).json({
    success: true,
    data: { task }
  });
}));

// @desc    Get task by ID
// @route   GET /api/tasks/:id
// @access  Private
router.get('/:id', protect, asyncHandler(async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;

  // This would need to be implemented in taskService
  // For now, we'll get user tasks and filter
  const tasks = await getUserTasks(userId);
  const task = tasks.find(t => t.id === taskId);

  if (!task) {
    // Check if user is admin and can view all tasks
    if (['super_admin', 'project_admin'].includes(req.user.role)) {
      // Implementation would go here to get any task
      throw new AppError('Task not found', 404);
    } else {
      throw new AppError('Task not found or access denied', 404);
    }
  }

  res.json({
    success: true,
    data: { task }
  });
}));

// @desc    Update task status
// @route   PATCH /api/tasks/:id/status
// @access  Private
router.patch('/:id/status', protect, asyncHandler(async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;
  const { status } = req.body;

  if (!status) {
    throw new AppError('Status is required', 400);
  }

  const validStatuses = ['pending', 'in_progress', 'done', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
  }

  const task = await updateTaskStatus(taskId, status, userId);

  logger.info(`Task status updated: ${taskId} to ${status} by user: ${userId}`);

  res.json({
    success: true,
    data: { task }
  });
}));

// @desc    Update task details
// @route   PUT /api/tasks/:id
// @access  Private
router.put('/:id', protect, asyncHandler(async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;
  const updates = req.body;

  // Validate status if provided
  if (updates.status) {
    const validStatuses = ['pending', 'in_progress', 'done', 'cancelled'];
    if (!validStatuses.includes(updates.status)) {
      throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }
  }

  // Validate priority if provided
  if (updates.priority) {
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(updates.priority)) {
      throw new AppError(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`, 400);
    }
  }

  const task = await updateTask(taskId, updates, userId);

  logger.info(`Task updated: ${taskId} by user: ${userId}`);

  res.json({
    success: true,
    data: { task }
  });
}));

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
router.delete('/:id', protect, asyncHandler(async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;

  const result = await deleteTask(taskId, userId);

  logger.info(`Task deleted: ${taskId} by user: ${userId}`);

  res.json({
    success: true,
    data: result
  });
}));

// @desc    Get task statistics
// @route   GET /api/tasks/stats
// @access  Private
router.get('/stats/overview', protect, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { project } = req.query;

  const stats = await getTaskStatistics(userId, project);

  res.json({
    success: true,
    data: { stats }
  });
}));

// @desc    Get tasks for a specific project
// @route   GET /api/tasks/project/:projectId
// @access  Private
router.get('/project/:projectId', protect, asyncHandler(async (req, res) => {
  const projectId = req.params.projectId;
  const { status, assignee } = req.query;

  const filters = {};
  if (status) filters.status = status;
  if (assignee) filters.assignee = assignee;

  const tasks = await getProjectTasks(projectId, filters);

  res.json({
    success: true,
    data: { tasks }
  });
}));

// @desc    Bulk update task statuses
// @route   PATCH /api/tasks/bulk/status
// @access  Private
router.patch('/bulk/status', protect, asyncHandler(async (req, res) => {
  const { task_ids, status } = req.body;
  const userId = req.user.id;

  if (!task_ids || !Array.isArray(task_ids) || task_ids.length === 0) {
    throw new AppError('Task IDs array is required', 400);
  }

  if (!status) {
    throw new AppError('Status is required', 400);
  }

  const validStatuses = ['pending', 'in_progress', 'done', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
  }

  const results = [];
  const errors = [];

  // Process each task
  for (const taskId of task_ids) {
    try {
      const task = await updateTaskStatus(taskId, status, userId);
      results.push(task);
    } catch (error) {
      errors.push({
        task_id: taskId,
        error: error.message
      });
    }
  }

  logger.info(`Bulk status update: ${results.length} tasks updated, ${errors.length} errors by user: ${userId}`);

  res.json({
    success: true,
    data: {
      updated: results,
      errors: errors,
      summary: {
        total_requested: task_ids.length,
        successful: results.length,
        failed: errors.length
      }
    }
  });
}));

// @desc    Get overdue tasks
// @route   GET /api/tasks/overdue
// @access  Private
router.get('/overdue/list', protect, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { project } = req.query;

  const filters = project ? { team: project } : {};
  const allTasks = await getUserTasks(userId, filters);

  // Filter overdue tasks
  const overdueTasks = allTasks.filter(task => {
    if (!task.deadline || task.status === 'done') return false;
    return new Date(task.deadline) < new Date();
  });

  res.json({
    success: true,
    data: { 
      tasks: overdueTasks,
      count: overdueTasks.length
    }
  });
}));

// @desc    Get tasks due soon (next 7 days)
// @route   GET /api/tasks/due-soon
// @access  Private
router.get('/due-soon/list', protect, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { project, days = 7 } = req.query;

  const filters = project ? { team: project } : {};
  const allTasks = await getUserTasks(userId, filters);

  const daysAhead = parseInt(days);
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  // Filter tasks due soon
  const dueSoonTasks = allTasks.filter(task => {
    if (!task.deadline || task.status === 'done') return false;
    const deadline = new Date(task.deadline);
    return deadline >= new Date() && deadline <= futureDate;
  });

  res.json({
    success: true,
    data: { 
      tasks: dueSoonTasks,
      count: dueSoonTasks.length,
      days_ahead: daysAhead
    }
  });
}));

export default router;
