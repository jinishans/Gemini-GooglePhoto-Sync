import { User } from '../types';

/**
 * Mocks the Google OAuth 2.0 Flow.
 * In a real app, this would use the Google Identity Services SDK.
 */
export const performGoogleLogin = async (): Promise<User> => {
  // Simulate network delay for auth
  await new Promise(resolve => setTimeout(resolve, 1500));

  const mockUsers = [
    {
      id: 'usr_1',
      name: 'Alex Chen',
      email: 'alex.chen@gmail.com',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
      token: 'mock_token_alex_123'
    },
    {
      id: 'usr_2',
      name: 'Sarah Jones',
      email: 'sarah.j@gmail.com',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
      token: 'mock_token_sarah_456'
    },
    {
      id: 'usr_3',
      name: 'Mike Ross',
      email: 'm.ross@gmail.com',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
      token: 'mock_token_mike_789'
    }
  ];

  // Randomly return a user to simulate different people logging in
  // In reality, this would be the result of the user's choice in the Google Popup
  const randomUser = mockUsers[Math.floor(Math.random() * mockUsers.length)];
  
  // Create a slight variation to allow "multiple logins" of similar profiles if needed, 
  // but here we just return the static ones for stability.
  return {
    ...randomUser,
    id: randomUser.id + '_' + Date.now() // Ensure uniqueness for the session list
  };
};