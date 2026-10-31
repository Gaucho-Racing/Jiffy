import axios from "axios";
import { JIFFY_API_URL } from "@/consts/config";

export const MAX_SEARCH_RESULTS = 6;
const DIRECTORY_STALE_MS = 5 * 60 * 1000;

export type DirectoryUser = {
  id: string;
  name: string;
  username: string;
  avatar_url: string;
};

let cached: { at: number; users: DirectoryUser[] } | null = null;
let inflight: Promise<DirectoryUser[]> | null = null;

export function listDirectoryUsers(): Promise<DirectoryUser[]> {
  if (cached && Date.now() - cached.at < DIRECTORY_STALE_MS) {
    return Promise.resolve(cached.users);
  }
  if (!inflight) {
    inflight = axios
      .get<DirectoryUser[]>(`${JIFFY_API_URL}/users`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
        },
      })
      .then((response) => {
        const users = Array.isArray(response.data) ? response.data : [];
        cached = { at: Date.now(), users };
        return users;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function searchDirectoryUsers(
  users: DirectoryUser[],
  search: string,
  excludeIds: string[],
) {
  const query = search.trim().toLowerCase();
  if (!query) {
    return [];
  }
  return users
    .filter((user) => !excludeIds.includes(user.id))
    .filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query),
    )
    .slice(0, MAX_SEARCH_RESULTS);
}
