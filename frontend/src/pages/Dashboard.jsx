import React from 'react';
import { 
  Calendar, 
  Users, 
  FileText, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus
} from 'lucide-react';

const Dashboard = () => {
  const stats = [
    {
      name: 'Total Meetings',
      value: '12',
      change: '+2.1%',
      changeType: 'increase',
      icon: Calendar,
    },
    {
      name: 'Active Projects',
      value: '8',
      change: '+4.3%',
      changeType: 'increase',
      icon: Users,
    },
    {
      name: 'Pending Tasks',
      value: '24',
      change: '-1.2%',
      changeType: 'decrease',
      icon: FileText,
    },
    {
      name: 'Completion Rate',
      value: '87%',
      change: '+5.4%',
      changeType: 'increase',
      icon: TrendingUp,
    },
  ];

  const recentMeetings = [
    {
      id: 1,
      title: 'Product Strategy Review',
      date: '2025-08-05',
      time: '2:00 PM',
      status: 'completed',
      participants: 5,
    },
    {
      id: 2,
      title: 'Weekly Team Standup',
      date: '2025-08-05',
      time: '10:00 AM',
      status: 'completed',
      participants: 8,
    },
    {
      id: 3,
      title: 'Client Presentation',
      date: '2025-08-06',
      time: '3:00 PM',
      status: 'upcoming',
      participants: 3,
    },
  ];

  const upcomingTasks = [
    {
      id: 1,
      title: 'Review meeting transcripts',
      priority: 'high',
      dueDate: '2025-08-06',
    },
    {
      id: 2,
      title: 'Update project timeline',
      priority: 'medium',
      dueDate: '2025-08-07',
    },
    {
      id: 3,
      title: 'Prepare presentation slides',
      priority: 'high',
      dueDate: '2025-08-06',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back! Here's what's happening with your meetings and projects.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2 transition-colors">
            <Plus className="h-4 w-4" />
            <span>New Meeting</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.name} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Icon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {item.name}
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {item.value}
                        </div>
                        <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                          item.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.change}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Meetings */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Recent Meetings
            </h3>
            <div className="space-y-3">
              {recentMeetings.map((meeting) => (
                <div key={meeting.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      meeting.status === 'completed' ? 'bg-green-400' : 'bg-blue-400'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{meeting.title}</p>
                      <p className="text-xs text-gray-500">
                        {meeting.date} at {meeting.time} • {meeting.participants} participants
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {meeting.status === 'completed' ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : (
                      <Clock className="h-5 w-5 text-blue-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Upcoming Tasks
            </h3>
            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      task.priority === 'high' ? 'bg-red-400' : 'bg-yellow-400'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{task.title}</p>
                      <p className="text-xs text-gray-500">Due: {task.dueDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <AlertCircle className={`h-5 w-5 ${
                      task.priority === 'high' ? 'text-red-400' : 'text-yellow-400'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
