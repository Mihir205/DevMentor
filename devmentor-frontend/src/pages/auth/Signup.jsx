import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import TRUNK from 'vanta/dist/vanta.trunk.min';
import './Signup.css';

const Signup = () => {
    const vantaRef = useRef(null);
    const [vantaEffect, setVantaEffect] = useState(0);

    useEffect(() => {
        if (!vantaEffect) {
            setVantaEffect(TRUNK({
                el: vantaRef.current,
                THREE: THREE,
                mouseControls: true,
                touchControls: true,
                gyroControls: false,
                minHeight: 200.00,
                minWidth: 200.00,
                scale: 1.00,
                scaleMobile: 1.00,
                backgroundColor: 0x1B263B,
                color: 0xEBF2F8,
                spacing: 5.00,
                chaos: 5.00
            }));
        }
        return () => {
            if (vantaEffect) vantaEffect.destroy();
        };
    }, [vantaEffect]);

    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);

    const handleSubmit = (event) => {
        event.preventDefault();

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
        if (!passwordRegex.test(password)) {
            alert("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.");
            return;
        }

        if (!termsAccepted) {
            alert("You must accept the Terms & Conditions and Privacy Policy.");
            return;
        }

        console.log('Signup successful with:', {
            fullName,
            username,
            email,
            phoneNumber,
            dateOfBirth
        });
    };

    return (
        <div className="signupContainer" ref={vantaRef}>
            <div className="leftPanelContent"> 
                <div className="branding">
                    <h1>DevMentor</h1>
                    <p>Your guide in development.</p>
                </div>
            </div>
            
            <div className="rightPanelContent">
                <div className="signupFormWrapper">
                    <h2>Create Account</h2>
                    <form onSubmit={handleSubmit} className="signupForm">
                        {/* **NEW STRUCTURE STARTS HERE** */}
                        
                        {/* Full Name & Username in one row, two columns */}
                        <div className="formTwoColumnRow">
                            <div className="inputGroup">
                                <label htmlFor="fullName">Full Name</label>
                                <input type="text" id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                            </div>
                            <div className="inputGroup">
                                <label htmlFor="username">Username (Optional)</label>
                                <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
                            </div>
                        </div>

                        {/* Email Address in its own row */}
                        <div className="formRow">
                            <div className="inputGroup">
                                <label htmlFor="email">Email Address</label>
                                <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                            </div>
                        </div>

                        {/* Phone Number & Date of Birth in one row, two columns */}
                        <div className="formTwoColumnRow">
                            <div className="inputGroup">
                                <label htmlFor="phoneNumber">Phone Number (Optional)</label>
                                <input type="tel" id="phoneNumber" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                            </div>
                            <div className="inputGroup">
                                <label htmlFor="dob">Date of Birth</label>
                                <input type="date" id="dob" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required />
                            </div>
                        </div>

                        {/* Password in its own row */}
                        <div className="formRow">
                            <div className="inputGroup">
                                <label htmlFor="password">Password</label>
                                <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                            </div>
                        </div>

                        {/* Confirm Password in its own row */}
                        <div className="formRow">
                            <div className="inputGroup">
                                <label htmlFor="confirmPassword">Confirm Password</label>
                                <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                            </div>
                        </div>
                        {/* **NEW STRUCTURE ENDS HERE** */}

                        {/* Terms and Conditions Checkbox */}
                        <div className="termsGroup">
                            <input type="checkbox" id="terms" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
                            <label htmlFor="terms">
                                I accept the <a href="/terms" target="_blank">Terms & Conditions</a> and <a href="/privacy" target="_blank">Privacy Policy</a>.
                            </label>
                        </div>

                        <button type="submit" className="submitButton">Create Account</button>
                    </form>
                    <div className="signInLink">
                        <p>Already have an account? <a href="/auth/login">Sign In</a></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Signup;