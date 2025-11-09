// src/components/PhoneInputWithCountryCode.jsx

import React from 'react';
import './PhoneInputWithCountryCode.css'; // We'll create this CSS next

const PhoneInputWithCountryCode = ({ value, onChange, placeholder = "Phone Number" }) => {
    // For now, we'll hardcode +91 and an Indian flag.
    // In a real app, this would involve a state to manage selected country/code
    // and a dropdown menu to change it.

    return (
        <div className="phoneInputWrapper">
            {/* This is the placeholder for the country dropdown */}
            <div className="countrySelector">
                <span className="countryFlag" role="img" aria-label="India flag">🇮🇳</span>
                <span className="countryCode">+91</span>
                {/* Add an arrow icon here if you plan to make it clickable */}
            </div>
            <input
                type="tel"
                className="phoneInputField"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required
            />
        </div>
    );
};

export default PhoneInputWithCountryCode;