const API_URL = import.meta.env.VITE_API_URL;

export async function apiFetch(getToken, path, options = {}) {
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/user${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}
