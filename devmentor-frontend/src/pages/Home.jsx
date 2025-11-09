import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import './Home.css';

const Home = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const user = {
        name: 'Pranab',
        avatarInitial: 'PV',
        goal: 'Become a Frontend Developer'
    };

    const stats = {
        progress: 72,
        tasksCompleted: 14,
        tasksTotal: 20,
        streak: 5,
        nextMilestone: "React Hooks"
    };

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    const handleLogout = () => {
        console.log("User logged out");
        navigate('/auth/login');
    };

    return (
        <div className="homePageContainer">
            <AppHeader />

            <main className="homeMainContent">
                <div className="widgetGrid">
                    <div className="widgetCard">
                        <span className="widgetTitle">Goal Progress</span>
                        <span className="widgetValue">{stats.progress}%</span>
                        <span className="widgetDescription">Completed</span>
                    </div>
                    <div className="widgetCard">
                        <span className="widgetTitle">Tasks Completed</span>
                        <span className="widgetValue">{stats.tasksCompleted} / {stats.tasksTotal}</span>
                        <span className="widgetDescription">Tasks Done</span>
                    </div>
                    <div className="widgetCard">
                        <span className="widgetTitle">Active Streak</span>
                        <span className="widgetValue">{stats.streak} Days</span>
                        <span className="widgetDescription">In a Row</span>
                    </div>
                    <div className="widgetCard">
                        <span className="widgetTitle">Next Milestone</span>
                        <span className="widgetValue">{stats.nextMilestone}</span>
                        <span className="widgetDescription">Up Next</span>
                    </div>
                </div>

                <div className="goalDisplay">
                    <h2>Your current goal: <span>{user.goal}</span></h2>
                </div>

                <div className="roadmapSection">
                    <div className="roadmapHeader">
                        <h3>Your Roadmap</h3>
                        <div className="roadmapSearchContainer">
                            <input type="search" placeholder="Search in roadmap..." />
                            <div className="searchIcon">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                            </div>
                        </div>
                    </div>
                    <div className="kanbanBoard">
                        <div className="kanbanColumn">
                            <h4>To Do</h4>
                            <div className="kanbanCards">
                                <div className="card">Practice CSS3</div>
                                <div className="card">Understand JavaScript ES6</div>
                            </div>
                            <div className="kanbanColumnFooter">
                                <button className="addCardButton" onClick={() => setIsModalOpen(true)}>+ Add a card</button>
                            </div>
                        </div>
                        <div className="kanbanColumn">
                            <h4>In Progress</h4>
                            <div className="kanbanCards">
                                <div className="card">Build a portfolio website</div>
                            </div>
                            <div className="kanbanColumnFooter">
                                <button className="addCardButton" onClick={() => setIsModalOpen(true)}>+ Add a card</button>
                            </div>
                        </div>
                        <div className="kanbanColumn">
                            <h4>Done</h4>
                            <div className="kanbanCards">
                                <div className="card done">Learn HTML5</div>
                                <div className="card done">Completed JavaScript course</div>
                            </div>
                            <div className="kanbanColumnFooter">
                                <button className="addCardButton" onClick={() => setIsModalOpen(true)}>+ Add a card</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="exploreSection">
                    <h3>Explore other roadmaps</h3>
                    <div className="exploreGrid">
                        <div className="exploreCard">
                            <div className="cardImage" style={{ backgroundImage: `url("https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=2070")` }}></div>
                            <div className="cardContent">
                                <h4>Web Development</h4>
                                <p>Learn to build websites and web applications.</p>
                                <Link to="/roadmap" className="exploreButton">View Roadmap</Link>
                            </div>
                        </div>
                        <div className="exploreCard">
                            <div className="cardImage" style={{ backgroundImage: `url("https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070")` }}></div>
                            <div className="cardContent">
                                <h4>Cyber Security</h4>
                                <p>Protect systems from digital attacks.</p>
                                <Link to="/roadmap" className="exploreButton">View Roadmap</Link>
                            </div>
                        </div>
                        <div className="exploreCard">
                             <div className="cardImage" style={{ backgroundImage: `url("https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?q=80&w=2070")` }}></div>
                            <div className="cardContent">
                                <h4>Data Science</h4>
                                <p>Analyze and interpret complex data.</p>
                                <Link to="/roadmap" className="exploreButton">View Roadmap</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {isModalOpen && (
                <div className="modalOverlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modalContent" onClick={(e) => e.stopPropagation()}>
                        <div className="modalHeader">
                            <h3>Add/Edit Task</h3>
                            <button className="modalCloseButton" onClick={() => setIsModalOpen(false)}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="modalBody">
                            <div className="inputGroup">
                                <label htmlFor="taskTitle">Task Title</label>
                                <input id="taskTitle" type="text" className="formInput" placeholder="e.g., Learn HTML5" />
                            </div>
                            <div className="inputGroup">
                                <label htmlFor="taskDesc">Description</label>
                                <textarea id="taskDesc" rows="4" className="formInput" placeholder="Add a description..."></textarea>
                            </div>
                        </div>
                        <div className="modalFooter">
                            <button className="modalButton cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
                            <button className="modalButton save" onClick={() => setIsModalOpen(false)}>Save Task</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;