import { JIFFY_API_URL as JIFFY_API_URL } from "@/consts/config";
import { initUser } from "@/models/user";
import { getUser, setUser } from "@/lib/store";
import axios from "axios";

export const checkCredentials = async () => {
  const currentUser = getUser();
  if (localStorage.getItem("sentinel_access_token") == null) {
    return 1;
  } else if (currentUser.id == "") {
    try {
      const response = await axios.get(`${JIFFY_API_URL}/users/@me`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
        },
      });
      if (response.status == 200) {
        setUser(response.data);
        return 0;
      }
    } catch (error) {
      logout();
      return 1;
    }
  }
  return 0;
};

export const logout = () => {
  localStorage.removeItem("sentinel_access_token");
  setUser(initUser);
};

export const saveAccessToken = (accessToken: string) => {
  localStorage.setItem("sentinel_access_token", accessToken);
};
