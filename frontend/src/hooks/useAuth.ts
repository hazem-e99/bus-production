'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { User } from '@/types/user';
import { authAPI } from '@/lib/api';
import { settingsAPI } from '@/lib/api';
import { LoginResponse, LoginViewModel } from '@/types/auth';

interface AuthContextType {
	user: User | null;
	login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
	logout: () => void;
	isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const storedUser = localStorage.getItem('user');
		const storedToken = localStorage.getItem('token') || localStorage.getItem('authToken');
		
		if (storedUser) {
			try {
				const parsed: User = JSON.parse(storedUser);
				// Normalize previously stored role to app keys (in case login mapping didn't run)
				const roleMap: Record<string, User['role']> = {
					Admin: 'admin',
					Driver: 'driver',
					MovementManager: 'movement-manager',
					Conductor: 'supervisor',
					Supervisor: 'supervisor',
					Student: 'student',
				};
				const apiRole = String((parsed as { role?: string })?.role || '').trim();
				const normalizedRole: User['role'] = roleMap[apiRole] || (apiRole.toLowerCase() as User['role']) || 'student';
				const normalizedUser: User = { 
					...parsed, 
					role: normalizedRole,
					token: storedToken || parsed.token || '' // Use stored token if available
				};
				setUser(normalizedUser);
				// Persist normalized role back to storage to avoid flicker
				localStorage.setItem('user', JSON.stringify(normalizedUser));
			} catch {
				localStorage.removeItem('user');
				localStorage.removeItem('token');
				localStorage.removeItem('authToken');
			}
		}
		setIsLoading(false);
	}, []);

	const login = async (email: string, password: string, rememberMe: boolean = false): Promise<boolean> => {
		setIsLoading(true);
		
		try {
			// Use global authentication API
			const response: LoginResponse = await authAPI.login({ email, password, rememberMe });
			
			if (response && response.success) {
				// Login successful - extract user data from new schema
				const userData: LoginViewModel = response.data;
				
				// Normalize API role to app's internal role keys for navigation
				const apiRole = String(userData.role || '').trim();
				const roleMap: Record<string, User['role']> = {
					Admin: 'admin',
					Driver: 'driver',
					MovementManager: 'movement-manager',
					Conductor: 'supervisor',
					Supervisor: 'supervisor',
					Student: 'student',
				};
				const normalizedRole: User['role'] = roleMap[apiRole] || (apiRole.toLowerCase() as User['role']) || 'student';
				
				// Create user object from LoginViewModel
				const foundUser: User = {
					id: userData.id,
					profileId: userData.profileId,
					email: userData.email || '',
					fullName: userData.fullName || '',
					role: normalizedRole,
					token: userData.token || '',
					expiration: userData.expiration || '',
					// Add default values for compatibility
					name: userData.fullName || '',
					phone: '',
					nationalId: '',
					department: '',
					academicYear: '',
					status: 'active',
					subscriptionStatus: 'none',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				};
				
				// Check maintenance mode and block non-admin logins (optional - ignore if endpoint doesn't exist)
				try {
					const maintenanceResponse = await settingsAPI.getMaintenanceMode();
					if (maintenanceResponse && maintenanceResponse.maintenanceMode && foundUser.role !== 'admin') {
						return false;
					}
				} catch (error: unknown) {
					// Silently ignore 404 errors for maintenance mode check
					      if (!(error as Error)?.message?.includes('404')) {
						console.error('Failed to check maintenance mode:', error);
					}
				}
				
				// Set user and store in localStorage/cookie
				setUser(foundUser);
				localStorage.setItem('user', JSON.stringify(foundUser));
				
				// Store token separately for API calls
				if (userData.token) {
					localStorage.setItem('token', userData.token);
					localStorage.setItem('authToken', userData.token);
				}
				
				// Set cookie expiration based on rememberMe
				const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24; // 30 days or 1 day
				document.cookie = `user=${encodeURIComponent(JSON.stringify(foundUser))}; path=/; max-age=${maxAge}`;
				
				return true;
			}
			
			return false;
		} catch (error: unknown) {
			console.error('Login error:', error);
			return false;
		} finally {
			setIsLoading(false);
		}
	};

	const logout = () => {
		try {
			setUser(null);
			localStorage.removeItem('user');
			localStorage.removeItem('token');
			localStorage.removeItem('authToken');
			localStorage.removeItem('access_token');
			document.cookie = 'user=; path=/; max-age=0';
		} catch (error: unknown) {
			console.error('Logout error:', error);
		}
	};

	const contextValue = {
		user,
		login,
		logout,
		isLoading,
	};

	return React.createElement(AuthContext.Provider, { value: contextValue }, children);
}; 
