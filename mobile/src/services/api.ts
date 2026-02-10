const API_URL = 'http://localhost:3000/api';

export const api = {
  // Auth
  register: async (username: string, email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    return res.json();
  },

  login: async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },

  getProfile: async (token: string) => {
    const res = await fetch(`${API_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  // Quests
  createQuest: async (token: string, data: {
    title: string;
    description?: string;
    latitude: number;
    longitude: number;
    category?: string;
  }) => {
    const res = await fetch(`${API_URL}/quests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  getNearbyQuests: async (token: string, lat: number, lng: number, radius = 5) => {
    const res = await fetch(
      `${API_URL}/quests/nearby?lat=${lat}&lng=${lng}&radius=${radius}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.json();
  },

  getQuest: async (token: string, id: string) => {
    const res = await fetch(`${API_URL}/quests/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  joinQuest: async (token: string, id: string) => {
    const res = await fetch(`${API_URL}/quests/${id}/join`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  leaveQuest: async (token: string, id: string) => {
    const res = await fetch(`${API_URL}/quests/${id}/leave`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  // Chat
  getMessages: async (token: string, questId: string) => {
    const res = await fetch(`${API_URL}/chat/${questId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  sendMessage: async (token: string, questId: string, message: string) => {
    const res = await fetch(`${API_URL}/chat/${questId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    });
    return res.json();
  },
};
