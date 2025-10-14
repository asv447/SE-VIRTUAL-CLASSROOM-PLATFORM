"use client";

import React, { useState } from 'react';

const dummyClassroomData = {
    subjectName: 'Software Engineering',
    courseCode: 'IT 314',
    professor: { 
        _id: 'prof1', 
        name: 'Saurabh Tiwari', 
        email: 'saurabh_tiwari@dau.ac.in' 
    },
    classCode: 'abcd123',
    students: [
        { _id: 's1', name: '202301447', email: '202301447@dau.ac.in' },
        { _id: 's2', name: '202301184', email: '202301447@dau.ac.in' },
        { _id: 's3', name: '202301474', email: '202301474@dau.ac.in' },
        { _id: 's4', name: '202301430', email: '202301430@dau.ac.in' },
        { _id: 's5', name: '202301461', email: '202301461@dau.ac.in' },
    ],
    posts: [
        {
            _id: 'p1',
            type: 'assignment',
            title: 'Assignment 1: Requirements Specification',
            author: { name: 'Saurabh Tiwari' },
            content: 'Please submit the SRS document for the project. The document should follow the format as specified in class.',
            timestamp: new Date('2025-09-15T09:00:00Z'),
            dueDate: new Date('2025-09-22T23:59:00Z'),
            chats: [
                { author: { name: '202301184'}, text: 'Sir, can you please extend the deadline?' },
                { author: { name: 'Saurabh Tiwari'}, text: 'I am sorry but I won\'t be able to extend the deadline any further.' },
            ]
        },
        {
            _id: 'p2',
            type: 'announcement',
            title: 'Welcome to Software Engineering!',
            author: { name: 'Saurabh Tiwari' },
            content: 'Welcome everyone! Please go through the course content available in the resources section. Our first class will be on Monday.',
            timestamp: new Date('2025-09-10T11:30:00Z'),
            chats: []
        },
        {
            _id: 'p3',
            type: 'assignment',
            title: 'Quiz 1: Software Development Life Cycle',
            author: { name: 'Saurabh Tiwari' },
            content: 'A short quiz on the different SDLC models will be held at the beginning of the next lecture.',
            timestamp: new Date('2025-09-20T14:00:00Z'),
            dueDate: new Date('2025-09-22T10:00:00Z'),
            chats: []
        }
    ]
};

const ClassroomHeader = ({ subjectName, courseCode, professorName, classCode }) => {
    const [copied, setCopied] = useState(false);

    const handleCopyCode = () => {
        if (!classCode) return;
        const tempInput = document.createElement('input');
        tempInput.value = classCode;
        document.body.appendChild(tempInput);
        tempInput.select();
        try {
            document.execCommand('copy');
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            console.error('Oops, unable to copy!!', err);
        }
        document.body.removeChild(tempInput);
    };

    return (
        <div className="bg-white text-gray-900 p-6 rounded-lg border border-gray-200 mb-8 shadow-sm">
            <h1 className="text-3xl font-bold text-gray-800">{subjectName}</h1>
    <p className="text-lg text-gray-500 mb-4">{courseCode} • {professorName}</p>
            <div className="bg-gray-100 text-gray-800 font-mono text-sm py-2 px-3 rounded-full inline-flex items-center border border-gray-300">
                <span>Class Code: <span className="font-bold tracking-wider">{classCode}</span></span>
        <button onClick={handleCopyCode} title="Copy class code" className="ml-3 p-1 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all duration-200">
                    {copied ? (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
         </svg>
                    )}
                </button>
            </div>
        </div>
    );
};

