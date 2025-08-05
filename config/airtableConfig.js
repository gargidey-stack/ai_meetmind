import Airtable from 'airtable';

// Airtable configuration
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

let base = null;

if (AIRTABLE_API_KEY && AIRTABLE_BASE_ID) {
  Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: AIRTABLE_API_KEY
  });
  
  base = Airtable.base(AIRTABLE_BASE_ID);
} else {
  console.warn('Airtable credentials not configured. Some features will be unavailable.');
}

// Table names
export const TABLES = {
  PROJECTS: 'Projects',
  MEETINGS: 'Meetings',
  TASKS: 'Tasks'
};

// Airtable field mappings
export const FIELDS = {
  PROJECTS: {
    NAME: 'name',
    CREATED_BY: 'created_by',
    MEMBERS: 'members',
    MEETINGS: 'meetings',
    CREATED_AT: 'created_at'
  },
  MEETINGS: {
    PROJECT_ID: 'project_id',
    TITLE: 'title',
    DATE: 'date',
    RECORDING_URL: 'recording_url',
    TRANSCRIPT: 'transcript',
    MOM: 'mom',
    ACTION_POINTS: 'action_points',
    SUMMARY: 'summary',
    CREATED_AT: 'created_at'
  },
  TASKS: {
    NAME: 'name',
    OWNER_ID: 'owner_id',
    STATUS: 'status',
    DEADLINE: 'deadline',
    SOURCE_MEETING: 'source_meeting',
    TEAM: 'team',
    DESCRIPTION: 'description',
    PRIORITY: 'priority',
    CREATED_AT: 'created_at'
  }
};

// Status options
export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
  CANCELLED: 'cancelled'
};

export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// Helper functions
export const getTable = (tableName) => {
  if (!base) {
    throw new Error('Airtable not configured. Please add AIRTABLE_API_KEY and AIRTABLE_BASE_ID to environment variables.');
  }
  return base(tableName);
};

export const isAirtableConfigured = () => {
  return !!(AIRTABLE_API_KEY && AIRTABLE_BASE_ID && base);
};

// Schema creation helper (for documentation)
export const AIRTABLE_SCHEMA = {
  Projects: {
    fields: [
      { name: 'name', type: 'singleLineText', required: true },
      { name: 'created_by', type: 'singleLineText', required: true },
      { name: 'members', type: 'multipleSelects' },
      { name: 'meetings', type: 'multipleRecordLinks', linkedTable: 'Meetings' },
      { name: 'created_at', type: 'dateTime', required: true }
    ]
  },
  Meetings: {
    fields: [
      { name: 'project_id', type: 'multipleRecordLinks', linkedTable: 'Projects', required: true },
      { name: 'title', type: 'singleLineText', required: true },
      { name: 'date', type: 'dateTime', required: true },
      { name: 'recording_url', type: 'url' },
      { name: 'transcript', type: 'longText' },
      { name: 'mom', type: 'longText' },
      { name: 'action_points', type: 'multipleRecordLinks', linkedTable: 'Tasks' },
      { name: 'summary', type: 'longText' },
      { name: 'created_at', type: 'dateTime', required: true }
    ]
  },
  Tasks: {
    fields: [
      { name: 'name', type: 'singleLineText', required: true },
      { name: 'owner_id', type: 'singleLineText', required: true },
      { name: 'status', type: 'singleSelect', options: Object.values(TASK_STATUS), required: true },
      { name: 'deadline', type: 'date' },
      { name: 'source_meeting', type: 'multipleRecordLinks', linkedTable: 'Meetings' },
      { name: 'team', type: 'singleLineText' },
      { name: 'description', type: 'longText' },
      { name: 'priority', type: 'singleSelect', options: Object.values(TASK_PRIORITY) },
      { name: 'created_at', type: 'dateTime', required: true }
    ]
  }
};

export default base;
