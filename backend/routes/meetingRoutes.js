import express from 'express';
import multer from 'multer';
import { getTable, TABLES, FIELDS, isAirtableConfigured } from '../../config/airtableConfig.js';
import { protect, authorize } from '../utils/auth.js';
import { asyncHandler, AppError } from '../utils/errorHandler.js';
import { processCompleteeMeeting } from '../services/aiService.js';
import { createTasksFromActionItems } from '../services/taskService.js';
import { uploadFile, saveFileLocally, isGCSConfigured } from '../../config/googleCloudConfig.js';
import logger from '../utils/logger.js';
import fs from 'fs';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept audio and video files
    const allowedMimes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg',
      'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid file type. Please upload audio or video files only.', 400), false);
    }
  }
});

// @desc    Upload meeting recording and process with AI
// @route   POST /api/meetings/upload
// @access  Private
router.post('/upload', protect, upload.single('recording'), asyncHandler(async (req, res) => {
  if (!isAirtableConfigured()) {
    throw new AppError('Airtable not configured', 500);
  }

  const { project_id, title, participants } = req.body;
  const userId = req.user.id;

  if (!req.file) {
    throw new AppError('Please upload a recording file', 400);
  }

  if (!project_id || !title) {
    throw new AppError('Project ID and meeting title are required', 400);
  }

  // Verify user has access to the project
  const projectsTable = getTable(TABLES.PROJECTS);
  try {
    const projectRecord = await projectsTable.find(project_id);
    const isCreator = projectRecord.fields[FIELDS.PROJECTS.CREATED_BY] === userId;
    const isMember = projectRecord.fields[FIELDS.PROJECTS.MEMBERS]?.includes(userId);
    const isAdmin = ['super_admin', 'project_admin'].includes(req.user.role);

    if (!isCreator && !isMember && !isAdmin) {
      throw new AppError('Access denied to this project', 403);
    }
  } catch (error) {
    if (error.statusCode === 404) {
      throw new AppError('Project not found', 404);
    }
    throw error;
  }

  try {
    // Upload file to storage
    let fileUrl;
    let fileName;

    if (isGCSConfigured()) {
      const uploadResult = await uploadFile(req.file, req.file.originalname, 'meetings');
      fileUrl = uploadResult.signedUrl;
      fileName = uploadResult.fileName;
    } else {
      const uploadResult = await saveFileLocally(req.file, req.file.originalname, 'uploads/meetings');
      fileUrl = uploadResult.publicUrl;
      fileName = uploadResult.fileName;
    }

    // Create initial meeting record
    const meetingsTable = getTable(TABLES.MEETINGS);
    const meetingRecord = await meetingsTable.create([
      {
        fields: {
          [FIELDS.MEETINGS.PROJECT_ID]: [project_id],
          [FIELDS.MEETINGS.TITLE]: title,
          [FIELDS.MEETINGS.DATE]: new Date().toISOString(),
          [FIELDS.MEETINGS.RECORDING_URL]: fileUrl,
          [FIELDS.MEETINGS.CREATED_AT]: new Date().toISOString(),
        }
      }
    ]);

    const meetingId = meetingRecord[0].id;

    // Process with AI in background
    res.status(202).json({
      success: true,
      data: {
        meeting: {
          id: meetingId,
          title,
          project_id,
          recording_url: fileUrl,
          status: 'processing',
          message: 'Meeting uploaded successfully. AI processing started.'
        }
      }
    });

    // Process AI analysis asynchronously
    processAIAnalysis(req.file, title, participants ? participants.split(',') : [], meetingId, project_id)
      .catch(error => {
        logger.error('AI processing failed:', error);
        // Update meeting record with error status
        meetingsTable.update([
          {
            id: meetingId,
            fields: {
              [FIELDS.MEETINGS.MOM]: `AI processing failed: ${error.message}`,
            }
          }
        ]).catch(updateError => {
          logger.error('Failed to update meeting with error status:', updateError);
        });
      });

  } catch (error) {
    logger.error('Meeting upload error:', error);
    throw new AppError('Failed to upload meeting recording', 500);
  }
}));

