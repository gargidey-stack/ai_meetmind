// Meeting model for data validation and structure
// Since we're using Airtable, this serves as a schema definition and validation layer

import Joi from 'joi';

// Meeting validation schema
export const meetingSchema = Joi.object({
  project_id: Joi.string().required(),
  title: Joi.string().required().min(1).max(255).trim(),
  date: Joi.date().iso().default(() => new Date()),
  participants: Joi.array().items(Joi.string()).default([]),
  recording_url: Joi.string().uri().allow(''),
  transcript: Joi.string().allow(''),
  mom: Joi.string().allow(''),
  summary: Joi.string().allow(''),
  action_points: Joi.array().items(Joi.string()).default([])
});

// Meeting update validation schema
export const meetingUpdateSchema = Joi.object({
  title: Joi.string().min(1).max(255).trim(),
  date: Joi.date().iso(),
  participants: Joi.array().items(Joi.string()),
  mom: Joi.string().allow(''),
  summary: Joi.string().allow('')
}).min(1); // At least one field must be provided

// Meeting upload validation schema
export const meetingUploadSchema = Joi.object({
  project_id: Joi.string().required(),
  title: Joi.string().required().min(1).max(255).trim(),
  participants: Joi.string().allow(''), // Comma-separated string from form data
  date: Joi.date().iso().default(() => new Date())
});

// Meeting query filters validation schema
export const meetingFiltersSchema = Joi.object({
  project_id: Joi.string(),
  date_from: Joi.date().iso(),
  date_to: Joi.date().iso(),
  has_transcript: Joi.boolean(),
  has_mom: Joi.boolean(),
  has_summary: Joi.boolean(),
  search: Joi.string().max(255)
});

// File upload validation
export const fileUploadSchema = Joi.object({
  mimetype: Joi.string().valid(
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg',
    'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'
  ).required(),
  size: Joi.number().max(100 * 1024 * 1024), // 100MB limit
  originalname: Joi.string().required()
});

// AI processing status enum
export const AI_PROCESSING_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// Helper functions for meeting validation
export const validateMeeting = (meetingData) => {
  return meetingSchema.validate(meetingData, { abortEarly: false });
};

export const validateMeetingUpdate = (updateData) => {
  return meetingUpdateSchema.validate(updateData, { abortEarly: false });
};

export const validateMeetingUpload = (uploadData) => {
  return meetingUploadSchema.validate(uploadData, { abortEarly: false });
};

export const validateMeetingFilters = (filters) => {
  return meetingFiltersSchema.validate(filters, { abortEarly: false });
};

export const validateFileUpload = (file) => {
  return fileUploadSchema.validate(file, { abortEarly: false });
};

// Meeting data transformation helpers
export const transformMeetingForAirtable = (meetingData) => {
  return {
    project_id: [meetingData.project_id], // Airtable linked record format
    title: meetingData.title,
    date: meetingData.date || new Date().toISOString(),
    recording_url: meetingData.recording_url || '',
    transcript: meetingData.transcript || '',
    mom: meetingData.mom || '',
    summary: meetingData.summary || '',
    action_points: meetingData.action_points || [],
    created_at: new Date().toISOString()
  };
};

export const transformMeetingFromAirtable = (airtableRecord) => {
  return {
    id: airtableRecord.id,
    project_id: airtableRecord.fields.project_id?.[0] || '',
    title: airtableRecord.fields.title,
    date: airtableRecord.fields.date,
    recording_url: airtableRecord.fields.recording_url,
    transcript: airtableRecord.fields.transcript,
    mom: airtableRecord.fields.mom,
    summary: airtableRecord.fields.summary,
    action_points: airtableRecord.fields.action_points || [],
    created_at: airtableRecord.fields.created_at
  };
};

// Meeting processing helpers
export const parseParticipants = (participantsString) => {
  if (!participantsString || typeof participantsString !== 'string') {
    return [];
  }
  
  return participantsString
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0);
};

export const formatParticipants = (participantsArray) => {
  if (!Array.isArray(participantsArray)) {
    return '';
  }
  
  return participantsArray.join(', ');
};

// Meeting statistics calculation helpers
export const calculateMeetingStats = (meetings) => {
  const stats = {
    total: meetings.length,
    with_transcript: 0,
    with_mom: 0,
    with_summary: 0,
    with_action_items: 0,
    this_week: 0,
    this_month: 0
  };

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  meetings.forEach(meeting => {
    // Count processed meetings
    if (meeting.transcript) stats.with_transcript++;
    if (meeting.mom) stats.with_mom++;
    if (meeting.summary) stats.with_summary++;
    if (meeting.action_points && meeting.action_points.length > 0) stats.with_action_items++;

    // Count recent meetings
    const meetingDate = new Date(meeting.date);
    if (meetingDate >= weekAgo) stats.this_week++;
    if (meetingDate >= monthAgo) stats.this_month++;
  });

  return stats;
};

// Meeting search helpers
export const searchMeetings = (meetings, searchTerm) => {
  if (!searchTerm || searchTerm.trim() === '') {
    return meetings;
  }

  const term = searchTerm.toLowerCase().trim();
  
  return meetings.filter(meeting => {
    return (
      meeting.title?.toLowerCase().includes(term) ||
      meeting.transcript?.toLowerCase().includes(term) ||
      meeting.mom?.toLowerCase().includes(term) ||
      meeting.summary?.toLowerCase().includes(term)
    );
  });
};

// Meeting sorting helpers
export const sortMeetings = (meetings, sortBy = 'date', sortOrder = 'desc') => {
  return meetings.sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];

    // Handle date fields
    if (sortBy === 'date' || sortBy === 'created_at') {
      aValue = aValue ? new Date(aValue) : new Date(0);
      bValue = bValue ? new Date(bValue) : new Date(0);
    }

    // Handle string fields
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });
};

// File validation helpers
export const isValidAudioFile = (mimetype) => {
  const validAudioTypes = [
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg'
  ];
  return validAudioTypes.includes(mimetype);
};

export const isValidVideoFile = (mimetype) => {
  const validVideoTypes = [
    'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'
  ];
  return validVideoTypes.includes(mimetype);
};

export const isValidMediaFile = (mimetype) => {
  return isValidAudioFile(mimetype) || isValidVideoFile(mimetype);
};

export const getFileExtension = (filename) => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

export const generateFileName = (originalName, prefix = 'meeting') => {
  const timestamp = Date.now();
  const extension = getFileExtension(originalName);
  const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
  return `${prefix}_${timestamp}_${baseName}.${extension}`;
};

export default {
  AI_PROCESSING_STATUS,
  validateMeeting,
  validateMeetingUpdate,
  validateMeetingUpload,
  validateMeetingFilters,
  validateFileUpload,
  transformMeetingForAirtable,
  transformMeetingFromAirtable,
  parseParticipants,
  formatParticipants,
  calculateMeetingStats,
  searchMeetings,
  sortMeetings,
  isValidAudioFile,
  isValidVideoFile,
  isValidMediaFile,
  getFileExtension,
  generateFileName
};
