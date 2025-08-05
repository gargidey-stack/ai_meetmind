import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  Mic, 
  Video, 
  Plus,
  Search,
  Filter,
  MoreVertical
} from 'lucide-react';

const Meetings = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const meetings = [
    {
      id: 1,
      title: 'Product Strategy Review',
      date: '2025-08-05',
      time: '2:00 PM - 3:30 PM',
      status: 'completed',
      participants: ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson', 'Tom Brown'],
      type: 'video',
      duration: '1h 30m',
      recording: true,
      transcript: true,
    },
    {
      id: 2,
      title: 'Weekly Team Standup',
      date: '2025-08-05',
      time: '10:00 AM - 10:30 AM',
      status: 'completed',
      participants: ['Alice Cooper', 'Bob Wilson', 'Carol Davis', 'David Lee'],
      type: 'audio',
      duration: '30m',
      recording: true,
      transcript: true,
    },
    {
      id: 3,
      title: 'Client Presentation',
      date: '2025-08-06',
      time: '3:00 PM - 4:00 PM',
      status: 'upcoming',
      participants: ['Emma Thompson', 'James Rodriguez', 'Lisa Chen'],
      type: 'video',
      duration: '1h',
      recording: false,
      transcript: false,
    },
    {
      id: 4,
      title: 'Design Review Session',
      date: '2025-08-07',
      time: '11:00 AM - 12:00 PM',
      status: 'upcoming',
      participants: ['Alex Kim', 'Maria Garcia', 'Ryan Taylor', 'Sophie Anderson'],
      type: 'video',
      duration: '1h',
      recording: false,
      transcript: false,
    },
  ];

  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         meeting.participants.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterStatus === 'all' || meeting.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Meetings
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your meetings, recordings, and transcripts
          </p>
        </div>
        <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
          <button className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2 transition-colors">
            <Mic className="h-4 w-4" />
            <span>Record Audio</span>
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2 transition-colors">
            <Plus className="h-4 w-4" />
            <span>New Meeting</span>
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="flex-1 min-w-0">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search meetings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
                <option value="in-progress">In Progress</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Meetings List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {filteredMeetings.length} Meeting{filteredMeetings.length !== 1 ? 's' : ''}
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredMeetings.map((meeting) => (
            <div key={meeting.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <h4 className="text-lg font-medium text-gray-900 truncate">
                      {meeting.title}
                    </h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(meeting.status)}`}>
                      {meeting.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{meeting.date}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{meeting.time}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{meeting.participants.length} participants</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {meeting.type === 'video' ? (
                        <Video className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                      <span>{meeting.type}</span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center space-x-4">
                    {meeting.recording && (
                      <span className="inline-flex items-center text-xs text-green-600">
                        <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                        Recording Available
                      </span>
                    )}
                    {meeting.transcript && (
                      <span className="inline-flex items-center text-xs text-blue-600">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mr-1"></div>
                        Transcript Available
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Meetings;
