import React, { useState } from 'react';
import AppHeader from '../components/AppHeader'; // Use the reusable header
import './RoadmapPage.css';

// This is the detailed placeholder data based on your "Web Development" example
const roadmapData = [
    {
        icon: "foundation",
        title: "Phase 1: The Foundation – Web Basics & Core Concepts",
        description: "Understand how the web works and learn the building blocks of the front-end.",
        whatToLearn: [
            "How the Web Works (HTTP, DNS, IP)",
            "HTML (Tags, Semantic HTML, Forms)",
            "CSS (Selectors, Box Model, Flexbox & Grid)",
            "Responsive Design (Media Queries)",
            "Basic Tools (VS Code, Git & GitHub)"
        ],
        outcome: "You can build static web pages that are visually appealing and responsive."
    },
    {
        icon: "code",
        title: "Phase 2: The Dynamic Front-End – JavaScript Essentials",
        description: "Make your websites interactive and understand programming fundamentals.",
        whatToLearn: [
            "Core JavaScript (Variables, Functions, Arrays, Objects)",
            "DOM Manipulation and Events",
            "Fetch API & JSON",
            "ES6+ (Arrow Functions, Promises, async/await)"
        ],
        outcome: "You can create interactive front-end features and fetch data from APIs."
    },
    {
        icon: "widgets",
        title: "Phase 3: Advanced Front-End – Modern Frameworks",
        description: "Learn modern development with frameworks and advanced styling tools.",
        whatToLearn: [
            "Front-End Framework (React)",
            "Components, Props, and State",
            "React Hooks (useState, useEffect)",
            "Routing (React Router)",
            "CSS Frameworks (e.g., Tailwind CSS)"
        ],
        outcome: "You can build full front-end applications with components and routing."
    },
    {
        icon: "dns",
        title: "Phase 4: The Back-End – Server, Database & APIs",
        description: "Learn to build and manage your own servers and databases.",
        whatToLearn: [
            "Back-End Fundamentals (REST APIs, CRUD)",
            "Node.js & Express.js",
            "Databases (SQL vs NoSQL - e.g., MongoDB)",
            "Authentication (JWT, Sessions)"
        ],
        outcome: "You can build a full back-end API with a connected database."
    },
    {
        icon: "cloud_upload",
        title: "Phase 5: Integration & Deployment",
        description: "Connect everything together and learn how to deploy real apps.",
        whatToLearn: [
            "Connecting Front-End & Back-End (CORS)",
            "Deployment (Vercel, Railway, etc.)",
            "Environment Variables (.env)",
            "CI/CD (Basic understanding)"
        ],
        outcome: "You can deploy a complete full-stack web application online."
    },
    {
        icon: "folder",
        title: "Phase 6 (Bonus): The Mini Project Phase",
        description: "Apply everything you learned to real-world mini projects.",
        whatToLearn: [
            "Project 1: Portfolio Website (HTML/CSS)",
            "Project 2: Quiz Game (JavaScript)",
            "Project 3: Weather App (React + API)",
            "Project 4: Full-Stack Blog (MERN)"
        ],
        outcome: "You’ll have a portfolio of real projects to show employers."
    }
];

// Simple component for Material Icons
const Icon = ({ name }) => (
    <span className="material-symbols-outlined">{name}</span>
);

const RoadmapPage = () => {
    // This state tracks which timeline item is expanded.
    // 'null' means all are closed.
    const [expandedIndex, setExpandedIndex] = useState(null);

    // This function toggles the clicked item
    const handleItemClick = (index) => {
        if (expandedIndex === index) {
            setExpandedIndex(null); // Clicked the same one, so close it
        } else {
            setExpandedIndex(index); // Clicked a new one, so open it
        }
    };

    return (
        <div className="roadmapPageContainer">
            <AppHeader />

            <main className="roadmapMain">
                <div className="pageHeader">
                    <h2>Web Developer Roadmap</h2>
                    <p>Your journey to becoming a web expert starts here. Follow the path, complete the tasks, and build your future.</p>
                </div>

                <div className="timelineContainer">
                    {roadmapData.map((item, index) => (
                        <div key={index} className="timeline-item">
                            <div className="timeline-icon">
                                <Icon name={item.icon} />
                            </div>
                            <div className="timeline-content">
                                <div className="timeline-card" onClick={() => handleItemClick(index)}>
                                    <h3>{item.title}</h3>
                                    <p>{item.description}</p>
                                </div>
                                {expandedIndex === index && (
                                    <div className="timeline-details">
                                        <h4>What to Learn:</h4>
                                        <ul>
                                            {item.whatToLearn.map(learnItem => (
                                                <li key={learnItem}>{learnItem}</li>
                                            ))}
                                        </ul>
                                        <h4>Outcome:</h4>
                                        <p>{item.outcome}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="finalNote">
                    <p>Click on each phase to view detailed tasks and assignments.</p>
                </div>
            </main>

            <footer className="roadmapFooter">
                <div className="footerContent">
                    <div className="footerLinks">
                        <a href="#">About</a>
                        <a href="#">Contact</a>
                        <a href="#">Terms of Service</a>
                    </div>
                    <p>© 2025 DevMentor. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default RoadmapPage;