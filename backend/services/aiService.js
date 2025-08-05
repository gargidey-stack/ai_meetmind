import OpenAI from 'openai';
import logger from '../utils/logger.js';
import { AppError } from '../utils/errorHandler.js';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Check if OpenAI is configured
export const isOpenAIConfigured = () => {
  return !!process.env.OPENAI_API_KEY;
};

// Transcribe audio using Whisper
export const transcribeAudio = async (audioFile) => {
  try {
    if (!isOpenAIConfigured()) {
      throw new AppError('OpenAI API not configured', 500);
    }

    logger.info('Starting audio transcription with Whisper');

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en', // Can be made configurable
      response_format: 'verbose_json',
      timestamp_granularities: ['word', 'segment']
    });

    logger.info('Audio transcription completed successfully');

    return {
      text: transcription.text,
      duration: transcription.duration,
      language: transcription.language,
      segments: transcription.segments,
      words: transcription.words
    };
  } catch (error) {
    logger.error('Error in audio transcription:', error);
    
    if (error.response?.status === 429) {
      throw new AppError('OpenAI API rate limit exceeded. Please try again later.', 429);
    } else if (error.response?.status === 401) {
      throw new AppError('OpenAI API authentication failed', 500);
    } else if (error.response?.status === 413) {
      throw new AppError('Audio file too large. Maximum size is 25MB.', 400);
    }
    
    throw new AppError('Failed to transcribe audio', 500);
  }
};

// Generate Minutes of Meeting (MOM) from transcript
export const generateMOM = async (transcript, meetingTitle, participants = []) => {
  try {
    if (!isOpenAIConfigured()) {
      throw new AppError('OpenAI API not configured', 500);
    }

    logger.info('Generating Minutes of Meeting from transcript');

    const prompt = `
Please create comprehensive Minutes of Meeting (MOM) from the following meeting transcript.

Meeting Title: ${meetingTitle}
Participants: ${participants.length > 0 ? participants.join(', ') : 'Not specified'}

Transcript:
${transcript}

Please format the MOM with the following structure:
1. Meeting Overview
2. Attendees
3. Key Discussion Points
4. Decisions Made
5. Action Items (with responsible persons if mentioned)
6. Next Steps
7. Next Meeting (if mentioned)

Make it professional, concise, and well-organized.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a professional meeting secretary who creates detailed and well-structured Minutes of Meeting. Focus on clarity, accuracy, and actionable items.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const mom = completion.choices[0].message.content;
    logger.info('MOM generation completed successfully');

    return mom;
  } catch (error) {
    logger.error('Error generating MOM:', error);
    
    if (error.response?.status === 429) {
      throw new AppError('OpenAI API rate limit exceeded. Please try again later.', 429);
    }
    
    throw new AppError('Failed to generate Minutes of Meeting', 500);
  }
};

// Extract action items from transcript or MOM
export const extractActionItems = async (text, context = 'transcript') => {
  try {
    if (!isOpenAIConfigured()) {
      throw new AppError('OpenAI API not configured', 500);
    }

    logger.info('Extracting action items from text');

    const prompt = `
Analyze the following ${context} and extract all action items, tasks, and follow-ups mentioned.

${context === 'transcript' ? 'Meeting Transcript:' : 'Meeting Content:'}
${text}

Please extract action items in the following JSON format:
{
  "action_items": [
    {
      "task": "Description of the task",
      "assignee": "Person responsible (if mentioned, otherwise 'Not specified')",
      "deadline": "Deadline if mentioned (otherwise 'Not specified')",
      "priority": "high/medium/low (based on context)",
      "category": "Category of the task (e.g., 'Development', 'Research', 'Meeting', 'Documentation')"
    }
  ]
}

Focus on:
- Clear, actionable tasks
- Specific deliverables
- Follow-up meetings
- Research or investigation tasks
- Decisions that require implementation

Return only the JSON object, no additional text.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at identifying and extracting action items from meeting content. Return only valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 1500
    });

    const response = completion.choices[0].message.content;
    const actionItems = JSON.parse(response);
    
    logger.info(`Extracted ${actionItems.action_items.length} action items`);

    return actionItems.action_items;
  } catch (error) {
    logger.error('Error extracting action items:', error);
    
    if (error.response?.status === 429) {
      throw new AppError('OpenAI API rate limit exceeded. Please try again later.', 429);
    }
    
    throw new AppError('Failed to extract action items', 500);
  }
};

// Generate email-ready summary
export const generateEmailSummary = async (mom, actionItems = []) => {
  try {
    if (!isOpenAIConfigured()) {
      throw new AppError('OpenAI API not configured', 500);
    }

    logger.info('Generating email-ready summary');

    const actionItemsText = actionItems.length > 0 
      ? actionItems.map(item => `- ${item.task} (Assignee: ${item.assignee}, Deadline: ${item.deadline})`).join('\n')
      : 'No specific action items identified.';

    const prompt = `
Create a concise, email-ready summary from the following Minutes of Meeting.

Minutes of Meeting:
${mom}

Action Items:
${actionItemsText}

Please create a professional email summary that includes:
1. Brief meeting overview (2-3 sentences)
2. Key decisions/outcomes
3. Priority action items
4. Next steps

Keep it concise (under 300 words) and suitable for sending to stakeholders who may not have attended the meeting.
Use a professional but friendly tone.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a professional communicator who creates clear, concise email summaries of meetings for busy executives and stakeholders.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 800
    });

    const summary = completion.choices[0].message.content;
    logger.info('Email summary generation completed successfully');

    return summary;
  } catch (error) {
    logger.error('Error generating email summary:', error);
    
    if (error.response?.status === 429) {
      throw new AppError('OpenAI API rate limit exceeded. Please try again later.', 429);
    }
    
    throw new AppError('Failed to generate email summary', 500);
  }
};

// Process complete meeting (transcription + analysis)
export const processCompleteeMeeting = async (audioFile, meetingTitle, participants = []) => {
  try {
    logger.info('Starting complete meeting processing');

    // Step 1: Transcribe audio
    const transcription = await transcribeAudio(audioFile);

    // Step 2: Generate MOM
    const mom = await generateMOM(transcription.text, meetingTitle, participants);

    // Step 3: Extract action items
    const actionItems = await extractActionItems(transcription.text);

    // Step 4: Generate email summary
    const emailSummary = await generateEmailSummary(mom, actionItems);

    logger.info('Complete meeting processing finished successfully');

    return {
      transcription,
      mom,
      actionItems,
      emailSummary,
      processingComplete: true,
      processedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error in complete meeting processing:', error);
    throw error;
  }
};

export default {
  isOpenAIConfigured,
  transcribeAudio,
  generateMOM,
  extractActionItems,
  generateEmailSummary,
  processCompleteeMeeting
};
