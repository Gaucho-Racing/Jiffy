import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initUser, type User } from "@/models/user";
import {
  listDirectoryUsers,
  searchDirectoryUsers,
  type DirectoryUser,
} from "@/lib/directory";

interface UserSearchProps {
  excludeIds?: string[];
  placeholder?: string;
  onSelect: (user: User) => void;
}

function asUser(person: DirectoryUser): User {
  const [firstName, ...rest] = person.name.split(" ");
  return {
    ...initUser,
    id: person.id,
    username: person.username,
    first_name: firstName ?? "",
    last_name: rest.join(" "),
    avatar_url: person.avatar_url,
    groups: [],
  };
}

export function UserSearch({
  excludeIds = [],
  placeholder = "Search by name or username",
  onSelect,
}: UserSearchProps) {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [usersError, setUsersError] = useState("");
  const results = searchDirectoryUsers(users, search, excludeIds);

  useEffect(() => {
    let cancelled = false;
    listDirectoryUsers()
      .then((people) => {
        if (!cancelled) {
          setUsers(people);
        }
      })
      .catch((err: { response?: { data?: { message?: string } } }) => {
        if (!cancelled) {
          setUsersError(
            err.response?.data?.message || "Failed to load people.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={placeholder}
          className="pl-8"
          autoComplete="off"
        />
        {results.length > 0 && (
          <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-neutral-700 bg-neutral-950 shadow-xl">
            {results.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => {
                  onSelect(asUser(user));
                  setSearch("");
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-neutral-800"
              >
                <Avatar className="h-6 w-6">
                  {user.avatar_url && (
                    <AvatarImage src={user.avatar_url} alt="" />
                  )}
                  <AvatarFallback>
                    {user.name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 truncate">{user.name}</span>
                <span className="truncate font-mono text-[11px] text-gray-400">
                  @{user.username}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      {usersError && <p className="text-xs text-red-400">{usersError}</p>}
    </div>
  );
}
