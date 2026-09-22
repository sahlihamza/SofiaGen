import requests from "../httpService";

export const getMyContext = async () => {
  return requests.get("/me/context");
};
