"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import CreateAnnouncement from '@/components/announcements/CreateAnnouncement';
import AnnouncementList from '@/components/announcements/AnnouncementList';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const dummyClassroomData = {
    subjectName: 'Software Engineering',
    courseCode: 'IT 314',
    professor: { 
        _id: 'prof1', 
        name: 'Saurabh Tiwari', 
        email: 'saurabh_tiwari@dau.ac.in' 
    },
    classCode: 'abcd123',
    classroomId: 'SE_IT314_2025', // Added for announcements
    students: [
        { _id: 's1', name: '202301447', email: '202301447@dau.ac.in' },
        { _id: 's2', name: '202301184', email: '202301184@dau.ac.in' },
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
    ],
    // Global chat for the classroom
    classroomChat: [
        { author: { name: '202301184' }, text: 'When is the next class?', timestamp: new Date() },
        { author: { name: 'Saurabh Tiwari' }, text: 'Monday, 10 AM.', timestamp: new Date() },
    ]
};

const ClassroomHeader = ({ subjectName, courseCode, professorName, classCode }) => {
    const [copied, setCopied] = useState(false);

    const handleCopyCode = () => {
        if (!classCode) return;
        navigator.clipboard.writeText(classCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-white text-gray-900 p-6 rounded-lg border border-gray-200 mb-8 shadow-sm">
            <h1 className="text-3xl font-bold text-gray-800">{subjectName}</h1>
            <p className="text-lg text-gray-500 mb-4">{courseCode} • {professorName}</p>
            <div className="bg-gray-100 text-gray-800 font-mono text-sm py-2 px-3 rounded-full inline-flex items-center border border-gray-300">
                <span>Class Code: <span className="font-bold tracking-wider">{classCode}</span></span>
                <button onClick={handleCopyCode} title="Copy class code" className="ml-3 p-1 rounded-full hover:bg-gray-200 transition">
                    {copied ? (
                        <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        <svg className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {isAssignment ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.875 9.168-3.918" />
                            )}
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg text-gray-800">{post.title}</h3>
                        <p className="text-sm text-gray-500">{post.author?.name || '...'} • {new Date(post.timestamp).toLocaleDateString()}</p>
                    </div>
                </div>
                <p className="text-gray-700 mb-4 whitespace-pre-wrap">{post.content}</p>
                {isAssignment && (
                    <div className="bg-gray-50 border border-gray-200 p-3 rounded-md mb-4">
                        <strong className="font-semibold text-gray-700">Deadline:</strong> {new Date(post.dueDate).toLocaleString()}
                    </div>
                )}
            </div>

            {/* Comment Section */}
            <div className="bg-gray-50 p-4 border-t border-gray-200">
                <h4 className="font-semibold text-gray-700 text-sm mb-3">{chats.length} comment{chats.length !== 1 ? 's' : ''}</h4>
                <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                    {chats.map((chat, index) => (
                        <div key={index} className="flex items-start">
                            <div className="w-7 h-7 rounded-full bg-gray-300 flex-shrink-0 mr-3 flex items-center justify-center text-xs font-bold text-gray-600">
                                {chat.author?.name?.[0] || 'U'}
                            </div>
                            <div>
                                <span className="font-semibold text-sm text-gray-800">{chat.author?.name || 'Unknown'}</span>
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
                        placeholder="Ask a doubt or comment..."
                        className="flex-grow border border-gray-300 rounded-l-md p-2 text-sm focus:ring-gray-800 focus:border-gray-800 transition"
                    />
                    <button type="submit" className="bg-gray-800 text-white p-2 rounded-r-md hover:bg-gray-900 transition">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
};

// Assignment List
const AssignmentList = ({ posts }) => {
    const assignments = posts.filter(p => p.type === 'assignment');
    return (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Upcoming Assignments</h2>
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
};

const PeopleList = ({ professor, students }) => (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div>
            <h2 className="text-xl font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4">Professor</h2>
            <div className="flex items-center space-x-4 p-2">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700">
                    {professor?.name?.[0] || 'P'}
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
                            {student.name[0]}
                        </div>
                        <div>
                            <span className="font-medium text-gray-800">{student.name}</span>
                            <p className="text-sm text-gray-500">{student.email}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

// NEW: Global Classroom Chat
const ClassroomChat = ({ chatMessages, onSendMessage }) => {
    const [message, setMessage] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (message.trim()) {
            onSendMessage(message.trim());
            setMessage('');
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm h-full flex flex-col">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Classroom Chat</h2>
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-96">
                {chatMessages.length > 0 ? (
                    chatMessages.map((msg, i) => (
                        <div key={i} className="flex items-start">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex-shrink-0 mr-3 flex items-center justify-center text-sm font-bold text-indigo-700">
                                {msg.author.name[0]}
                            </div>
                            <div>
                                <p className="font-medium text-sm text-gray-900">{msg.author.name}</p>
                                <p className="text-sm text-gray-700">{msg.text}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-500 italic">No messages yet. Start the conversation!</p>
                )}
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-grow border border-gray-300 rounded-md p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition text-sm font-medium">
                    Send
                </button>
            </form>
        </div>
    );
};

export default function ClassroomPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const classroomId = searchParams.get('id') || searchParams.get('classId');
    const requestedTab = searchParams.get('tab');
    
    const [classroom, setClassroom] = useState(null);
    const [activeTab, setActiveTab] = useState('announcements');
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [username, setUsername] = useState('');
    const [userRole, setUserRole] = useState('Student'); // Will be 'Professor', 'TA', or 'Student'
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const [error, setError] = useState('');

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                
                try {
                    // Check if email is instructor domain
                    const isInstructorEmail = currentUser.email?.endsWith("@instructor.com") || 
                                            currentUser.email?.endsWith("@admin.com");

                    // Fetch user data from MongoDB API
                    const res = await fetch(`/api/users?uid=${currentUser.uid}`);
                    if (res.ok) {
                        const data = await res.json();
                        const userName = data.user?.username || data.user?.name || currentUser.displayName || currentUser.email.split("@")[0];
                        const isInstructor = data.user?.role === "instructor" || isInstructorEmail;
                        
                        setUsername(userName);
                        setIsAdmin(isInstructor);
                        setUserRole(isInstructor ? 'Professor' : 'Student');
                    } else {
                        // User not found in database, use defaults
                        setUsername(currentUser.displayName || currentUser.email.split("@")[0]);
                        setIsAdmin(isInstructorEmail);
                        setUserRole(isInstructorEmail ? 'Professor' : 'Student');
                    }
                } catch (err) {
                    console.error("Error fetching user data:", err);
                    setUsername(currentUser.displayName || currentUser.email.split("@")[0]);
                    setIsAdmin(false);
                    setUserRole('Student');
                }
            } else {
                setUser(null);
                setUsername('');
                setIsAdmin(false);
                setUserRole('Student');
            }
        });
        return () => unsubscribe();
    }, []);

    // Fetch classroom data from database
    useEffect(() => {
        if (user && classroomId) {
            fetchClassroomData();
        } else if (user && !classroomId) {
            setAuthorized(false);
            setError('No classroom selected.');
            setLoading(false);
        }
    }, [user, classroomId]);

    const fetchClassroomData = async () => {
        setLoading(true);
        setError('');
        try {
            // Fetch classroom from API
            const response = await fetch(`/api/classroom?classId=${classroomId}`);
            
            if (!response.ok) {
                // If classroom not found in DB, fall back to dummy data
                console.warn('Classroom not found in database, using dummy data');
                setClassroom(dummyClassroomData);
                setAuthorized(true);
                setLoading(false);
                return;
            }

            const classroomData = await response.json();
            
            // Check authorization: user must be instructor OR enrolled student
            const isInstructor = classroomData.instructorId === user.uid || 
                               classroomData.professor?._id === user.uid;
            const isEnrolledStudent = classroomData.students?.some(
                student => student._id === user.uid || student.uid === user.uid
            );

            if (!isInstructor && !isEnrolledStudent) {
                setError('You are not authorized to view this classroom. You must be either the instructor or an enrolled student.');
                setAuthorized(false);
                setLoading(false);
                return;
            }

            setClassroom(classroomData);
            setAuthorized(true);
        } catch (err) {
            console.error('Error fetching classroom:', err);
            // Fall back to dummy data on error
            setClassroom(dummyClassroomData);
            setAuthorized(true);
        } finally {
            setLoading(false);
        }
    };

    const sendGlobalMessage = (text) => {
        const newMsg = {
            author: { name: 'You' }, // In real app, get from auth
            text,
            timestamp: new Date()
        };
        setClassroom(prev => ({
            ...prev,
            classroomChat: [...prev.classroomChat, newMsg]
        }));
    };

    useEffect(() => {
        if (!requestedTab) {
            return;
        }
        const lowerTab = requestedTab.toLowerCase();
        const validTabs = ['stream', 'announcements', 'assignments', 'chat', 'people'];
        if (validTabs.includes(lowerTab)) {
            setActiveTab(lowerTab);
        }
    }, [requestedTab]);

    const renderContent = () => {
        switch (activeTab) {
            case 'announcements':
                return (
                    <div className="space-y-6">
                        {/* Show create form only for admins/faculty */}
                        {isAdmin && user && classroom && (
                            <CreateAnnouncement
                                classroomId={classroom.classroomId || classroom._id || classroom.id || classroomId}
                                subject={classroom.subjectName || classroom.name || classroom.subject}
                                authorName={username}
                                authorRole={userRole}
                                onAnnouncementCreated={() => {
                                    // Refresh list is handled by the list component
                                }}
                            />
                        )}
                        
                        {/* Show announcements list for everyone */}
                        {classroom && (
                            <AnnouncementList
                                classroomId={classroom.classroomId || classroom._id || classroom.id || classroomId}
                                isAdmin={isAdmin}
                                                        currentUser={user ? {
                                                            uid: user.uid,
                                                            displayName: username,
                                                            email: user.email,
                                                            role: userRole
                                                        } : null}
                            />
                        )}
                    </div>
                );
            case 'assignments':
                return <AssignmentList posts={classroom.posts || []} />;
            case 'chat':
                return <ClassroomChat chatMessages={classroom.classroomChat} onSendMessage={sendGlobalMessage} />;
            case 'people':
                return <PeopleList professor={classroom.professor} students={classroom.students || []} />;
            default:
                return null;
        }
    };

    const TabButton = ({ tabName, label }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`px-4 py-2 font-semibold transition-colors duration-200 ${
                activeTab === tabName
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-800'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="container mx-auto">
            {loading ? (
                <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            ) : !authorized ? (
                <div className="flex items-center justify-center min-h-screen">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
                        <h2 className="text-xl font-bold text-red-900 mb-2">Access Denied</h2>
                        <p className="text-red-700">{error || 'You are not authorized to view this classroom.'}</p>
                        <button 
                            onClick={() => router.push('/')}
                            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                        >
                            Go to Home
                        </button>
                    </div>
                </div>
            ) : !classroom ? (
                <div className="flex items-center justify-center min-h-screen">
                    <p className="text-gray-600">Classroom not found.</p>
                </div>
            ) : (
                <>
                    <ClassroomHeader
                        subjectName={classroom.subjectName || classroom.name}
                        courseCode={classroom.courseCode || classroom.code}
                        professorName={classroom.professor?.name || classroom.instructorName}
                        classCode={classroom.classCode || classroom.code}
                    />

                    {/* Tabs: Stream → Announcements → Assignments → Chat → People */}
                    <div className="bg-white rounded-lg shadow-sm mb-6">
                        <div className="flex justify-center border-b border-gray-200 space-x-1">
                            <TabButton tabName="announcements" label="Announcements" />
                            <TabButton tabName="assignments" label="Assignments" />
                            <TabButton tabName="chat" label="Chat" />
                            <TabButton tabName="people" label="People" />
                        </div>
                        <div className="p-4">
                            {renderContent()}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}