import express from 'express';
import { getTable, TABLES, FIELDS, isAirtableConfigured } from '../../config/airtableConfig.js';
import { protect, authorize } from '../utils/auth.js';
import { asyncHandler, AppError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

const router = express.Router();

// @desc    Get all projects for user
// @route   GET /api/projects
// @access  Private
router.get('/', protect, asyncHandler(async (req, res) => {
  if (!isAirtableConfigured()) {
    throw new AppError('Airtable not configured', 500);
  }

  const projectsTable = getTable(TABLES.PROJECTS);
  const userId = req.user.id;

  // Get projects where user is creator or member
  let filterFormula;
  if (req.user.role === 'super_admin') {
    // Super admin can see all projects
    filterFormula = '';
  } else {
    // Regular users see projects they created or are members of
    filterFormula = `OR({${FIELDS.PROJECTS.CREATED_BY}} = '${userId}', FIND('${userId}', {${FIELDS.PROJECTS.MEMBERS}})>0)`;
  }

  const records = await projectsTable.select({
    filterByFormula: filterFormula,
    sort: [{ field: FIELDS.PROJECTS.CREATED_AT, direction: 'desc' }]
  }).all();

  const projects = records.map(record => ({
    id: record.id,
    name: record.fields[FIELDS.PROJECTS.NAME],
    created_by: record.fields[FIELDS.PROJECTS.CREATED_BY],
    members: record.fields[FIELDS.PROJECTS.MEMBERS] || [],
    meetings: record.fields[FIELDS.PROJECTS.MEETINGS] || [],
    created_at: record.fields[FIELDS.PROJECTS.CREATED_AT],
  }));

  res.json({
    success: true,
    data: { projects }
  });
}));

// @desc    Create new project
// @route   POST /api/projects
// @access  Private (team_member and above)
router.post('/', protect, authorize('super_admin', 'project_admin', 'team_member'), asyncHandler(async (req, res) => {
  if (!isAirtableConfigured()) {
    throw new AppError('Airtable not configured', 500);
  }

  const { name, members = [] } = req.body;
  const userId = req.user.id;

  if (!name) {
    throw new AppError('Project name is required', 400);
  }

  const projectsTable = getTable(TABLES.PROJECTS);

  // Add creator to members if not already included
  const allMembers = [...new Set([userId, ...members])];

  const record = await projectsTable.create([
    {
      fields: {
        [FIELDS.PROJECTS.NAME]: name,
        [FIELDS.PROJECTS.CREATED_BY]: userId,
        [FIELDS.PROJECTS.MEMBERS]: allMembers,
        [FIELDS.PROJECTS.CREATED_AT]: new Date().toISOString(),
      }
    }
  ]);

  logger.info(`Project created: ${record[0].id} by user: ${userId}`);

  res.status(201).json({
    success: true,
    data: {
      project: {
        id: record[0].id,
        name: record[0].fields[FIELDS.PROJECTS.NAME],
        created_by: record[0].fields[FIELDS.PROJECTS.CREATED_BY],
        members: record[0].fields[FIELDS.PROJECTS.MEMBERS],
        meetings: [],
        created_at: record[0].fields[FIELDS.PROJECTS.CREATED_AT],
      }
    }
  });
}));

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
router.get('/:id', protect, asyncHandler(async (req, res) => {
  if (!isAirtableConfigured()) {
    throw new AppError('Airtable not configured', 500);
  }

  const projectId = req.params.id;
  const userId = req.user.id;
  const projectsTable = getTable(TABLES.PROJECTS);

  try {
    const record = await projectsTable.find(projectId);
    
    // Check if user has access to this project
    const isCreator = record.fields[FIELDS.PROJECTS.CREATED_BY] === userId;
    const isMember = record.fields[FIELDS.PROJECTS.MEMBERS]?.includes(userId);
    const isAdmin = ['super_admin', 'project_admin'].includes(req.user.role);

    if (!isCreator && !isMember && !isAdmin) {
      throw new AppError('Access denied to this project', 403);
    }

    // Get related meetings
    const meetingsTable = getTable(TABLES.MEETINGS);
    const meetingRecords = await meetingsTable.select({
      filterByFormula: `{${FIELDS.MEETINGS.PROJECT_ID}} = '${projectId}'`,
      sort: [{ field: FIELDS.MEETINGS.DATE, direction: 'desc' }]
    }).all();

    const meetings = meetingRecords.map(meeting => ({
      id: meeting.id,
      title: meeting.fields[FIELDS.MEETINGS.TITLE],
      date: meeting.fields[FIELDS.MEETINGS.DATE],
      recording_url: meeting.fields[FIELDS.MEETINGS.RECORDING_URL],
      mom: meeting.fields[FIELDS.MEETINGS.MOM],
      summary: meeting.fields[FIELDS.MEETINGS.SUMMARY],
      created_at: meeting.fields[FIELDS.MEETINGS.CREATED_AT],
    }));

    const project = {
      id: record.id,
      name: record.fields[FIELDS.PROJECTS.NAME],
      created_by: record.fields[FIELDS.PROJECTS.CREATED_BY],
      members: record.fields[FIELDS.PROJECTS.MEMBERS] || [],
      meetings,
      created_at: record.fields[FIELDS.PROJECTS.CREATED_AT],
    };

    res.json({
      success: true,
      data: { project }
    });
  } catch (error) {
    if (error.statusCode === 404) {
      throw new AppError('Project not found', 404);
    }
    throw error;
  }
}));

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private (creator or admin)
router.put('/:id', protect, asyncHandler(async (req, res) => {
  if (!isAirtableConfigured()) {
    throw new AppError('Airtable not configured', 500);
  }

  const projectId = req.params.id;
  const userId = req.user.id;
  const { name, members } = req.body;
  const projectsTable = getTable(TABLES.PROJECTS);

  try {
    const record = await projectsTable.find(projectId);
    
    // Check if user can modify this project
    const isCreator = record.fields[FIELDS.PROJECTS.CREATED_BY] === userId;
    const isAdmin = ['super_admin', 'project_admin'].includes(req.user.role);

    if (!isCreator && !isAdmin) {
      throw new AppError('Access denied. Only project creator or admin can modify project', 403);
    }

    const updateFields = {};
    if (name) updateFields[FIELDS.PROJECTS.NAME] = name;
    if (members) updateFields[FIELDS.PROJECTS.MEMBERS] = members;

    const updatedRecord = await projectsTable.update([
      {
        id: projectId,
        fields: updateFields
      }
    ]);

    logger.info(`Project updated: ${projectId} by user: ${userId}`);

    res.json({
      success: true,
      data: {
        project: {
          id: updatedRecord[0].id,
          name: updatedRecord[0].fields[FIELDS.PROJECTS.NAME],
          created_by: updatedRecord[0].fields[FIELDS.PROJECTS.CREATED_BY],
          members: updatedRecord[0].fields[FIELDS.PROJECTS.MEMBERS],
          created_at: updatedRecord[0].fields[FIELDS.PROJECTS.CREATED_AT],
        }
      }
    });
  } catch (error) {
    if (error.statusCode === 404) {
      throw new AppError('Project not found', 404);
    }
    throw error;
  }
}));

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (creator or super admin)
router.delete('/:id', protect, asyncHandler(async (req, res) => {
  if (!isAirtableConfigured()) {
    throw new AppError('Airtable not configured', 500);
  }

  const projectId = req.params.id;
  const userId = req.user.id;
  const projectsTable = getTable(TABLES.PROJECTS);

  try {
    const record = await projectsTable.find(projectId);
    
    // Check if user can delete this project
    const isCreator = record.fields[FIELDS.PROJECTS.CREATED_BY] === userId;
    const isSuperAdmin = req.user.role === 'super_admin';

    if (!isCreator && !isSuperAdmin) {
      throw new AppError('Access denied. Only project creator or super admin can delete project', 403);
    }

    await projectsTable.destroy([projectId]);

    logger.info(`Project deleted: ${projectId} by user: ${userId}`);

    res.json({
      success: true,
      data: { message: 'Project deleted successfully' }
    });
  } catch (error) {
    if (error.statusCode === 404) {
      throw new AppError('Project not found', 404);
    }
    throw error;
  }
}));

// @desc    Add member to project
// @route   POST /api/projects/:id/members
// @access  Private (creator or admin)
router.post('/:id/members', protect, asyncHandler(async (req, res) => {
  if (!isAirtableConfigured()) {
    throw new AppError('Airtable not configured', 500);
  }

  const projectId = req.params.id;
  const userId = req.user.id;
  const { member_id } = req.body;
  const projectsTable = getTable(TABLES.PROJECTS);

  if (!member_id) {
    throw new AppError('Member ID is required', 400);
  }

  try {
    const record = await projectsTable.find(projectId);
    
    // Check if user can modify this project
    const isCreator = record.fields[FIELDS.PROJECTS.CREATED_BY] === userId;
    const isAdmin = ['super_admin', 'project_admin'].includes(req.user.role);

    if (!isCreator && !isAdmin) {
      throw new AppError('Access denied', 403);
    }

    const currentMembers = record.fields[FIELDS.PROJECTS.MEMBERS] || [];
    
    if (currentMembers.includes(member_id)) {
      throw new AppError('User is already a member of this project', 400);
    }

    const updatedMembers = [...currentMembers, member_id];

    const updatedRecord = await projectsTable.update([
      {
        id: projectId,
        fields: {
          [FIELDS.PROJECTS.MEMBERS]: updatedMembers
        }
      }
    ]);

    logger.info(`Member added to project: ${projectId}, member: ${member_id}`);

    res.json({
      success: true,
      data: {
        project: {
          id: updatedRecord[0].id,
          members: updatedRecord[0].fields[FIELDS.PROJECTS.MEMBERS],
        },
        message: 'Member added successfully'
      }
    });
  } catch (error) {
    if (error.statusCode === 404) {
      throw new AppError('Project not found', 404);
    }
    throw error;
  }
}));

// @desc    Remove member from project
// @route   DELETE /api/projects/:id/members/:memberId
// @access  Private (creator or admin)
router.delete('/:id/members/:memberId', protect, asyncHandler(async (req, res) => {
  if (!isAirtableConfigured()) {
    throw new AppError('Airtable not configured', 500);
  }

  const projectId = req.params.id;
  const memberId = req.params.memberId;
  const userId = req.user.id;
  const projectsTable = getTable(TABLES.PROJECTS);

  try {
    const record = await projectsTable.find(projectId);
    
    // Check if user can modify this project
    const isCreator = record.fields[FIELDS.PROJECTS.CREATED_BY] === userId;
    const isAdmin = ['super_admin', 'project_admin'].includes(req.user.role);

    if (!isCreator && !isAdmin) {
      throw new AppError('Access denied', 403);
    }

    const currentMembers = record.fields[FIELDS.PROJECTS.MEMBERS] || [];
    const updatedMembers = currentMembers.filter(id => id !== memberId);

    const updatedRecord = await projectsTable.update([
      {
        id: projectId,
        fields: {
          [FIELDS.PROJECTS.MEMBERS]: updatedMembers
        }
      }
    ]);

    logger.info(`Member removed from project: ${projectId}, member: ${memberId}`);

    res.json({
      success: true,
      data: {
        project: {
          id: updatedRecord[0].id,
          members: updatedRecord[0].fields[FIELDS.PROJECTS.MEMBERS],
        },
        message: 'Member removed successfully'
      }
    });
  } catch (error) {
    if (error.statusCode === 404) {
      throw new AppError('Project not found', 404);
    }
    throw error;
  }
}));

export default router;
