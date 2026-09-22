import httpService from "./httpService";

const userService = {
  // Fetch current user profile (expects auth token set)
  getMe: async () => {
    try {
      const res = await httpService.get("/user/me");
      return res || null;
    } catch (err) {
      console.error("Error fetching current user:", err);
      return null;
    }
  },
};

export default userService;
