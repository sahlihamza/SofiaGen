import requests from "./httpService";

const CountryServices = {
  getAllCountries: async () => {
    return requests.get("/countries");
  },

  getCountryById: async (id) => {
    return requests.get(`/countries/${id}`);
  },
};

export default CountryServices;