// Helper function for AI processing
async function processAIAnalysis(file, title, participants, meetingId, projectId) {
  try {
    logger.info(`Starting AI processing for meeting: ${meetingId}`);

    // Process meeting with AI
    const aiResults = await processCompleteeMeeting(file, title, participants);

    // Update meeting record with AI results
    const meetingsTable = getTable(TABLES.MEETINGS);
    await meetingsTable.update([
      {
        id: meetingId,
        fields: {
          [FIELDS.MEETINGS.TRANSCRIPT]: aiResults.transcription.text,
          [FIELDS.MEETINGS.MOM]: aiResults.mom,
          [FIELDS.MEETINGS.SUMMARY]: aiResults.emailSummary,
        }
      }
    ]);

    // Create tasks from action items
    if (aiResults.actionItems && aiResults.actionItems.length > 0) {
      const tasks = await createTasksFromActionItems(aiResults.actionItems, meetingId, projectId);
      
      // Link tasks to meeting
      const taskIds = tasks.map(task => task.id);
      await meetingsTable.update([
        {
          id: meetingId,
          fields: {
            [FIELDS.MEETINGS.ACTION_POINTS]: taskIds,
          }
        }
      ]);
    }

    logger.info(`AI processing completed for meeting: ${meetingId}`);
  } catch (error) {
    logger.error(`AI processing failed for meeting ${meetingId}:`, error);
    throw error;
  }
}

// @desc    Get meeting details
// @route   GET /api/meetings/:id
// @access  Private
router.get('/:id', protect, asyncHandler(async (req, res) => {
  if (!isAirtableConfigured()) {
    throw new AppError('Airtable not configured', 500);
  }

  const meetingId = req.params.id;
  const userId = req.user.id;
  const meetingsTable = getTable(TABLES.MEETINGS);

  try {
    const record = await meetingsTable.find(meetingId);
    
    // Verify user has access to the project
    const projectId = record.fields[FIELDS.MEETINGS.PROJECT_ID][0];
    const projectsTable = getTable(TABLES.PROJECTS);
    const projectRecord = await projectsTable.find(projectId);
    
    const isCreator = projectRecord.fields[FIELDS.PROJECTS.CREATED_BY] === userId;
    const isMember = projectRecord.fields[FIELDS.PROJECTS.MEMBERS]?.includes(userId);
    const isAdmin = ['super_admin', 'project_admin'].includes(req.user.role);

    if (!isCreator && !isMember && !isAdmin) {
      throw new AppError('Access denied to this meeting', 403);
    }

    // Get related tasks
    const tasksTable = getTable(TABLES.TASKS);
    const taskRecords = await tasksTable.select({
      filterByFormula: `{${FIELDS.TASKS.SOURCE_MEETING}} = '${meetingId}'`
    }).all();

    const tasks = taskRecords.map(task => ({
      id: task.id,
      name: task.fields[FIELDS.TASKS.NAME],
      owner_id: task.fields[FIELDS.TASKS.OWNER_ID],
      status: task.fields[FIELDS.TASKS.STATUS],
      deadline: task.fields[FIELDS.TASKS.DEADLINE],
      priority: task.fields[FIELDS.TASKS.PRIORITY],
    }));

    const meeting = {
      id: record.id,
      project_id: projectId,
      title: record.fields[FIELDS.MEETINGS.TITLE],
      date: record.fields[FIELDS.MEETINGS.DATE],
      recording_url: record.fields[FIELDS.MEETINGS.RECORDING_URL],
      transcript: record.fields[FIELDS.MEETINGS.TRANSCRIPT],
      mom: record.fields[FIELDS.MEETINGS.MOM],
      summary: record.fields[FIELDS.MEETINGS.SUMMARY],
      tasks,
      created_at: record.fields[FIELDS.MEETINGS.CREATED_AT],
    };

    res.json({
      success: true,
      data: { meeting }
    });
  } catch (error) {
    if (error.statusCode === 404) {
      throw new AppError('Meeting not found', 404);
    }
    throw error;
  }
}));

// @desc    Get all meetings for a project
// @route   GET /api/meetings/project/:projectId
// @access  Private
router.get('/project/:projectId', protect, asyncHandler(async (req, res) => {
  if (!isAirtableConfigured()) {
    throw new AppError('Airtable not configured', 500);
  }

  const projectId = req.params.projectId;
  const userId = req.user.id;

  // Verify user has access to the project
  const projectsTable = getTable(TABLES.PROJECTS);
  try {
    const projectRecord = await projectsTable.find(projectId);
    const isCreator = projectRecord.fields[FIELDS.PROJECTS.CREATED_BY] === userId;
    const isMember = projectRecord.fields[FIELDS.PROJECTS.MEMBERS]?.includes(userId);
    const isAdmin = ['super_admin', 'project_admin'].includes(req.user.role);

    if (!isCreator && !isMember && !isAdmin) {
      throw new AppError('Access denied to this project', 403);
    }
  } catch (error) {
    if (error.statusCode === 404) {
      throw new AppError('Project not found', 404);
    }
    throw error;
  }

  const meetingsTable = getTable(TABLES.MEETINGS);
  const records = await meetingsTable.select({
    filterByFormula: `{${FIELDS.MEETINGS.PROJECT_ID}} = '${projectId}'`,
    sort: [{ field: FIELDS.MEETINGS.DATE, direction: 'desc' }]
  }).all();

  const meetings = records.map(record => ({
    id: record.id,
    title: record.fields[FIELDS.MEETINGS.TITLE],
    date: record.fields[FIELDS.MEETINGS.DATE],
    recording_url: record.fields[FIELDS.MEETINGS.RECORDING_URL],
    has_transcript: !!record.fields[FIELDS.MEETINGS.TRANSCRIPT],
    has_mom: !!record.fields[FIELDS.MEETINGS.MOM],
    has_summary: !!record.fields[FIELDS.MEETINGS.SUMMARY],
    created_at: record.fields[FIELDS.MEETINGS.CREATED_AT],
  }));

  res.json({
    success: true,
    data: { meetings }
  });
}));

