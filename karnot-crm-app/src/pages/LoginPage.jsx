import React, { useState } from 'react';
import { KARNOT_LOGO_BASE64, Card, Button, Input } from '../data/constants';

// This is your LoginScreen component, moved from App.jsx
// We've updated it for Firebase Email/Password login
const LoginPage = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Please enter both email and password.');
            return;
        }
        setError('');
        onLogin(email, password); // This will call the Firebase login function from App.jsx
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <Card className="w-full max-w-sm">
                <div className="text-center">
                    <img src={KARNOT_LOGO_BASE64} alt="Karnot Logo" className="mx-auto" style={{height: '60px'}}/>
                    <h2 className="text-2xl font-bold text-gray-800 mt-4">Karnot CRM Login</h2>
                </div>
                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    <Input 
                        id="email" 
                        type="email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        placeholder="Email Address" 
                        required 
                    />
                    <Input 
                        id="password" 
                        type="password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        placeholder="Password" 
                        required 
                    />
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <Button type="submit" className="w-full">Unlock</Button>
                </form>
            </Card>
        </div>
    );
};

export default LoginPage;
