import React, { useState } from 'react';
import AppHeader from '../components/AppHeader';
import './ProfilePage.css'; // This line imports the CSS file

const ProfilePage = () => {
    const [activeTab, setActiveTab] = useState('profile');

    const user = {
        fullName: 'Pranab V',
        email: 'pran***@gmail.com',
        phone: '+91 86*****568',
        bio: 'Frontend developer passionate about building clean user interfaces.'
    };

    return (
        <div className="profilePageContainer">
            <AppHeader />
            <main className="profileMainContent">
                <div className="profileCard">
                    {/* Left Column: Navigation */}
                    <div className="profileNav">
                        <div className="profileHeader">
                            <div className="profileAvatar">PV</div>
                            <div className="profileHeaderText">
                                <h3>{user.fullName}</h3>
                                <p>Manage your profile and security</p>
                            </div>
                        </div>
                        <nav className="profileMenu">
                            <button
                                className={`menuItem ${activeTab === 'profile' ? 'active' : ''}`}
                                onClick={() => setActiveTab('profile')}
                            >
                                Edit Profile
                            </button>
                            <button
                                className={`menuItem ${activeTab === 'security' ? 'active' : ''}`}
                                onClick={() => setActiveTab('security')}
                            >
                                Security
                            </button>
                        </nav>
                    </div>

                    {/* Right Column: Form Content */}
                    <div className="profileContent">
                        {activeTab === 'profile' && (
                            <form className="profileForm">
                                <h2>Edit Profile</h2>
                                <div className="inputGroup">
                                    <label htmlFor="fullName">Full Name</label>
                                    <input type="text" id="fullName" defaultValue={user.fullName} />
                                </div>
                                <div className="inputGroup">
                                    <label htmlFor="email">Email</label>
                                    <input type="email" id="email" value={user.email} disabled />
                                </div>
                                <div className="inputGroup">
                                    <label htmlFor="phone">Phone Number</label>
                                    <input type="tel" id="phone" defaultValue={user.phone} />
                                </div>
                                <div className="inputGroup">
                                    <label htmlFor="bio">Your Bio</label>
                                    <textarea id="bio" rows="4" defaultValue={user.bio}></textarea>
                                </div>
                                <div className="formActions">
                                    <button type="button" className="cancelButton">Cancel</button>
                                    <button type="submit" className="saveButton">Save Changes</button>
                                </div>
                            </form>
                        )}

                        {activeTab === 'security' && (
                            <form className="profileForm">
                                <h2>Change Password</h2>
                                <div className="inputGroup">
                                    <label htmlFor="currentPassword">Current Password</label>
                                    <input type="password" id="currentPassword" />
                                </div>
                                <div className="inputGroup">
                                    <label htmlFor="newPassword">New Password</label>
                                    <input type="password" id="newPassword" />
                                </div>
                                <div className="inputGroup">
                                    <label htmlFor="confirmPassword">Confirm New Password</label>
                                    <input type="password" id="confirmPassword" />
                                </div>
                                <div className="formActions">
                                    <button type="submit" className="saveButton">Update Password</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ProfilePage;