import { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkCurrentAuth();
    }, []);

    const checkCurrentAuth = async () => {
        try {
            const me = await api.getMe();
            if (me) {
                setUser(me);
            } else {
                setUser(null);
            }
        } catch (err) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (username, password) => {
        const data = await api.login({ username, password });
        setUser(data.user);
        return data.user;
    };

    const register = async (username, password, displayName, selectedCourses) => {
        const data = await api.register({ username, password, displayName, selectedCourses });
        setUser(data.user);
        return data.user;
    };

    const logout = () => {
        api.logout();
        setUser(null);
    };

    const updatePreferences = async (selectedCourses) => {
        await api.updateCoursePreferences(selectedCourses);
        if (user) {
            setUser(prev => ({ ...prev, selectedCourses }));
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            register,
            logout,
            updatePreferences,
            isAdmin: user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
