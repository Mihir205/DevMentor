import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './GoalSetup.css';

const GoalSetup = () => {
    const [goal, setGoal] = useState('');
    const navigate = useNavigate();

    const handleGoalSubmit = (event) => {
        event.preventDefault();
        if (goal.trim() === '') {
            alert('Please enter a goal to generate a roadmap.');
            return;
        }
        console.log('User goal:', goal);
        navigate('/'); // Redirect to home page
    };

    const handleSkip = () => {
        console.log('User skipped goal setup.');
        navigate('/'); // Redirect to home page
    };

    return (
        <div className="goalSetupPage">
            <header className="goalHeader">
                <div className="headerContainer">
                    <div className="logo">
                        <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                            <path d="M42.4379 44C42.4379 44 36.0744 33.9038 41.1692 24C46.8624 12.9336 42.2078 4 42.2078 4L7.01134 4C7.01134 4 11.6577 12.932 5.96912 23.9969C0.876273 33.9029 7.27094 44 7.27094 44L42.4379 44Z"></path>
                        </svg>
                        <h1>DevMentor</h1>
                    </div>
                    <nav className="mainNav">
                        <a href="/">Home</a>
                        <a href="/about">About Us</a>
                    </nav>
                    <div className="skipAction">
                        <button onClick={handleSkip}>Set up goal later</button>
                    </div>
                </div>
            </header>

            <main className="goalMainContent">
                <div className="contentWrapper">
                    <h2>What's Your Next Big Goal?</h2>
                    <p>Tell us what you want to achieve. We'll generate a personalized roadmap to guide you.</p>
                    <form onSubmit={handleGoalSubmit} className="goalForm">
                        <textarea
                            placeholder="e.g., 'Become a Senior Frontend Developer in 1 year'"
                            rows="4"
                            value={goal}
                            onChange={(e) => setGoal(e.target.value)}
                        ></textarea>
                        <button type="submit">Generate Roadmap</button>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default GoalSetup;