import { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkCurrentAuth = async () => {
        try {
            setUser((await api.getMe()) || null);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkCurrentAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
        // Drop any cached shell so the next account on this device starts clean.
        navigator.serviceWorker?.controller?.postMessage('CLEAR_CACHES');
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
