import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ScrollHideContextType {
    showNavigation: boolean;
}

const ScrollHideContext = createContext<ScrollHideContextType>({ showNavigation: true });

export const useScrollHide = () => useContext(ScrollHideContext);

export const ScrollHideProvider = ({ children }: { children: ReactNode }) => {
    const [showNavigation, setShowNavigation] = useState(true);
    const [lastScrollTop, setLastScrollTop] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            
            // Show navigation when scrolling up or at the top
            if (scrollTop < lastScrollTop || scrollTop < 50) {
                setShowNavigation(true);
            } else {
                setShowNavigation(false);
            }
            
            setLastScrollTop(scrollTop);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [lastScrollTop]);

    return (
        <ScrollHideContext.Provider value={{ showNavigation }}>
            {children}
        </ScrollHideContext.Provider>
    );
}; 