// @desc    Update meeting details
// @route   PUT /api/meetings/:id
// @access  Private
router.put('/:id', protect, asyncHandler(async (req, res) => {
  if (!isAirtableConfigured()) {
    throw new AppError('Airtable not configured', 500);
  }

  const meetingId = req.params.id;
  const userId = req.user.id;
  const { title, mom, summary } = req.body;
  const meetingsTable = getTable(TABLES.MEETINGS);

  try {
    const record = await meetingsTable.find(meetingId);
    
    // Verify user has access to the project
    const projectId = record.fields[FIELDS.MEETINGS.PROJECT_ID][0];
    const projectsTable = getTable(TABLES.PROJECTS);
    const projectRecord = await projectsTable.find(projectId);
    
    const isCreator = projectRecord.fields[FIELDS.PROJECTS.CREATED_BY] === userId;
    const isMember = projectRecord.fields[FIELDS.PROJECTS.MEMBERS]?.includes(userId);
    const isAdmin = ['super_admin', 'project_admin'].includes(req.user.role);

    if (!isCreator && !isMember && !isAdmin) {
      throw new AppError('Access denied to this meeting', 403);
    }

    const updateFields = {};
    if (title) updateFields[FIELDS.MEETINGS.TITLE] = title;
    if (mom) updateFields[FIELDS.MEETINGS.MOM] = mom;
    if (summary) updateFields[FIELDS.MEETINGS.SUMMARY] = summary;

    const updatedRecord = await meetingsTable.update([
      {
        id: meetingId,
        fields: updateFields
      }
    ]);

    logger.info(`Meeting updated: ${meetingId} by user: ${userId}`);

    res.json({
      success: true,
      data: {
        meeting: {
          id: updatedRecord[0].id,
          title: updatedRecord[0].fields[FIELDS.MEETINGS.TITLE],
          mom: updatedRecord[0].fields[FIELDS.MEETINGS.MOM],
          summary: updatedRecord[0].fields[FIELDS.MEETINGS.SUMMARY],
        }
      }
    });
  } catch (error) {
    if (error.statusCode === 404) {
      throw new AppError('Meeting not found', 404);
    }
    throw error;
  }
}));

// @desc    Delete meeting
// @route   DELETE /api/meetings/:id
// @access  Private (creator or admin)
router.delete('/:id', protect, asyncHandler(async (req, res) => {
  if (!isAirtableConfigured()) {
    throw new AppError('Airtable not configured', 500);
  }

  const meetingId = req.params.id;
  const userId = req.user.id;
  const meetingsTable = getTable(TABLES.MEETINGS);

  try {
    const record = await meetingsTable.find(meetingId);
    
    // Verify user has access to delete
    const projectId = record.fields[FIELDS.MEETINGS.PROJECT_ID][0];
    const projectsTable = getTable(TABLES.PROJECTS);
    const projectRecord = await projectsTable.find(projectId);
    
    const isCreator = projectRecord.fields[FIELDS.PROJECTS.CREATED_BY] === userId;
    const isAdmin = ['super_admin', 'project_admin'].includes(req.user.role);

    if (!isCreator && !isAdmin) {
      throw new AppError('Access denied. Only project creator or admin can delete meetings', 403);
    }

    await meetingsTable.destroy([meetingId]);

    logger.info(`Meeting deleted: ${meetingId} by user: ${userId}`);

    res.json({
      success: true,
      data: { message: 'Meeting deleted successfully' }
    });
  } catch (error) {
    if (error.statusCode === 404) {
      throw new AppError('Meeting not found', 404);
    }
    throw error;
  }
}));

export default router;