const Post = ({ post }) => {
    const [chats, setChats] = useState(post.chats || []);
    const [newChatMessage, setNewChatMessage] = useState('');

    const handleChatSubmit = (e) => {
        e.preventDefault();
        if (newChatMessage.trim()) {
            const newChatObj = { author: { name: 'You' }, text: newChatMessage.trim() };
       setChats([...chats, newChatObj]);
     setNewChatMessage('');
        }
    };
    
    const isAssignment = post.type === 'assignment';

    return (
        <div className="bg-white rounded-lg border border-gray-200 mb-6 overflow-hidden shadow-sm">
       <div className="p-6">
             <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center mr-4 bg-gray-200 border border-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           {isAssignment ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.875 9.168-3.918" />}
                        </svg>
    </div>
             <div>
                        <h3 className="font-semibold text-lg text-gray-800">{post.title}</h3>
                        <p className="text-sm text-gray-500">{post.author?.name || '...'} • {new Date(post.timestamp).toLocaleDateString()}</p>
                    </div>
                </div>
                <p className="text-gray-700 mb-4 whitespace-pre-wrap">{post.content}</p>
                {isAssignment && (
                     <div className="bg-gray-50 border border-gray-200 p-3 rounded-md">
                        <strong className="font-semibold text-gray-700">Deadline:</strong> {new Date(post.dueDate).toLocaleString()}
                    </div>
                )}
            </div>
            {/* Chat Section */}
            <div className="bg-gray-50 p-4 border-t border-gray-200">
                <h4 className="font-semibold text-gray-700 text-sm mb-3">{chats.length} class chats</h4>
                <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
        {chats.map((chat, index) => (
            <div key={index} className="flex items-start">
                             <div className="w-7 h-7 rounded-full bg-gray-300 flex-shrink-0 mr-3 flex items-center justify-center text-xs font-bold text-gray-600">
                          {chat.author?.name?.substring(0, 1) || 'U'}
                </div>
                            <div>
                            <span className="font-semibold text-sm text-gray-800">{chat.author?.name || 'Unknown User'}</span>
                       <p className="text-sm text-gray-700">{chat.text}</p>
                            </div>
                        </div>
                    ))}
                </div>
          <form onSubmit={handleChatSubmit} className="flex items-center">
                    <input
                        type="text"
                       value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                        placeholder="Add to the class chat..."
               className="flex-grow border border-gray-300 rounded-l-md p-2 text-sm focus:ring-gray-800 focus:border-gray-800 transition"
                    />
                    <button type="submit" className="bg-gray-800 text-white p-2 rounded-r-md hover:bg-gray-900 transition">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
       </button>
                </form>
            </div>
        </div>
    );
};

// Create Post Component
const CreatePost = ({ onAddPost }) => {
    const [postContent, setPostContent] = useState('');

    const handlePostSubmit = (e) => {
        e.preventDefault();
        if (postContent.trim()) {
            onAddPost(postContent);
            setPostContent('');
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6 shadow-sm">
            <form onSubmit={handlePostSubmit}>
                <textarea
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="Announce something to your class..."
                    className="w-full border-gray-300 rounded-md p-2 text-sm focus:ring-gray-800 focus:border-gray-800 transition"
                    rows="3"
                ></textarea>
                <div className="flex justify-end mt-2">
                    <button type="submit" className="bg-gray-800 text-white font-semibold px-4 py-2 rounded-md hover:bg-gray-900 transition text-sm">
                        Post
                    </button>
                </div>
            </form>
        </div>
    );
};


// AssignmentList Component
const AssignmentList = ({ posts }) => {
    const assignments = posts.filter(p => p.type === 'assignment');
    return (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Upcoming Assignments</h2>
     <button className="bg-gray-800 text-white font-semibold px-4 py-2 rounded-md hover:bg-gray-900 transition text-sm">
                    Add Assignment
      </button>
             </div>
             <div className="space-y-3">
                {assignments.length > 0 ? assignments.map(assignment => (
                    <div key={assignment._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md border border-gray-200">
                        <div>
           <p className="font-semibold text-gray-800">{assignment.title}</p>
               <p className="text-sm text-gray-500">Posted: {new Date(assignment.timestamp).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
               <p className="font-semibold text-gray-700 text-sm">Due: {new Date(assignment.dueDate).toLocaleDateString()}</p>
               </div>
            </div>
                )) : <p className="text-gray-600">No assignments posted yet.</p>}
             </div>
        </div>
    );
}


const PeopleList = ({ professor, students }) => (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div>
            <h2 className="text-xl font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4">Professor</h2>
   <div className="flex items-center space-x-4 p-2">
    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700">
                    {professor?.name ? professor.name.charAt(0) : 'P'}
          </div>
     <div>
                    <span className="font-medium text-lg text-gray-900">{professor?.name}</span>
         <p className="text-sm text-gray-500">{professor?.email}</p>
                </div>
   </div>
        </div>
        <div className="mt-6">
            <h2 className="text-xl font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4 flex justify-between items-center">
                <span>Students</span>
                <span className="text-base text-gray-500 font-medium">{students.length} students</span>
            </h2>
            <div className="space-y-1">
                {students.map(student => (
          <div key={student._id} className="flex items-center space-x-4 p-2 rounded-md hover:bg-gray-100">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700">
                    {student.name.charAt(0)}
                        </div>
                        <div>
             <span className="font-medium text-gray-800">{student.name}</span>
                            <p className="text-sm text-gray-500">{student.email}</p>
             </div>              </div>
                ))}
        </div>
        </div>
    </div>
);


export default function ClassroomPage() {
    const [classroom, setClassroom] = useState(dummyClassroomData);
    const [activeTab, setActiveTab] = useState('stream');

    const addPost = (content) => {
        const newPost = {
            _id: `p${Date.now()}`,
            type: 'announcement',
            title: content.substring(0, 30) + (content.length > 30 ? '...' : ''),
            author: { name: 'Saurabh Tiwari' },
            content,
            timestamp: new Date(),
            chats: []
        };
        setClassroom(prev => ({
            ...prev,
            posts: [newPost, ...prev.posts]
        }));
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'stream':
                return (
                    <div>
                        <CreatePost onAddPost={addPost} />
               {classroom.posts && classroom.posts.length > 0 ? (
                    classroom.posts.map(post => <Post key={post._id} post={post} />)                        ) : (
                         <p>No posts in this classroom yet.</p>
                    )}
                </div>
                );
            case 'assignments':
            return <AssignmentList posts={classroom.posts || []} />;
            case 'people':
                return <PeopleList professor={classroom.professor} students={classroom.students || []} />;
            default:
                return null;
        }
    };

    const TabButton = ({ tabName, label }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`px-4 py-2 font-semibold transition-colors duration-200 ${         activeTab === tabName
                    ? 'border-b-2 border-gray-800 text-gray-800'
                    : 'text-gray-500 hover:text-gray-800'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="bg-gray-100 min-h-screen font-sans">
            <div className="container mx-auto p-4 md:p-8">
                <ClassroomHeader
                    subjectName={classroom.subjectName}
           courseCode={classroom.courseCode}
                professorName={classroom.professor?.name}
             classCode={classroom.classCode}
                />
                
                <div className="flex justify-center border-b border-gray-200 mb-8">
                    <TabButton tabName="stream" label="Stream" />
            <TabButton tabName="assignments" label="Assignments" />
             <TabButton tabName="people" label="People" />
                </div>
                <div className="max-w-3xl mx-auto">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}

