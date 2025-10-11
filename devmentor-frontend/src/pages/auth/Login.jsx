import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import TRUNK from 'vanta/dist/vanta.trunk.min'; // Reverting to the TRUNK effect for stability
import './Login.css';

const Login = () => {
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
                backgroundColor: 0x1B263B, // Navy Blue background
                color: 0xEBF2F8,          // Light Gray Blue particles
                spacing: 5.00,
                chaos: 5.00
            }));
        }
        return () => {
            if (vantaEffect) vantaEffect.destroy();
        };
    }, [vantaEffect]);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);

    const handleSubmit = (event) => {
        event.preventDefault();
        console.log('Login attempt with:', { email, password, rememberMe });
    };

    const handleGoogleSignIn = () => {
        console.log('Google Sign-In button clicked!');
    };

    return (
        <div className="loginContainer" ref={vantaRef}>
            <div className="leftPanelContent">
                <div className="branding">
                    <h1>DevMentor</h1>
                    <p>Your guide in development.</p>
                </div>
            </div>

            <div className="rightPanelContent">
                <div className="loginFormWrapper">
                    <div className="formHeader">
                        <p className="welcomeMessage">Welcome back!</p>
                        <h2>You’re just one click away from progress...</h2>
                    </div>

                    <button type="button" className="socialButton googleButton" onClick={handleGoogleSignIn}>
                        <svg className="socialIcon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.42-4.55H24v8.51h13.01c-.59 2.97-2.27 5.47-4.81 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.82l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                            <path fill="none" d="M0 0h48v48H0z"></path>
                        </svg>
                        Continue with Google
                    </button>
                    
                    <div className="separator">
                        <span>Or</span>
                    </div>

                    <form onSubmit={handleSubmit} className="loginForm">
                        <div className="inputGroup">
                            <label htmlFor="email">Email Address</label>
                            <input
                                type="email" id="email" value={email}
                                onChange={(e) => setEmail(e.target.value)} required
                            />
                        </div>
                        <div className="inputGroup">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password" id="password" value={password}
                                onChange={(e) => setPassword(e.target.value)} required
                            />
                        </div>
                        <div className="formOptions">
                             <div className="rememberMe">
                                <input
                                    type="checkbox" id="rememberMe" checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                />
                                <label htmlFor="rememberMe">Remember Me</label>
                            </div>
                            <a href="/forgot-password" className="forgotPassword">Forgot Password?</a>
                        </div>
                        <button type="submit" className="submitButton">Sign In</button>
                    </form>

                    <div className="signUpLink">
                        <p>Don't have an account? <a href="/auth/signup">Sign Up</a></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;