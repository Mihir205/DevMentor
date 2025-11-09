import React, { useState } from 'react';
import AppHeader from '../components/AppHeader'; // Import the reusable header
import './SupportPage.css';

const SupportPage = () => {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        // In a real app, you'd send this data to your backend or an email service
        console.log('Support Request:', { subject, message });
        alert('Your support request has been sent! We will get back to you soon.');
        setSubject('');
        setMessage('');
    };

    return (
        <div className="supportPageContainer">
            <AppHeader />

            <main className="supportMainContent">
                <div className="supportHeader">
                    <h1>Support</h1>
                    <p>How can we help you today?</p>
                </div>

                <div className="supportLayout">
                    {/* Left Side: Contact Form */}
                    <div className="contactFormCard">
                        <h2>Send us a message</h2>
                        <form onSubmit={handleSubmit} className="supportForm">
                            <div className="inputGroup">
                                <label htmlFor="subject">Subject</label>
                                <input
                                    type="text"
                                    id="subject"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="e.g., 'Issue with my roadmap'"
                                    required
                                />
                            </div>
                            <div className="inputGroup">
                                <label htmlFor="message">Message</label>
                                <textarea
                                    id="message"
                                    rows="6"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Please describe your issue in detail..."
                                    required
                                ></textarea>
                            </div>
                            <button type="submit" className="submitButton">Send Message</button>
                        </form>
                        <p className="emailFallback">
                            You can also email us directly at <a href="mailto:support@devmentor.com">support@devmentor.com</a>
                        </p>
                    </div>

                    {/* Right Side: FAQ */}
                    <div className="faqCard">
                        <h2>Frequently Asked Questions</h2>
                        <div className="faqList">
                            <div className="faqItem">
                                <h3>How do I change my goal?</h3>
                                <p>You can set a new goal at any time by clicking the "+ Setup a new goal" button in the header. This will generate a new roadmap for you.</p>
                            </div>
                            <div className="faqItem">
                                <h3>How do I edit my profile?</h3>
                                <p>Click your avatar in the top-right corner, then select "My Personal Info" from the dropdown to update your name, bio, and other details.</p>
                            </div>
                            <div className="faqItem">
                                <h3>How does the roadmap progress work?</h3>
                                <p>Roadmap progress is currently a visual guide. In the future, you'll be able to mark tasks as complete to see your progress bar fill up!</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SupportPage;