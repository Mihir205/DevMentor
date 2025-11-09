import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Signup.css';

const Signup = () => {
    const navigate = useNavigate();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [mobileNo, setMobileNo] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);

    const handleSubmit = (event) => {
        event.preventDefault();
        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }
        if (!termsAccepted) {
            alert("You must agree to the Terms and Conditions.");
            return;
        }
        console.log('New user signed up:', { firstName, lastName, mobileNo, email });
        navigate('/goal-setup');
    };

    return (
        <div className="signupPageContainer">
            <header className="signupHeader">
                <div className="headerContent">
                    <div className="logo">
                        <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                           <path clipRule="evenodd" d="M39.475 21.6262C40.358 21.4363 40.6863 21.5589 40.7581 21.5934C40.7876 21.655 40.8547 21.857 40.8082 22.3336C40.7408 23.0255 40.4502 24.0046 39.8572 25.2301C38.6799 27.6631 36.5085 30.6631 33.5858 33.5858C30.6631 36.5085 27.6632 38.6799 25.2301 39.8572C24.0046 40.4502 23.0255 40.7407 22.3336 40.8082C21.8571 40.8547 21.6551 40.7875 21.5934 40.7581C21.5589 40.6863 21.4363 40.358 21.6262 39.475C21.8562 38.4054 22.4689 36.9657 23.5038 35.2817C24.7575 33.2417 26.5497 30.9744 28.7621 28.762C30.9744 26.5497 33.2417 24.7574 35.2817 23.5037C36.9657 22.4689 38.4054 21.8562 39.475 21.6262ZM4.41189 29.2403L18.7597 43.5881C19.8813 44.7097 21.4027 44.9179 22.7217 44.7893C24.0585 44.659 25.5148 44.1631 26.9723 43.4579C29.9052 42.0387 33.2618 39.5667 36.4142 36.4142C39.5667 33.2618 42.0387 29.9052 43.4579 26.9723C44.1631 25.5148 44.659 24.0585 44.7893 22.7217C44.9179 21.4027 44.7097 19.8813 43.5881 18.7597L29.2403 4.41187C27.8527 3.02428 25.8765 3.02573 24.2861 3.36776C22.6081 3.72863 20.7334 4.58419 18.8396 5.74801C16.4978 7.18716 13.9881 9.18353 11.5858 11.5858C9.18354 13.988 7.18717 16.4978 5.74802 18.8396C4.58421 20.7334 3.72865 22.6081 3.36778 24.2861C3.02574 25.8765 3.02429 27.8527 4.41189 29.2403Z" fillRule="evenodd"></path>
                        </svg>
                        <h1>DevMentor</h1>
                    </div>
                    <a href="/auth/login" className="headerSignInButton">Sign In</a>
                </div>
            </header>

            <main className="signupMain">
                <div className="formCard">
                    <div className="formHeader">
                        <h2 className="formTitle">Create your account</h2>
                    </div>
                    <form onSubmit={handleSubmit} className="signupForm">
                        {/* CORRECTED STRUCTURE FOR TABBING */}
                        <div className="inputGroup">
                            <label htmlFor="first-name">First Name</label>
                            <input id="first-name" type="text" required placeholder="Enter your first name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                        </div>
                        <div className="inputGroup">
                            <label htmlFor="last-name">Last Name</label>
                            <input id="last-name" type="text" required placeholder="Enter your last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                        </div>

                        <div className="inputGroup">
                            <label htmlFor="email">Email address</label>
                            <input id="email" type="email" required placeholder="Enter your email address" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        <div className="inputGroup">
                            <label>Mobile Number</label>
                            <div className="phoneInputContainer">
                                <span className="phonePrefix">IN +91</span>
                                <input type="tel" required className="phoneInput" placeholder="Phone Number" value={mobileNo} onChange={(e) => setMobileNo(e.target.value)}/>
                            </div>
                        </div>

                        <div className="inputGroup">
                            <label htmlFor="password">Password</label>
                            <input id="password" type="password" required placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} />
                        </div>
                        <div className="inputGroup">
                            <label htmlFor="confirm-password">Confirm Password</label>
                            <input id="confirm-password" type="password" required placeholder="Confirm your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                        </div>

                        <div className="termsGroup">
                            <input id="terms" type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
                            <label htmlFor="terms">I agree to the <a href="#">Terms and Conditions</a></label>
                        </div>
                        
                        <div className="submitButtonContainer">
                            <button type="submit" className="submitButton">Create Account</button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default Signup;