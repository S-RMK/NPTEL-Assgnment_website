import { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';

const AppContext = createContext();

/*
 * Edit mode reveals the create/delete controls.
 *
 * It used to be gated by a hard-coded PIN ("1234") checked in the browser, which was
 * decoration — the underlying API accepted writes from anyone. Now that the server
 * requires an ADMIN token and Firestore rejects client writes outright, edit mode is
 * tied to the real role: a non-admin toggling it would only produce 401s.
 *
 * Requires AuthProvider above it in the tree.
 */
export const AppProvider = ({ children }) => {
    const { isAdmin } = useAuth();
    const [isEditMode, setIsEditMode] = useState(false);

    // Drop edit mode if the role goes away (logout, or session expiry mid-visit).
    useEffect(() => {
        if (!isAdmin && isEditMode) setIsEditMode(false);
    }, [isAdmin, isEditMode]);

    const toggleEditMode = () => {
        if (!isAdmin) return;
        setIsEditMode((prev) => !prev);
    };

    return (
        <AppContext.Provider value={{ isEditMode: isEditMode && isAdmin, toggleEditMode, canEdit: Boolean(isAdmin) }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => useContext(AppContext);
