import { useEffect, useState } from "react";
import axios from "axios";
import { Search } from "lucide-react";
import { JIFFY_API_URL } from "@/consts/config";
import { User } from "@/models/user";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserSearchProps {
  excludeIds?: string[];
  placeholder?: string;
  onSelect: (user: User) => void;
}

export function UserSearch({
  excludeIds = [],
  placeholder = "Search by name or username",
  onSelect,
}: UserSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [error, setError] = useState("");
  const excluded = excludeIds.join("\n");

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setError("");
      return;
    }

    const handle = window.setTimeout(async () => {
      try {
        const response = await axios.get(`${JIFFY_API_URL}/users`, {
          params: { q },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
          },
        });
        const people: User[] = Array.isArray(response.data)
          ? response.data
          : [];
        const hidden = new Set(excluded.split("\n").filter(Boolean));
        setResults(people.filter((user) => user.id && !hidden.has(user.id)));
        setError("");
      } catch (err: any) {
        setResults([]);
        setError(
          err.response?.data?.message ||
            "People search is unavailable right now",
        );
      }
    }, 200);

    return () => window.clearTimeout(handle);
  }, [query, excluded]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        className="pl-8"
        autoComplete="off"
      />
      {(results.length > 0 || error) && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-neutral-700 bg-neutral-950 shadow-xl">
          {error && <p className="px-3 py-2 text-sm text-red-400">{error}</p>}
          {results.map((user) => (
            <button
              key={user.id}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-800"
              onClick={() => {
                onSelect(user);
                setQuery("");
                setResults([]);
              }}
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback>
                  {(user.first_name || user.username || "?").slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 truncate">
                {user.first_name} {user.last_name}
              </span>
              {user.username && (
                <span className="truncate font-mono text-xs text-gray-400">
                  @{user.username}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
